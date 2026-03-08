import { ethers } from "ethers";
import fs from "fs";

async function fetchContracts() {
    const wallet = new ethers.Wallet("25daac65441c2f9d51c8a0fd5674c7583c316de759d16c95fb32021981e23f2f");
    const address = wallet.address;

    const res = await fetch(`https://creditcoin-testnet.blockscout.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc`);
    const data = await res.json();

    if (data.status === "1" && data.message === "OK") {
        const txs = data.result.filter(tx => tx.contractAddress !== "").slice(0, 4);
        fs.writeFileSync("contracts.json", JSON.stringify(txs, null, 2));
    }
}

fetchContracts();
