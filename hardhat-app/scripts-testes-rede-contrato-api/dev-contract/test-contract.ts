import { network } from "hardhat";
import { networkConfig } from '../../network.js';

import fs from "fs";
import path from "path";

async function main() {
  const { ethers } = await network.create();

  const artifactPath = path.resolve("artifacts/contracts/HealthAuditRegistry.sol/HealthAuditRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const healthAudit = new ethers.Contract(
    networkConfig.contractAddress,
    artifact.abi,
    ethers.provider
  );

  const endSigner = await ethers.provider.getSigner();
  const signerAddress = await endSigner.getAddress();
  
  console.log(`Endereço do contrato: ${networkConfig.contractAddress}`);
  console.log(`Endereço do signer: ${signerAddress}`);

  const total = await healthAudit.getTotalProntuarios();
  console.log(`✅ Total de prontuários cadastrados: ${total.toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});