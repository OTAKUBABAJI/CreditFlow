'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { hardhat } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { defineChain } from 'viem';

const creditcoinTestnet = defineChain({
    id: 102031,
    name: 'Creditcoin Testnet',
    network: 'creditcoin-testnet',
    nativeCurrency: { name: 'Creditcoin', symbol: 'CTC', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.cc3-testnet.creditcoin.network'] },
        public: { http: ['https://rpc.cc3-testnet.creditcoin.network'] },
    },
    blockExplorers: {
        default: { name: 'Creditcoin Explorer', url: 'https://creditcoin.blockscout.com' },
    },
});

const config = getDefaultConfig({
    appName: 'CreditFlow',
    projectId: 'a576b50e-5612-429a-886f-ae9846b0785f', // Fallback ID for Hackathon dev
    chains: [hardhat, creditcoinTestnet],
    ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#8b5cf6', // primary violet
                        accentColorForeground: 'white',
                        borderRadius: 'large',
                        fontStack: 'system',
                        overlayBlur: 'small',
                    })}
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
