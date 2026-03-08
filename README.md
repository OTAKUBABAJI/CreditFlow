# CreditFlow - Decentralized SME Invoice Financing

CreditFlow is a Web3 liquidity protocol built for the Creditcoin hackathon. It solves a massive real-world problem: small and medium enterprises (SMEs) often wait 30, 60, or even 90 days for their invoices to be paid by larger debtors, which kills their cash flow.

We built a system where SMEs can tokenize their pending invoices as NFTs, and DeFi liquidity providers can instantly fund them (advance the cash) for a yield.

## How it Works

The protocol is split into three main actors:
1. **The SME (Issuer):** Mints a new Invoice NFT pointing to a Debtor.
2. **The Debtor:** Logs in to confirm the invoice is valid and real, and later repays the invoice in full.
3. **The Investor (Liquidity Provider):** Deposits USDC into the `FinancingPool` smart contract vault to earn APR. Once an invoice is confirmed, the pool automatically releases an advance to the SME. 

When the Debtor finally repays the invoice 30-90 days later, the pool recoups the advance, takes a small protocol fee based on the SME's reputation score, and distributes the rest of the yield to the Liquidity Providers!

## Smart Contract Architecture

The core logic lives in 4 interconnected smart contracts, all deployed to the **Creditcoin Testnet**:

- **MockToken (USDC):** Used to simulate stablecoin movement for deposits, funding, and repayments.
- **InvoiceNFT:** An ERC721 contract representing the actual invoice logic. It handles the state machine: `Created -> Confirmed -> Funded -> Repaid`
- **FinancingPool:** The vault that holds investor funds. It handles calculating dynamic advance rates and routing the USDC to the SME when an invoice is funded in the frontend marketplace.
- **ReputationManager:** A credit-scoring system. Every time an SME successfully repays an invoice, their score goes up. A higher score means they get a higher upfront advance rate (up to 90%) and lower protocol fees!

## Tech Stack
- **Frontend:** Next.js, TailwindCSS, Framer Motion
- **Web3 Integration:** Wagmi, Viem (Ethers.js for scripts)
- **Smart Contracts:** Solidity, Hardhat
- **Deployed on:** Creditcoin Testnet

## Running it Locally

First, clone the repo and install dependencies in both the root and frontend folders:
```bash
npm install
cd frontend && npm install
```

Make sure you have your `.env.local` set up in the frontend folder pointing to the Creditcoin Testnet contracts:
```env
NEXT_PUBLIC_RPC_URL="https://rpc.cc3-testnet.creditcoin.network"
NEXT_PUBLIC_CHAIN_ID=102031
NEXT_PUBLIC_DEMO_MODE=false
```

Then run the development server:
```bash
cd frontend
npm run dev
```

The app will be running at `http://localhost:3000`. Make sure your MetaMask is connected to the Creditcoin Testnet!

---

## Pitch Deck Outline (For Hackathon Judges)

If you are a hackathon judge or want a high-level overview of the project's institutional value, here is our core pitch:

### 1. The Core Problem & Solution
- **Problem:** Small and Medium Enterprises (SMEs) suffer from severe cash flow issues because enterprise debtors take 30, 60, or 90 days to pay their invoices.
- **Solution:** CreditFlow is a decentralized invoice financing protocol. SMEs tokenize their pending invoices as NFTs, and DeFi liquidity pools instantly advance them the cash. When the debtor finally pays, the liquidity providers earn the yield.

### 2. How Things Work (The Architecture)
The protocol involves three main actors and a seamless on-chain state machine:
1. **SME (Issuer):** Mints a new Invoice NFT on the dashboard, pointing to a Debtor's wallet address.
2. **Debtor:** Logs in to verify the invoice is legitimate (preventing fraud) and eventually repays the invoice in full directly to the smart contract.
3. **Investor (Liquidity Provider):** Deposits USDC into the global `FinancingPool` smart contract. They don't have to pick individual invoices; they fund the pool, and when the marketplace triggers a funding event, the pool automatically releases an upfront advance (e.g., 80% to 90% of the invoice value) to the SME. 
*At repayment, the protocol takes a small fee, and the rest is distributed as yield to the Liquidity Providers.*

### 3. Tech Stack Used
- **Frontend:** Next.js, TailwindCSS (styled with an institutional, clean "Light Mode" aesthetic), Framer Motion, Wagmi, Viem.
- **Smart Contracts:** Solidity, Hardhat, OpenZeppelin.
- **Network:** Deployed live on the **Creditcoin Testnet** (cc3-testnet).

### 4. What is LIVE On-Chain vs. What is Mocked
**Live On-Chain:**
- **Invoice NFTs (`InvoiceNFT.sol`):** The entire lifecycle (Created → Confirmed → Funded → Repaid) is strictly enforced by smart contracts on the Creditcoin Testnet.
- **Global Liquidity Pool (`FinancingPool.sol`):** The vault handling USDC deposits, calculating SME advances, and distributing repayment yields.
- **Reputation System (`ReputationManager.sol`):** A fully functional on-chain credit scoring system. It tracks an SME's historical repayment ratio. High scores unlock up to 90% instant cash advances and lower protocol fees.
- **Protocol Treasury Mechanics:** The `FinancingPool` contract splits yields and can mathematically route protocol fees to a designated `Treasury` wallet address owned by the admin.
- **Stablecoin (`MockToken.sol`):** ERC20 test token used to simulate USDC movement.

**Mocked Data (For Hackathon Demo Purposes):**
- **Top-Level Dashboard Metrics:** The "Total Financed" and "Active Invoices" summary cards at the top of the UI are static visually, though the actual tables below them pull live contract data.
- **Fiat On/Off Ramps:** Users mint test-USDC via a faucet button instead of using a real Stripe/Circle fiat gateway.
- **KYC / Identity:** We assume the wallet addresses are trusted businesses; real-world decentralized identity (DID) integration is bypassed for the demo.

### 5. Future Roadmap (What comes next)
- **DAO Governance & Treasury Management:** Transitioning smart contract ownership to a Decentralized Autonomous Organization (DAO). Token holders will vote on protocol upgrades, tweak the `ReputationManager` algorithm, and manage the `Treasury` funds governed by the protocol fees!
- **IPFS Legal Integration:** Uploading the physical PDF invoices and legal contracts to IPFS/Filecoin and linking the CID directly to the Invoice NFT metadata.
- **Decentralized KYC (DID):** Implementing zero-knowledge identity (like Polygon ID) to verify businesses are legally registered entities before they can mint invoices.
- **Risk Tranches:** Upgrading the Liquidity Pool into "Senior" (lower risk/yield) and "Junior" (higher risk/yield) tranches so investors can tailor their risk appetite.
- **Creditcoin Oracle Integration:** Pulling real-world, off-chain banking data into the `ReputationManager` smart contract to create a more robust algorithmic credit score.