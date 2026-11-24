import dotenv from "dotenv";
dotenv.config();

const formatKey = (key?: string): string => {
  if (!key) return "";
  return key.replace(/\\n/g, "\n");
};

export const keys = {
  instituicaoA: {
    publicKey: formatKey(process.env.PUBLIC_KEY_INSTITUICAO_A),
    privateKey: formatKey(process.env.PRIVATE_KEY_INSTITUICAO_A),
  },
  instituicaoB: {
    publicKey: formatKey(process.env.PUBLIC_KEY_INSTITUICAO_B),
    privateKey: formatKey(process.env.PRIVATE_KEY_INSTITUICAO_B),
  },
};