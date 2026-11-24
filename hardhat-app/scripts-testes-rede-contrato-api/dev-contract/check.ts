import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider(
    "http://127.0.0.1:8545",
    undefined,
    { batchMaxCount: 1 } // desativa o batching, essencial pro EthSigner
  );

  const network = await provider.getNetwork();
  console.log("Conectado à rede:", network.name, "chainId:", network.chainId);

  const blockNumber = await provider.getBlockNumber();
  console.log("Bloco atual:", blockNumber);

  // como o EthSigner assina localmente, pegamos as contas via eth_accounts
  const accounts = await provider.send("eth_accounts", []);
  console.log("Contas disponíveis:", accounts);

  const balance = await provider.getBalance(accounts[0]);
  console.log("Saldo:", ethers.formatEther(balance), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});