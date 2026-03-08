'use client';

import { Layers } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Navbar() {
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-white" />
                    </div>
                    <Link href="/" className="text-xl font-bold tracking-tight text-gray-900 hover:opacity-80 transition-opacity">
                        CreditFlow
                    </Link>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground mr-auto ml-10">
                    <Link href="/dashboard" className="hover:text-foreground transition-colors">SME Dashboard</Link>
                    <Link href="/invest" className="hover:text-foreground transition-colors">Invest</Link>
                    <Link href="/liquidity" className="hover:text-foreground transition-colors">Liquidity Pools</Link>
                    <Link href="/reputation" className="hover:text-foreground transition-colors">Reputation</Link>
                </div>

                <div>
                    <ConnectButton
                        showBalance={false}
                        accountStatus={{
                            smallScreen: 'avatar',
                            largeScreen: 'full',
                        }}
                        chainStatus={{
                            smallScreen: 'icon',
                            largeScreen: 'icon',
                        }}
                    />
                </div>
            </div>
        </nav>
    );
}
