import crypto from "crypto";

export function cifrarParaRegistroLocal(
  jsonFHIRLimpo: string,
  chavePublicaAtor: string
) {
  const dekLocal = crypto.randomBytes(32); // AES-256
  const ivLocal = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", dekLocal, ivLocal);
  let dadosCifradosLocal = cipher.update(jsonFHIRLimpo, "utf8", "hex");
  dadosCifradosLocal += cipher.final("hex");

  const dekCifradaLocal = crypto.publicEncrypt(
    {
      key: chavePublicaAtor,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    dekLocal
  ).toString("hex");

  const hashConteudo = "0x" + crypto.createHash("sha256").update(jsonFHIRLimpo).digest("hex");

  return {
    dadosCifradosLocal,
    dekCifradaLocal,
    ivLocal: ivLocal.toString("hex"),
    hashConteudo,
  };
}

export function gerarEnvelopeParaTransmissao(
  dadosCifradosLocal: string,
  dekCifradaLocal: string,
  ivLocalHex: string,
  chavePrivadaAtorOrigem: string,
  chavePublicaAtorDestino: string
) {

  const dekLocalBuffer = crypto.privateDecrypt(
    {
      key: chavePrivadaAtorOrigem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(dekCifradaLocal, "hex")
  );

  const decipher = crypto.createDecipheriv("aes-256-cbc", dekLocalBuffer, Buffer.from(ivLocalHex, "hex"));
  let jsonFHIRLimpo = decipher.update(dadosCifradosLocal, "hex", "utf8");
  jsonFHIRLimpo += decipher.final("utf8");

  const dekSessao = crypto.randomBytes(32);
  const ivSessao = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", dekSessao, ivSessao);
  let dadosCifradosDEK = cipher.update(jsonFHIRLimpo, "utf8", "hex");
  dadosCifradosDEK += cipher.final("hex");

  const dekCifradaComPublicKeyDestino = crypto.publicEncrypt(
    {
      key: chavePublicaAtorDestino,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    dekSessao
  ).toString("hex");

  return {
    dadosCifradosDEK,
    dekCifradaComPublicKeyDestino,
    ivSessao: ivSessao.toString("hex"),
    hashConteudo: "0x" + crypto.createHash("sha256").update(jsonFHIRLimpo).digest("hex"),
    jsonFHIRLimpo,
  };
}

export function decifrarEnvelopeNoDestinatario(
  dadosCifradosDEK: string,
  dekCifradaComPublicKeyDestino: string,
  ivSessaoHex: string,
  chavePrivadaAtorDestino: string
): string {
  const dekSessaoBuffer = crypto.privateDecrypt(
    {
      key: chavePrivadaAtorDestino,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(dekCifradaComPublicKeyDestino, "hex")
  );

  const decipher = crypto.createDecipheriv("aes-256-cbc", dekSessaoBuffer, Buffer.from(ivSessaoHex, "hex"));
  let jsonLimpo = decipher.update(dadosCifradosDEK, "hex", "utf8");
  jsonLimpo += decipher.final("utf8");

  return jsonLimpo;
}