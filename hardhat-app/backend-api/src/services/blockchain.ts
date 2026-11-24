import { ethers } from "ethers";
import dotenv from "dotenv";
import { contractAbi } from "../abi/HealthAuditRegistry.js";

dotenv.config();

const contractAddress = process.env.CONTRACT_ADDRESS!;

const providers = {
  instituicaoA: new ethers.JsonRpcProvider(process.env.RPC_INSTITUICAO_A!, { name: "instituicaoA", chainId: 1337 }, { staticNetwork: true }),
  instituicaoB: new ethers.JsonRpcProvider(process.env.RPC_INSTITUICAO_B!, { name: "instituicaoB", chainId: 1337 }, { staticNetwork: true }),
  secretaria: new ethers.JsonRpcProvider(process.env.RPC_SECRETARIA!, { name: "secretaria", chainId: 1337 }, { staticNetwork: true })
};

export const actorAddresses = {
  instituicaoA: process.env.ADDRESS_INSTITUICAO_A!,
  instituicaoB: process.env.ADDRESS_INSTITUICAO_B!,
  secretaria: process.env.ADDRESS_SECRETARIA!
};

export type ActorRole = "instituicaoA" | "instituicaoB" | "secretaria";

export async function getContractInstance(actor: ActorRole) {
  const provider = providers[actor];
  const address = actorAddresses[actor];

  if (!provider || !address) {
    throw new Error(`Ator inválido: ${actor}`);
  }

  const signer = await provider.getSigner(address);

  return new ethers.Contract(contractAddress, contractAbi.abi, signer);
}
