import { network } from "hardhat";
import { networkConfig } from "../../network.js";
import fs from "fs";
import path from "path";

async function main() {
  const connection = await network.create();
  const { ethers } = connection;

  const currentNetworkName = connection.networkName;
  console.log(`🌐 Rede selecionada no terminal: ${currentNetworkName}`);

  const artifactPath = path.resolve("artifacts/contracts/HealthAuditRegistry.sol/HealthAuditRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const signer = await ethers.provider.getSigner();
  const signerAddress = await signer.getAddress();

  console.log(`Assinando via EthSigner da rede '${currentNetworkName}'`);
  console.log(`Endereço da conta: ${signerAddress}`);
  console.log(`Endereço do contrato: ${networkConfig.contractAddress}`);

  const healthAudit = new ethers.Contract(
    networkConfig.contractAddress,
    artifact.abi,
    signer
  );

  console.log("Enviando transação...");
  const tx = await healthAudit.cadastrarProntuario(
    "HASH_PACIENTE_EXEMPLO_001",
    "HASH_EXEMPLO_PRONTUARIO_001",
    "INSTITUIÇÃO_EXEMPLO_001",
    "10",
    "M",
    "REGIÃO_EXEMPLO_001",
    "CID_EXEMPLO_001",
    { gasPrice: 0 }
  );

  console.log(`Transação enviada! Hash: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`Bloco minerado: #${receipt.blockNumber}`);

  const total = await healthAudit.getTotalProntuarios();
  console.log(`Total atualizado de prontuários: ${total.toString()}`);
}

main().catch((error) => {
  console.error("Erro ao executar escrita:", error);
  process.exitCode = 1;
});