'use client';

import { motion } from "framer-motion";
import { Plus, Wallet, FileText, CheckCircle2, TrendingUp } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useWriteContract, useReadContract, useReadContracts, useAccount } from "wagmi";
import { parseAbi, parseEther, isAddress } from "viem";
import { Navbar } from "@/components/Navbar";

const TOKEN_ABI = parseAbi([
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)"
]);

const POOL_ABI = parseAbi([
    "function repayInvoice(uint256 id) external"
]);

const INVOICE_ABI = parseAbi([
    "struct Invoice { address issuer; address debtor; uint256 amount; uint256 dueDate; uint256 fundedAmount; address funder; bool debtorConfirmed; uint8 status; string metadataURI; }",
    "function createInvoice(address debtor, uint256 amount, uint256 dueDate, string calldata metadataURI) external returns (uint256)",
    "function confirmInvoice(uint256 id) external",
    "function totalInvoices() external view returns (uint256)",
    "function getInvoice(uint256 id) external view returns (Invoice)"
]);

export default function SMEDashboard() {
    const { address } = useAccount();
    const [amount, setAmount] = useState("");
    const [debtor, setDebtor] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [description, setDescription] = useState("");
    const { writeContractAsync } = useWriteContract();

    // Fetch total invoices
    const { data: totalInvoicesRaw } = useReadContract({
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

    const myInvoices = invoicesData?.map((res, index) => {
        if (res.status === 'success' && res.result) {
            const inv = res.result as any;
            return {
                id: index,
                issuer: inv.issuer,
                debtor: inv.debtor,
                amount: inv.amount,
                dueDate: Number(inv.dueDate),
                fundedAmount: inv.fundedAmount,
                debtorConfirmed: inv.debtorConfirmed,
                status: Number(inv.status),
                description: inv.metadataURI
            };
        }
        return null;
    }).filter(inv => inv !== null && (inv.issuer === address || inv.debtor === address)) || [];

    const handleMint = async () => {
        if (!amount || !debtor || !dueDate || !description) {
            toast.error("Please fill all fields");
            return;
        }

        if (!isAddress(debtor)) {
            toast.error("Invalid Debtor Address");
            return;
        }

        const toastId = toast.loading('Transaction Pending...');
        try {
            if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                toast.success('Invoice NFT Minted!', { id: toastId });
                setAmount("");
                setDebtor("");
                setDueDate("");
                return;
            }

            const timestamp = Math.floor(new Date(dueDate).getTime() / 1000);
            await writeContractAsync({
                address: process.env.NEXT_PUBLIC_INVOICE_ADDRESS as `0x${string}`,
                abi: INVOICE_ABI,
                functionName: 'createInvoice',
                args: [debtor as `0x${string}`, parseEther(amount), BigInt(timestamp), description]
            });

            toast.success('Transaction Confirmed!', { id: toastId });
            setAmount("");
            setDebtor("");
            setDueDate("");
            setDescription("");
        } catch (e: any) {
            toast.error('Transaction Failed: ' + (e.shortMessage || e.message), { id: toastId });
        }
    };

    const handleRepay = async (id: number, amountToRepay: bigint) => {
        const toastId = toast.loading('Transaction Pending...');
        try {
            if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                toast.success('Invoice Repaid successfully!', { id: toastId });
                return;
            }

            toast.loading('Approving USDC...', { id: toastId });
            await writeContractAsync({
                address: process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`,
                abi: TOKEN_ABI,
                functionName: 'approve',
                args: [process.env.NEXT_PUBLIC_POOL_ADDRESS as `0x${string}`, amountToRepay]
            });

            toast.loading('Repaying Invoice...', { id: toastId });
            await writeContractAsync({
                address: process.env.NEXT_PUBLIC_POOL_ADDRESS as `0x${string}`,
                abi: POOL_ABI,
                functionName: 'repayInvoice',
                args: [BigInt(id)]
            });

            toast.success('Transaction Confirmed!', { id: toastId });
        } catch (e: any) {
            toast.error('Transaction Failed: ' + (e.shortMessage || e.message), { id: toastId });
        }
    };

    const handleConfirm = async (id: number) => {
        const toastId = toast.loading('Transaction Pending...');
        try {
            if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                toast.success('Invoice Confirmed!', { id: toastId });
                return;
            }

            toast.loading('Confirming Invoice...', { id: toastId });
            await writeContractAsync({
                address: process.env.NEXT_PUBLIC_INVOICE_ADDRESS as `0x${string}`,
                abi: INVOICE_ABI,
                functionName: 'confirmInvoice',
                args: [BigInt(id)]
            });

            toast.success('Transaction Confirmed!', { id: toastId });
        } catch (e: any) {
            toast.error('Transaction Failed: ' + (e.shortMessage || e.message), { id: toastId });
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="container mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">SME Dashboard</h1>
                        <p className="text-secondary">Manage your invoices and get instant liquidity.</p>
                    </div>
                    <button
                        onClick={() => document.getElementById('tokenize-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="defi-button-primary"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        New Invoice
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <MetricCard title="Total Financed" value="$124,500" icon={<Wallet className="w-5 h-5 text-success" />} />
                    <MetricCard title="Active Invoices" value="4" icon={<FileText className="w-5 h-5 text-blue-400" />} />
                    <MetricCard title="Reputation Score" value="92 / 100" icon={<CheckCircle2 className="w-5 h-5 text-primary" />} />
                    <MetricCard title="Current Advance Rate" value="90%" icon={<TrendingUp className="w-5 h-5 text-amber-500" />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-bold mb-6 flex items-center">
                            <span className="w-2 h-6 bg-primary rounded-full mr-3"></span>
                            Recent Invoices
                        </h2>
                        <div className="defi-card !p-1 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-200 text-secondary text-sm">
                                        <th className="p-4 font-medium">Invoice ID</th>
                                        <th className="p-4 font-medium">Role</th>
                                        <th className="p-4 font-medium">Amount</th>
                                        <th className="p-4 font-medium">Status / Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myInvoices.length === 0 ? (
                                        <tr className="border-[0px]">
                                            <td colSpan={4} className="text-center py-8 text-secondary">No invoices found for your wallet.</td>
                                        </tr>
                                    ) : (
                                        myInvoices.map((inv) => {
                                            if (!inv) return null;

                                            const isIssuer = inv.issuer === address;

                                            const statusMap = ["CREATED", "CONFIRMED", "FUNDED", "REPAID", "DEFAULTED"];
                                            const currentStatus = statusMap[inv.status] as any;

                                            return (
                                                <tr key={inv.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 font-medium text-sm text-foreground">
                                                        {inv.description || `INV-${inv.id.toString().padStart(3, '0')}`}
                                                        <span className="block text-xs text-secondary mt-1 font-mono">ID: {inv.id.toString()}</span>
                                                    </td>
                                                    <td className="p-4 font-medium text-xs">
                                                        <span className={`px-2 py-1 rounded-md border ${isIssuer ? 'border-blue-500/20 text-blue-400 bg-blue-500/10' : 'border-purple-500/20 text-purple-400 bg-purple-500/10'}`}>
                                                            {isIssuer ? 'ISSUER' : 'DEBTOR'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-foreground">${(Number(inv.amount) / 1e18).toLocaleString()}</div>
                                                        {inv.status >= 2 && (
                                                            <div className="text-xs text-success mt-1">
                                                                Funded: ${(Number(inv.fundedAmount) / 1e18).toLocaleString()}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 flex flex-wrap items-center gap-4">
                                                        <StatusBadge status={currentStatus} />

                                                        {/* Actions */}
                                                        {inv.status === 0 && !isIssuer && !inv.debtorConfirmed && (
                                                            <button onClick={() => handleConfirm(inv.id)} className="text-xs font-bold text-blue-400 hover:text-gray-900 transition-colors">Confirm</button>
                                                        )}
                                                        {inv.status === 2 && !isIssuer && (
                                                            <button onClick={() => handleRepay(inv.id, inv.amount)} className="text-xs font-bold text-primary hover:text-gray-900 transition-colors">Repay</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div id="tokenize-section">
                        <h2 className="text-xl font-bold mb-6 flex items-center">
                            <span className="w-2 h-6 bg-blue-500 rounded-full mr-3"></span>
                            Tokenize Invoice
                        </h2>
                        <div className="defi-card relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] pointer-events-none" />

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-2">Debtor Wallet Address</label>
                                    <input
                                        type="text"
                                        value={debtor}
                                        onChange={(e) => setDebtor(e.target.value)}
                                        placeholder="0x..."
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-2">Invoice Amount (USDC)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="5000"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-2">Due Date</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900 calendar-picker-dark"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-2">Invoice Description</label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="e.g. Graphic Design Services Q3"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900"
                                    />
                                </div>
                                <button onClick={handleMint} className="defi-button-primary w-full mt-4 cursor-pointer">
                                    Mint Invoice NFT
                                </button>
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
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-secondary">{title}</h3>
                <div className="p-2 bg-gray-100 rounded-lg border border-gray-200">{icon}</div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: "CREATED" | "CONFIRMED" | "FUNDED" | "REPAID" | "DEFAULTED" }) {
    const styles = {
        CREATED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
        CONFIRMED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        FUNDED: "bg-[#16C784]/10 text-success border-[#16C784]/20 px-3",
        REPAID: "bg-primary/10 text-primary border-primary/20",
        DEFAULTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };

    return (
        <span className={`px-2.5 py-1 text-xs font-bold tracking-wide rounded-md border ${styles[status]}`}>
            {status}
        </span>
    );
}
