import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  console.log("Starting deployment...\n");

  let deployer;

  if (process.env.PRIVATE_KEY) {
    // For testnet or mainnet
    const provider = new ethers.JsonRpcProvider("https://rpc.cc3-testnet.creditcoin.network");
    deployer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
  } else {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    deployer = await provider.getSigner(0);
  }

  console.log("Deployer:", deployer.address);

  // ────────────────────────────────────────────────
  // Deploy MockToken
  // ────────────────────────────────────────────────
  const tokenArtifact = await hre.artifacts.readArtifact("MockToken");
  const Token = new ethers.ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, deployer);
  const token = await Token.deploy();
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("MockToken deployed:", tokenAddress);

  // ────────────────────────────────────────────────
  // Deploy InvoiceNFT
  // ────────────────────────────────────────────────
  const invoiceArtifact = await hre.artifacts.readArtifact("InvoiceNFT");
  const InvoiceNFT = new ethers.ContractFactory(invoiceArtifact.abi, invoiceArtifact.bytecode, deployer);
  const invoiceNFT = await InvoiceNFT.deploy();
  await invoiceNFT.waitForDeployment();

  const invoiceAddress = await invoiceNFT.getAddress();
  console.log("InvoiceNFT deployed:", invoiceAddress);

  // ────────────────────────────────────────────────
  // Deploy ReputationManager
  // ────────────────────────────────────────────────
  const repArtifact = await hre.artifacts.readArtifact("ReputationManager");
  const Reputation = new ethers.ContractFactory(repArtifact.abi, repArtifact.bytecode, deployer);
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();

  const reputationAddress = await reputation.getAddress();
  console.log("ReputationManager deployed:", reputationAddress);

  // ────────────────────────────────────────────────
  // Deploy FinancingPool
  // ────────────────────────────────────────────────
  const poolArtifact = await hre.artifacts.readArtifact("FinancingPool");
  const Pool = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode, deployer);
  const pool = await Pool.deploy(
    tokenAddress,
    invoiceAddress,
    reputationAddress
  );
  await pool.waitForDeployment();

  const poolAddress = await pool.getAddress();
  console.log("FinancingPool deployed:", poolAddress);

  // ────────────────────────────────────────────────
  // Wire contracts together
  // ────────────────────────────────────────────────
  console.log("\nConnecting contracts...");

  const invoiceNFTContract = new ethers.Contract(invoiceAddress, invoiceArtifact.abi, deployer);
  const reputationContract = new ethers.Contract(reputationAddress, repArtifact.abi, deployer);

  await (await invoiceNFTContract.setFinancingPool(poolAddress)).wait();
  await (await reputationContract.setFinancingPool(poolAddress)).wait();

  console.log("Contracts wired successfully\n");

  console.log("===== DEPLOYMENT COMPLETE =====");
  console.log("Token:", tokenAddress);
  console.log("InvoiceNFT:", invoiceAddress);
  console.log("ReputationManager:", reputationAddress);
  console.log("FinancingPool:", poolAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});