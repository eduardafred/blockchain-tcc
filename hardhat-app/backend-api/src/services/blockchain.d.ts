import { ethers } from "ethers";
export declare const actorAddresses: {
    instituicaoA: string;
    instituicaoB: string;
    secretaria: string;
};
export type ActorRole = "instituicaoA" | "instituicaoB" | "secretaria";
export declare function getContractInstance(actor: ActorRole): Promise<ethers.Contract>;
//# sourceMappingURL=blockchain.d.ts.map