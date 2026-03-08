'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { Coins, ArrowUpRight, Activity, ShieldCheck, Zap, AlertTriangle, Droplets } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useReadContract, useReadContracts, useWriteContract, useAccount } from 'wagmi';
import { parseAbi, parseEther, formatEther } from 'viem';
import toast from 'react-hot-toast';

const TOKEN_ABI = parseAbi([
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function mint(address to, uint256 amount) external"
]);

const INVOICE_ABI = parseAbi([
    "struct Invoice { address issuer; address debtor; uint256 amount; uint256 dueDate; uint256 fundedAmount; address funder; bool debtorConfirmed; uint8 status; string metadataURI; }",
    "function totalInvoices() external view returns (uint256)",
    "function getInvoice(uint256 id) external view returns (Invoice)"
]);

const POOL_ABI = parseAbi([
    "function deposit(uint256 amount) external",
    "function withdraw(uint256 shareAmount) external",
    "function fundInvoice(uint256 id) external",
    "function shares(address account) external view returns (uint256)"
]);

export default function LiquidityDashboard() {
    const { address } = useAccount();
    const [action, setAction] = useState<"deposit" | "withdraw">("deposit");
    const [amount, setAmount] = useState("");
    const { writeContractAsync } = useWriteContract();

    const { data: tokenBalanceRaw, refetch: refetchToken } = useReadContract({
        address: process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
        query: { enabled: !!address }
    });

    const { data: poolSharesRaw, refetch: refetchShares } = useReadContract({
        address: process.env.NEXT_PUBLIC_POOL_ADDRESS as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'shares',
        args: [address as `0x${string}`],
        query: { enabled: !!address }
    });

    const tokenBalance = tokenBalanceRaw ? Number(formatEther(tokenBalanceRaw as bigint)) : 0;
    const poolShares = poolSharesRaw ? Number(formatEther(poolSharesRaw as bigint)) : 0;

    const handleAction = async () => {
        if (!amount || Number(amount) <= 0) return;

        const toastId = toast.loading('Transaction Pending...');
        const amountWei = parseEther(amount);

        try {
            if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                toast.success(`${action === 'deposit' ? 'Deposit' : 'Withdrawal'} Confirmed!`, { id: toastId });
                setAmount("");
                return;
            }

            if (action === 'deposit') {
                toast.loading('Approving USDC...', { id: toastId });
                await writeContractAsync({
                    address: process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`,
                    abi: TOKEN_ABI,
                    functionName: 'approve',
                    args: [process.env.NEXT_PUBLIC_POOL_ADDRESS as `0x${string}`, amountWei]
                });

                toast.loading('Depositing Liquidity...', { id: toastId });
                await writeContractAsync({
                    address: process.env.NEXT_PUBLIC_POOL_ADDRESS as `0x${string}`,
                    abi: POOL_ABI,
                    functionName: 'deposit',
                    args: [amountWei]
                });
            } else {
                toast.loading('Withdrawing Liquidity...', { id: toastId });
                await writeContractAsync({
                    address: process.env.NEXT_PUBLIC_POOL_ADDRESS as `0x${string}`,
                    abi: POOL_ABI,
                    functionName: 'withdraw',
                    args: [amountWei] // Sending shares, parsed correctly using parseEther
                });
            }

            toast.success('Transaction Confirmed!', { id: toastId });
            setAmount("");

            // Refetch balances immediately
            refetchToken();
            refetchShares();
            refetchInvoices();
        } catch (e: any) {
            toast.error('Transaction Failed: ' + (e.shortMessage || e.message), { id: toastId });
        }
    };

    const handleMintTokens = async () => {
        if (!address) return toast.error("Connect wallet first");
        const toastId = toast.loading('Minting 10,000 Test USDC...');
        try {
            await writeContractAsync({
                address: process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`,
                abi: TOKEN_ABI,
                functionName: 'mint',
                args: [address, parseEther("10000")]
            });
            toast.success('Minted successfully!', { id: toastId });
            refetchToken();
        } catch (e: any) {
            toast.error('Minting Failed: ' + (e.shortMessage || e.message), { id: toastId });
        }
    };

    const { data: totalInvoicesRaw, refetch: refetchInvoices } = useReadContract({
        address: process.env.NEXT_PUBLIC_INVOICE_ADDRESS as `0x${string}`,
        abi: INVOICE_ABI,
        functionName: 'totalInvoices',
    });

    const totalInvoices = Number(totalInvoicesRaw || 0);

    const fetchCalls = Array.from({ length: totalInvoices }).map((_, i) => ({
        address: process.env.NEXT_PUBLIC_INVOICE_ADDRESS as `0x${string}`,
        abi: INVOICE_ABI,
        functionName: 'getInvoice',
        args: [BigInt(i)]
    }));

    const { data: invoicesData } = useReadContracts({
        contracts: fetchCalls as any,
    });

    const onChainInvoices = invoicesData
        ?.map((res, index) => {
            if (res.status === 'success' && res.result) {
                const inv = res.result as any;
                const amountNum = Number(inv[2]) / 1e18; // 18 decimals for MockToken
                const status = Number(inv[7]);
                const debtorConfirmed = inv[6];

                if (status === 1 && debtorConfirmed) {
                    return {
                        id: index,
                        sme: "On-Chain Issuer",
                        amount: "$" + amountNum.toLocaleString(),
                        duration: "30 Days", // dynamically calc block.timestamp off dueDate
                        yield_rate: "10%",
                        score: 75,
                    };
                }
            }
            return null;
        })
        .filter(inv => inv !== null) || [];

    const displayInvoices = onChainInvoices;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="container mx-auto px-6 py-12">
                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Liquidity Pools</h1>
                    <p className="text-secondary">Supply stablecoins to finance SME invoices and earn double-digit yield.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <MetricCard title="Total Value Locked" value="$5,240,000" icon={<Coins className="w-5 h-5 text-primary" />} />
                            <MetricCard title="Average APY" value="14.2%" icon={<Activity className="w-5 h-5 text-success" />} />
                            <MetricCard title="Your LP Shares" value={poolShares.toLocaleString(undefined, { maximumFractionDigits: 2 })} icon={<ArrowUpRight className="w-5 h-5 text-blue-400" />} />
                        </div>

                        <div>
                            <h2 className="text-xl font-bold mb-6 flex items-center">
                                <span className="w-2 h-6 bg-success rounded-full mr-3"></span>
                                Invoices Awaiting Funding
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {displayInvoices.map((inv: any, idx) => (
                                    <FundingCard key={idx} {...inv} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="defi-card top-0 sticky">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-success/10 rounded-full blur-[60px] pointer-events-none" />

                            <h3 className="text-xl font-bold mb-6 relative z-10">Manage Liquidity</h3>

                            <div className="flex bg-white p-1 rounded-xl mb-6 relative z-10 border border-gray-200">
                                <button
                                    onClick={() => setAction("deposit")}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${action === "deposit" ? "bg-gray-100 border border-gray-200 shadow-sm text-foreground" : "text-secondary hover:text-gray-900"}`}>
                                    Deposit
                                </button>
                                <button
                                    onClick={() => setAction("withdraw")}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${action === "withdraw" ? "bg-gray-100 border border-gray-200 shadow-sm text-foreground" : "text-secondary hover:text-gray-900"}`}>
                                    Withdraw
                                </button>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-secondary">{action === "deposit" ? "Amount (USDC)" : "Shares to Withdraw"}</span>
                                        <span className="text-primary font-medium">Balance: {action === "deposit" ? tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : poolShares.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-lg font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all pr-16 text-gray-900"
                                        />
                                        <button
                                            onClick={() => setAmount(action === "deposit" ? tokenBalance.toString() : poolShares.toString())}
                                            className="absolute right-3 top-3.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded text-gray-900 transition-colors cursor-pointer z-10"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200 space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary">Projected APY</span>
                                        <span className="text-success font-bold">14.2%</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary">Protocol Fee</span>
                                        <span>0.5%</span>
                                    </div>
                                </div>

                                <button onClick={handleAction} className="defi-button-primary w-full py-4 text-lg cursor-pointer z-10">
                                    {action === 'deposit' ? 'Approve & Deposit' : 'Withdraw Liquidity'}
                                </button>

                                <div className="pt-2 text-center">
                                    <button onClick={handleMintTokens} className="text-xs text-secondary hover:text-primary transition-colors flex items-center justify-center w-full group">
                                        <Droplets className="w-3 h-3 mr-1 opacity-50 group-hover:opacity-100" />
                                        Got no tokens? Mint 10k Test USDC
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function MetricCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="defi-card group cursor-default">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 rounded-lg border border-gray-200">{icon}</div>
                <h3 className="text-sm font-medium text-secondary">{title}</h3>
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
    );
}

function FundingCard({ id, sme, amount, duration, yield_rate, score }: any) {
    const { writeContractAsync } = useWriteContract();

    const handleFund = async () => {
        const toastId = toast.loading('Transaction Pending...');
        try {
            if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
                // Mock demo logic
                await new Promise(resolve => setTimeout(resolve, 2000));
                toast.success('Funded Invoice successfully!', { id: toastId });
                return;
            }

            await writeContractAsync({
                address: process.env.NEXT_PUBLIC_POOL_ADDRESS as `0x${string}`,
                abi: POOL_ABI,
                functionName: 'fundInvoice',
                args: [BigInt(id)]
            });

            toast.success('Transaction Confirmed!', { id: toastId });
        } catch (e: any) {
            toast.error('Transaction Failed: ' + (e.shortMessage || e.message), { id: toastId });
        }
    };

    return (
        <div className="defi-card group cursor-pointer relative overflow-hidden !p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-success border-none opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300" />
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-lg mb-1">{sme}</h4>
                    <span className="text-xs text-secondary bg-white border border-gray-200 px-2 py-1 rounded-md">
                        Reputation: <span className="text-gray-900 font-medium">{score}/100</span>
                    </span>
                </div>
                <span className="px-2.5 py-1 bg-[#16C784]/10 text-success text-xs font-bold rounded-lg border border-[#16C784]/20">{yield_rate} APR</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-secondary mb-1">Invoice Amount</p>
                    <p className="font-mono font-bold text-base">{amount}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-secondary mb-1">Duration</p>
                    <p className="font-medium text-base">{duration}</p>
                </div>
            </div>

            <button onClick={handleFund} className="w-full py-2.5 rounded-lg border border-success/30 text-success font-medium group-hover:bg-[#16C784]/10 transition-colors text-sm cursor-pointer z-10">
                Fund Invoice
            </button>
        </div>
    );
}
