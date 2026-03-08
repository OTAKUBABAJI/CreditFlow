import { WebSocketProvider } from "ethers";

async function main() {
    const provider = new WebSocketProvider("wss://rpc.cc3-testnet.creditcoin.network");
    try {
        const network = await provider.getNetwork();
        console.log("Connected to network:", network.name);
        console.log("Chain ID:", network.chainId);
    } catch (e) {
        console.error("Failed to connect:", e);
    }
}

main();
