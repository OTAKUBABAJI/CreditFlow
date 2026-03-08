'use client';

import { motion } from "framer-motion";
import { Award, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function ReputationDashboard() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="container mx-auto px-6 py-12">
                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">AI Reputation Score</h1>
                    <p className="text-secondary">Your on-chain behavior directly influences your credit risk and advance rates.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Main Score Card */}
                    <div className="defi-card relative overflow-hidden flex flex-col items-center justify-center text-center p-10">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

                        <h2 className="text-lg font-medium text-secondary mb-6 relative z-10">Current Rating</h2>

                        <div className="relative inline-flex items-center justify-center w-52 h-52 rounded-full border-[8px] border-primary shadow-[0_0_40px_rgba(124,92,255,0.3)] mb-8 z-10 bg-white">
                            <div className="absolute inset-2 rounded-full border border-gray-200 border-dashed animate-[spin_10s_linear_infinite]" />
                            <div className="flex flex-col">
                                <span className="text-6xl font-black text-foreground">92</span>
                                <span className="text-sm font-bold text-primary tracking-widest uppercase mt-1">Excellent</span>
                            </div>
                        </div>

                        <p className="text-secondary max-w-sm mb-8 relative z-10 leading-relaxed text-sm">
                            You are in the top 5% of borrowers. You qualify for the maximum <strong className="text-gray-900">90% advance rate</strong> on new invoices.
                        </p>

                        <div className="flex gap-4 w-full relative z-10">
                            <div className="flex-1 p-4 rounded-xl bg-white border border-gray-200">
                                <p className="text-xs text-secondary font-medium tracking-wide uppercase mb-1">Invoices Repaid</p>
                                <p className="text-3xl font-bold">14</p>
                            </div>
                            <div className="flex-1 p-4 rounded-xl bg-white border border-gray-200">
                                <p className="text-xs text-secondary font-medium tracking-wide uppercase mb-1">Total Defaults</p>
                                <p className="text-3xl font-bold text-success">0</p>
                            </div>
                        </div>
                    </div>

                    {/* Analysis Card */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold flex items-center">
                            <span className="w-2 h-6 bg-blue-500 rounded-full mr-3"></span>
                            AI Risk Analysis
                        </h3>

                        <AnalysisSection
                            title="Repayment History"
                            status="Positive"
                            percent={100}
                            desc="Consistent on-time repayments across all 14 concluded invoice contracts."
                            color="bg-success"
                        />

                        <AnalysisSection
                            title="Buyer Reliability"
                            status="Excellent"
                            percent={85}
                            desc="Your buyers (e.g. Acme Corp) have high independent trust scores."
                            color="bg-blue-500"
                        />

                        <AnalysisSection
                            title="Industry Risk (Logistics)"
                            status="Moderate"
                            percent={70}
                            desc="Macroeconomic factors suggest moderate supply chain volatility this quarter."
                            color="bg-amber-500"
                        />

                        <div className="defi-card !p-5 bg-gradient-to-r from-primary/10 to-transparent border-primary/20 flex gap-4 mt-8">
                            <Award className="w-8 h-8 text-primary shrink-0" />
                            <div>
                                <h4 className="font-bold text-foreground mb-1">Unlock Governance</h4>
                                <p className="text-sm text-secondary leading-relaxed">Maintain a score above 90 for 30 more days to claim your $CFLOW DAO voting allocation.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function AnalysisSection({ title, status, percent, desc, color }: any) {
    return (
        <div className="defi-card !p-5 hover:border-gray-200 transition-colors cursor-default">
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold">{title}</h4>
                <span className={`text-xs px-2.5 py-1 rounded-md font-bold tracking-wide uppercase text-gray-900 ${color.replace('bg-', 'bg-').replace('500', '500/20')} ${color.replace('bg-', 'text-')}`}>
                    {status}
                </span>
            </div>
            <div className="w-full h-2.5 bg-white rounded-full mb-4 overflow-hidden border border-gray-200">
                <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
            </div>
            <p className="text-sm text-secondary leading-relaxed">{desc}</p>
        </div>
    );
}
