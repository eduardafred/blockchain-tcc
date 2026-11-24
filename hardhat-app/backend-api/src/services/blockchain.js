"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actorAddresses = void 0;
exports.getContractInstance = getContractInstance;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
const HealthAuditRegistry_js_1 = require("../abi/HealthAuditRegistry.js");
dotenv_1.default.config();
const contractAddress = process.env.CONTRACT_ADDRESS;
const providers = {
    instituicaoA: new ethers_1.ethers.JsonRpcProvider(process.env.RPC_INSTITUICAO_A, { name: "instituicaoA", chainId: 1337 }, { staticNetwork: true }),
    instituicaoB: new ethers_1.ethers.JsonRpcProvider(process.env.RPC_INSTITUICAO_B, { name: "instituicaoB", chainId: 1337 }, { staticNetwork: true }),
    secretaria: new ethers_1.ethers.JsonRpcProvider(process.env.RPC_SECRETARIA, { name: "secretaria", chainId: 1337 }, { staticNetwork: true })
};
exports.actorAddresses = {
    instituicaoA: process.env.ADDRESS_INSTITUICAO_A,
    instituicaoB: process.env.ADDRESS_INSTITUICAO_B,
    secretaria: process.env.ADDRESS_SECRETARIA
};
async function getContractInstance(actor) {
    const provider = providers[actor];
    const address = exports.actorAddresses[actor];
    if (!provider || !address) {
        throw new Error(`Ator inválido: ${actor}`);
    }
    const signer = await provider.getSigner(address);
    return new ethers_1.ethers.Contract(contractAddress, HealthAuditRegistry_js_1.contractAbi.abi, signer);
}
//# sourceMappingURL=blockchain.js.map