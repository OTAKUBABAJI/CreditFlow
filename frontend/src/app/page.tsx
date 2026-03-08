'use client';

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-background selection:bg-primary/30 relative overflow-hidden">
      <Navbar />

      {/* Background glowing orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[50%] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center rounded-full border border-gray-200 bg-white/80 px-4 py-1.5 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-success mr-2 animate-pulse"></span>
            <span className="text-secondary-foreground opacity-90">Live on Creditcoin Testnet</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-foreground leading-[1.1]">
            Unlock Instant Liquidity with <br />
            <span className="gradient-text">Tokenized Invoices</span>
          </h1>

          <p className="text-lg md:text-xl text-secondary mb-12 max-w-2xl mx-auto leading-relaxed">
            Say goodbye to 90-day payment terms. CreditFlow tokenizes your invoices into NFTs to give SMEs instant cash flow from decentralized liquidity pools.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="defi-button-primary w-full sm:w-auto px-8 py-4 text-lg"
            >
              Launch App <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/liquidity"
              className="defi-button-secondary w-full sm:w-auto px-8 py-4 text-lg font-medium"
            >
              Provide Liquidity
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
        >
          <FeatureCard
            icon={<Zap className="w-7 h-7 text-amber-400" />}
            title="Instant Financing"
            description="Up to 90% advance rate on your outstanding invoices directly via smart contracts."
          />
          <FeatureCard
            icon={<ShieldCheck className="w-7 h-7 text-success" />}
            title="AI Risk Assurance"
            description="Dynamic credit scoring continuously evaluates buyer reliability and SME history."
          />
          <FeatureCard
            icon={<BarChart3 className="w-7 h-7 text-primary" />}
            title="High Yield LPs"
            description="Investors earn sustainable yield backed by real-world assets (RWA) and short-term debt."
          />
        </motion.div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="defi-card group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="mb-5 bg-gray-100 w-14 h-14 rounded-xl flex items-center justify-center border border-gray-200 group-hover:scale-110 transition-transform duration-300 shadow-inner">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
      <p className="text-secondary leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}
