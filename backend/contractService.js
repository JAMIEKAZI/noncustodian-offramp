import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Read JSON file
const fileData = JSON.parse(fs.readFileSync("./abi.json", "utf-8"));

// Extract the ABI array whether it's wrapped in a Hardhat artifact or standalone
const abi = Array.isArray(fileData) ? fileData : fileData.abi;

// 1. Connect to Base Sepolia via RPC
const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);

// 2. Attach wallet for signing administrative transactions
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// 3. Instantiate the deployed contract
export const escrowContract = new ethers.Contract(
  process.env.ESCROW_CONTRACT_ADDRESS,
  abi,
  wallet
);

export const getContractDetails = async () => {
  const owner = await escrowContract.owner();
  return {
    contractAddress: process.env.ESCROW_CONTRACT_ADDRESS,
    owner: owner,
  };
};