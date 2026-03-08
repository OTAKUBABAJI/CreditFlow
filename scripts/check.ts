import hre from 'hardhat';
import { ethers } from 'ethers';

async function main() {
    console.log("Starting...");
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const deployer = await provider.getSigner(0);
    console.log("Deployer:", deployer.address);

    const artifact = await hre.artifacts.readArtifact("MockToken");
    console.log("Artifact loaded:", !!artifact.abi);
}

main().catch(console.error);
