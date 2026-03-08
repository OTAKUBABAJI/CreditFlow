'use client';

import { motion } from "framer-motion";
import { Coins, Filter, Search, ArrowRight, ShieldCheck, Zap, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useReadContract, useReadContracts, useWriteContract, useAccount } from 'wagmi';
import { parseAbi } from 'viem';
import toast from 'react-hot-toast';
import { useState } from "react";

const INVOICE_ABI = parseAbi([
    "struct Invoice { address issuer; address debtor; uint256 amount; uint256 dueDate; uint256 fundedAmount; address funder; bool debtorConfirmed; uint8 status; string metadataURI; }",
    "function totalInvoices() external view returns (uint256)",
    "function getInvoice(uint256 id) external view returns (Invoice)"
]);

const POOL_ABI = parseAbi([
    "function fundInvoice(uint256 id) external"
]);

const TOKEN_ABI = parseAbi([
    "function approve(address spender, uint256 amount) external returns (bool)"
]);

export default function InvestPage() {
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

    const onChainInvoices = invoicesData
        ?.map((res, index) => {
            if (res.status === 'success' && res.result) {
                const inv = res.result as any;
                // Struct: issuer(0), debtor(1), amount(2), dueDate(3), fundedAmt(4), funder(5), debtorConfirmed(6), status(7)
                const amountNum = Number(inv.amount || inv[2]) / 1e18;
                const status = Number(inv.status || inv[7]);
                const debtorConfirmed = inv.debtorConfirmed !== undefined ? inv.debtorConfirmed : inv[6];

                // Filter: Confirmed (1) AND debtorConfirmed
                if (status === 1 && debtorConfirmed) {
                    const score = 85;
                    let risk = "Medium Risk";
                    let riskColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                    let icon = <Zap className="w-4 h-4 mr-1" />;

                    if (score > 80) {
                        risk = "Low Risk";
                        riskColor = "text-success bg-[#16C784]/10 border-[#16C784]/20";
                        icon = <ShieldCheck className="w-4 h-4 mr-1" />;
                    } else if (score < 50) {
                        risk = "High Risk";
                        riskColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
                        icon = <AlertTriangle className="w-4 h-4 mr-1" />;
                    }

                    return {
                        id: index,
                        sme: inv.metadataURI || inv[8] || "On-Chain Invoice",
                        amount: "$" + amountNum.toLocaleString(),
                        rawAmount: inv.amount || inv[2],
                        duration: "N/A",
                        apr: "12.0%",
                        score,
                        risk,
                        riskColor,
                        icon,
                    };
                }
            }
            return null;
        })
        .filter(inv => inv !== null) || [];

    const [searchTerm, setSearchTerm] = useState("");
    const [sortRisk, setSortRisk] = useState(false);

    const filteredInvoices = onChainInvoices.filter((inv: any) =>
        inv.sme.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const displayInvoices = sortRisk
        ? [...filteredInvoices].sort((a: any, b: any) => b.score - a.score)
        : filteredInvoices;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="container mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Invoice Marketplace</h1>
                        <p className="text-secondary">Discover high-yield, short-term RWA debt opportunities.</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search SMEs..."
                                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900"
                            />
                        </div>
                        <button
                            onClick={() => setSortRisk(!sortRisk)}
                            className={`p-3 rounded-xl border transition-colors ${sortRisk ? 'bg-primary/20 border-primary' : 'bg-gray-100 border-gray-200 hover:border-gray-200'}`}
                        >
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayInvoices.map((inv: any, idx) => (
                        <InvestmentCard key={idx} {...inv} />
                    ))}
                    {displayInvoices.length === 0 && (
                        <div className="col-span-full text-center py-12 text-secondary">
                            <p>No confirmed invoices available to fund right now.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function InvestmentCard({ id, sme, amount, rawAmount, duration, apr, score, risk, riskColor, icon }: any) {
    const { writeContractAsync } = useWriteContract();

    const handleFund = async () => {
        const toastId = toast.loading('Transaction Pending...');
        try {
            if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                toast.success('Transaction Confirmed!', { id: toastId });
                return;
            }

            // Fund Invoice using Pool Liquidity
            toast.loading('Funding invoice...', { id: toastId });
            await writeContractAsync({
                address: process.env.NEXT_PUBLIC_POOL_ADDRESS as `0x${string}`,
                abi: POOL_ABI,
                functionName: 'fundInvoice',
                args: [BigInt(id)]
            });

            toast.success('Successfully Funded Invoice!', { id: toastId });
        } catch (e: any) {
            toast.error('Transaction Failed: ' + (e.shortMessage || e.message), { id: toastId });
        }
    };

    return (
        <div className="defi-card !p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-primary/10 transition-colors duration-500" />

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-bold text-xl mb-2">{sme}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-secondary bg-white border border-gray-200 px-2 py-1.5 rounded-md">
                            Score: <span className="text-gray-900">{score}/100</span>
                        </span>
                        <span className={`flex items-center text-xs font-bold px-2.5 py-1.5 rounded-md border ${riskColor}`}>
                            {icon} {risk}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 flex-grow">
                <div className="p-3.5 rounded-xl bg-white border border-gray-200">
                    <p className="text-xs text-secondary mb-1">Invoice Amount</p>
                    <p className="font-mono font-bold text-lg">{amount}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-gray-200">
                    <p className="text-xs text-secondary mb-1">Yield (APR)</p>
                    <p className="font-bold text-lg text-success">{apr}</p>
                </div>
                <div className="col-span-2 p-3.5 rounded-xl bg-white border border-gray-200 flex justify-between items-center">
                    <p className="text-xs text-secondary">Duration</p>
                    <p className="font-medium text-sm">{duration}</p>
                </div>
            </div>

            <button onClick={handleFund} className="defi-button-primary w-full py-3.5 text-base cursor-pointer z-10">
                Fund Invoice <ArrowRight className="w-4 h-4 ml-2" />
            </button>
        </div>
    );
}
