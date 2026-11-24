import { network } from "hardhat";

async function main() {
  const { ethers, networkName } = await network.create();

  console.log(`🚀 A iniciar o deploy na rede: ${networkName}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deployer (Conta remota executando o deploy): ${deployer.address}`);

  // Endereços reais extraídos do EthSigner
  const adminInicial = deployer.address;
  const instituicaoA = "0x9cd2d8545a01241805f958d0c36f324345b2a9a3"; 
  const instituicaoB = "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73";
  const secretaria = "0xe5fe329400a04eeb7ee5af7aa13a079610b7446c"; 

  console.log(`🔑 Admin Inicial: ${adminInicial}`);
  console.log(`🏦 Ator A (Instituição A): ${instituicaoA}`);
  console.log(`🔍 Ator B (Instituição B): ${instituicaoB}`);
  console.log(`🏛️ Ator Secretaria (Secretaria): ${secretaria}`);

  // Deploy do contrato
  const healthAudit = await ethers.deployContract("HealthAuditRegistry", [
    adminInicial,
    instituicaoA,
    instituicaoB,
    secretaria
  ]);

  console.log("⏳ A aguardar confirmação do bloco no Besu...");
  await healthAudit.waitForDeployment();

  const contractAddress = await healthAudit.getAddress();

  console.log("\n✅ Contrato implantado com sucesso!");
  console.log(`📌 Endereço do Contrato: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});