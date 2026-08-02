import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("StableEscrowModule", (m) => {
  // We pass the deployer wallet address as a placeholder for the Roqqu Treasury
  const deployer = m.getAccount(0);

  const stableEscrow = m.contract("StableEscrow", [deployer]);

  return { stableEscrow };
});