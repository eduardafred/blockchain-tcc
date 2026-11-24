import { Request, Response } from "express";
import crypto from "crypto";
import { ProntuarioModel } from "../models/ProntuarioModel.js";
import { getContractInstance, ActorRole, actorAddresses } from "../services/blockchain.js";
import { keys } from "../config/keys.js";
import { cifrarParaRegistroLocal, gerarEnvelopeParaTransmissao, decifrarEnvelopeNoDestinatario } from "../utils/cryptoUtils.js";

export const cadastrarProntuario = async (req: Request, res: Response) => {
  try {
    const actor = (req.headers["x-actor"] || req.query["x-actor"]) as ActorRole;

    if (actor !== "instituicaoA" && actor !== "instituicaoB") {
      return res.status(403).json({
        sucesso: false,
        erro: "Acesso negado. Apenas instituições têm permissão para cadastrar prontuário  s.",
      });
    }
    
    const { idProntuario, idPacienteHash, dadosClinicos, idade, sexo, macroregiao, cid } = req.body;

    if (!idProntuario || !idPacienteHash || !dadosClinicos || !idade || !sexo || !macroregiao || !cid) {
      return res.status(400).json({
        sucesso: false,
        erro: "Parâmetros inválidos. Todos os campos são obrigatórios.",
      });
    }

    const cidNormalizado = String(cid).trim().toUpperCase();
    const conteudoString = JSON.stringify(dadosClinicos);

    const chavePublicaAtor = keys[actor as keyof typeof keys].publicKey;
    if(!chavePublicaAtor) {
      return res.status(500).json({
        sucesso: false,
        erro: `Chave pública para '${actor}' não encontrada.`,
      });
    }

    const { dadosCifradosLocal, dekCifradaLocal, ivLocal, hashConteudo } = cifrarParaRegistroLocal(conteudoString, chavePublicaAtor);

    const contrato = (await getContractInstance(actor)) as any; 
    const tx = await contrato.cadastrarProntuario(
      idProntuario,
      idPacienteHash,
      hashConteudo,
      idade,
      sexo,
      macroregiao,
      cidNormalizado,
      { gasPrice: 0 }
    );

    const receipt = await tx.wait();

    await ProntuarioModel.create({
      idProntuario,
      idPacienteHash,
      dadosCifradosLocal,
      dekCifradaLocal,
      ivLocal,
      hashConteudo,
      instituicaoDona: actorAddresses[actor],
    });


    return res.status(201).json({
      sucesso: true,
      mensagem: "Prontuário salvo no MongoDB e cadastrado na Blockchain com sucesso!",
      idProntuario,
      hashConteudo,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
    
  } catch (error: any) {
    return res.status(400).json({
      sucesso: false,
      erro: error.reason || error.message || "Erro ao processar transação na blockchain.",
    });
  }
};


export const obterEstatisticas = async (req: Request, res: Response) => {
  try {
    const actor = (req.headers["x-actor"] || req.query["x-actor"]) as ActorRole;

    if (actor !== "secretaria") {
      return res.status(403).json({
        sucesso: false,
        erro: "Acesso negado. Apenas a secretaria tem permissão para obter dados estatísticos.",
      });
    }

    const actorAddress = actorAddresses[actor];
    const contrato = (await getContractInstance(actor)) as any;

    const [registros, timestampConsulta] = await contrato.obterDadosEstatisticos({
      from: actorAddress,
    });

    const registrosFormatados = registros.map((item: any) => ({
      idPacienteHash: item.idPacienteHash,
      hashConteudo: item.hashConteudo,
      instituicaoDona: item.instituicaoDona,
      idade: Number(item.idade),
      sexo: item.sexo,
      macroregiao: item.macroregiao,
      cid: item.cid,
      timestamp: Number(item.timestamp),
      dataCadastro: new Date(Number(item.timestamp) * 1000).toISOString(),
    }));

    const tsConsulta = Number(timestampConsulta);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Dados estatísticos gerais obtidos com sucesso!",
      totalRegistros: registrosFormatados.length,
      timestampConsulta: tsConsulta,
      dataConsulta: new Date(tsConsulta * 1000).toISOString(),
      registros: registrosFormatados,
    });
  } catch (error: any) {
    return res.status(400).json({
      sucesso: false,
      erro: error.reason || error.message || "Erro ao processar a solicitação de estatísticas na blockchain.",
    });
  }
};

export const obterEstatisticasPorCid = async (req: Request, res: Response) => {
  try {
    const actor = (req.headers["x-actor"] || req.query["x-actor"]) as ActorRole;

    if (actor !== "secretaria") {
      return res.status(403).json({
        sucesso: false,
        erro: "Acesso negado. Apenas a secretaria tem permissão para consultar estatísticas por CID.",
      });
    }

    const cid = req.params.cid as string;

    if (!cid || cid.trim() === "") {
      return res.status(400).json({
        sucesso: false,
        erro: "Parâmetro inválido. 'cid' é obrigatório.",
      });
    }

    const cidNormalizado = cid.trim().toUpperCase();
    const actorAddress = actorAddresses[actor];
    const contrato = (await getContractInstance(actor)) as any;

    const [registros, timestampConsulta] = await contrato.obterEstatisticasPorCid(
      cidNormalizado,
      { from: actorAddress }
    );

    const registrosFormatados = registros.map((item: any) => ({
      idPacienteHash: item.idPacienteHash,
      hashConteudo: item.hashConteudo,
      instituicaoDona: item.instituicaoDona,
      idade: Number(item.idade),
      sexo: item.sexo,
      macroregiao: item.macroregiao,
      cid: item.cid,
      timestamp: Number(item.timestamp),
      dataCadastro: new Date(Number(item.timestamp) * 1000).toISOString(),
    }));

    const tsConsulta = Number(timestampConsulta);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Estatísticas por CID obtidas com sucesso!",
      cid: cidNormalizado,
      totalRegistros: registrosFormatados.length,
      timestampConsulta: tsConsulta,
      dataConsulta: new Date(tsConsulta * 1000).toISOString(),
      registros: registrosFormatados,
    });
  } catch (error: any) {
    return res.status(400).json({
      sucesso: false,
      erro: error.reason || error.message || "Erro ao consultar estatísticas por CID na blockchain.",
    });
  }
};

export const solicitarAcesso = async (req: Request, res: Response) => {
  try {
    const actor = (req.headers["x-actor"] || req.query["x-actor"]) as ActorRole;
    
    if (actor !== "instituicaoA" && actor !== "instituicaoB") {
      return res.status(403).json({
        sucesso: false,
        erro: "Acesso negado. Apenas instituições têm permissão para solicitar acesso a prontuários.",
      });
    }

    const { idProntuario, motivo } = req.body;

    if (!idProntuario || !motivo) {
      return res.status(400).json({
        sucesso: false,
        erro: "Parâmetros inválidos. 'idProntuario' e 'motivo' são obrigatórios.",
      });
    }

    const prontuario = await ProntuarioModel.findOne({ idProntuario });

    if (!prontuario) {
      return res.status(404).json({
        sucesso: false,
        erro: "Prontuário não encontrado no sistema.",
      });
    }

    const actorAddress = actorAddresses[actor];
    const ehDonoDoProntuario = prontuario.instituicaoDona.toLowerCase() === actorAddress.toLowerCase();

    if (ehDonoDoProntuario) {
      return res.status(400).json({
        sucesso: false,
        erro: "A instituição já possui acesso ao prontuário, vez que é sua proprietária.",
      });
    }
    
    const contrato = (await getContractInstance(actor)) as any;
    const tx = await contrato.solicitarAcesso(idProntuario, motivo, { gasPrice: 0 });
    const receipt = await tx.wait();

    return res.status(200).json({
      sucesso: true,
      mensagem: "Solicitação de acesso ao prontuário enviada com sucesso!",
      transactionHash: receipt.hash,
    });
  } catch (error: any) {
    return res.status(400).json({
      sucesso: false,
      erro: error.reason || error.message || "Erro ao processar a solicitação de acesso na blockchain.",
    });
  }
};

export const buscaPorPaciente = async (req: Request, res: Response) => {
  try {
    const actor = (req.headers["x-actor"] || req.query["x-actor"]) as ActorRole;
    
    if (actor !== "instituicaoA" && actor !== "instituicaoB") {
      return res.status(403).json({
        sucesso: false,
        erro: "Acesso negado. Apenas instituições A e B têm permissão para realizar esta operação.",
      });
    }

    const actorAddress = actorAddresses[actor];

    const idPacienteHash = req.params.idPacienteHash as string;

    if (!idPacienteHash) {
      return res.status(400).json({
        sucesso: false,
        erro: "Parâmetro inválido. 'idPacienteHash' é obrigatório.",
      });
    }

    const regexHashValido = /^0x[a-fA-F0-9]{64}$/;
    if(!regexHashValido.test(idPacienteHash)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Hash do paciente inválido. Certifique-se de que o hash está no formato correto.",
      });
    }

    const contrato = (await getContractInstance(actor)) as any;
    const resultados = await contrato.buscarProntuariosPorPaciente(idPacienteHash, { from: actorAddress });

    const prontuariosFormatados = resultados.map((prontuario: any) => ({
      idProntuario: prontuario.idProntuario,
      hashConteudo: prontuario.hashConteudo,
      instituicaoDona: prontuario.instituicaoDona,
      timestamp: Number(prontuario.timestamp),
      dataCadastro: new Date(Number(prontuario.timestamp) * 1000).toISOString(),
    }));

    return res.status(200).json({
      sucesso: true,
      mensagem: "Prontuários obtidos com sucesso!",
      idPacienteHash,
      totalProntuarios: prontuariosFormatados.length,
      prontuarios: prontuariosFormatados,
    });
  } catch (error: any) {
    return res.status(400).json({
      sucesso: false,
      erro: error.reason || error.message || "Erro ao processar a busca de prontuários na blockchain.",
    });
  }
};

export const concederAcesso = async (req: Request, res: Response) => {
  try {
    const actorInstDona = (req.headers["x-actor"] || req.query["x-actor"]) as ActorRole;

    if (actorInstDona !== "instituicaoA" && actorInstDona !== "instituicaoB") {
      return res.status(403).json({
        sucesso: false,
        erro: "Acesso negado. Apenas instituições têm permissão para realizar esta operação.",
      });
    }

    const actorSolicitante = req.body.actorSolicitante as ActorRole;
    const { idProntuario } = req.body;

    if (!idProntuario || !actorSolicitante) {
      return res.status(400).json({
        sucesso: false,
        erro: "Parâmetros inválidos. 'idProntuario' e 'actorSolicitante' são obrigatórios.",
      });
    }

    if (actorSolicitante !== "instituicaoA" && actorSolicitante !== "instituicaoB") {
      return res.status(400).json({
        sucesso: false,
        erro: "Erro na validação do solicitante.",
      });
    }

    const prontuario = await ProntuarioModel.findOne({ idProntuario });
    if (!prontuario) {
      return res.status(404).json({
        sucesso: false,
        erro: "Prontuário não encontrado no banco de dados.",
      });
    }

    const actorAddressDona = actorAddresses[actorInstDona];
    const actorAddressSolicitante = actorAddresses[actorSolicitante];
    const ehDonoDoProntuario = prontuario.instituicaoDona.toLowerCase() === actorAddressDona.toLowerCase();
    
    if (!ehDonoDoProntuario) {
      return res.status(400).json({
        sucesso: false,
        erro: "Apenas a instituição dona do prontuário pode conceder acesso.",
      });
    }

    const contrato = (await getContractInstance(actorInstDona)) as any;
    const tx = await contrato.autorizarAcesso(idProntuario, actorAddressSolicitante, { gasPrice: 0 });
    const receipt = await tx.wait();

    const chavePrivadaInstDona = keys[actorInstDona as keyof typeof keys].privateKey;
    const chavePublicaSolicitante = keys[actorSolicitante as keyof typeof keys].publicKey;

    const envelope = gerarEnvelopeParaTransmissao(
      prontuario.dadosCifradosLocal,
      prontuario.dekCifradaLocal,
      prontuario.ivLocal,
      chavePrivadaInstDona,
      chavePublicaSolicitante
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: "Acesso concedido com sucesso e envelope gerado!",
      transactionHash: receipt.hash,
      idProntuario,
      hashConteudoOriginal: prontuario.hashConteudo,
      envelope: {
        dadosCifradosDEK: envelope.dadosCifradosDEK,
        dekCifradaComPublicKeyDestino: envelope.dekCifradaComPublicKeyDestino,
        ivSessao: envelope.ivSessao,
      }
    });
  } catch (error: any) {
    return res.status(400).json({
      sucesso: false,
      erro: "Erro ao conceder acesso.",
    });
  }
};

export const decifrarEnvelope = async (req: Request, res: Response) => {
  try {
    const actor = (req.headers["x-actor"] || req.query["x-actor"]) as ActorRole;

    if (actor !== "instituicaoA" && actor !== "instituicaoB") {
      return res.status(403).json({
        sucesso: false,
        erro: "Acesso negado. Apenas instituições A e B têm permissão para decifrar envelopes.",
      });
    }

    const { envelope, hashConteudoOriginal } = req.body;

    if (!envelope || !hashConteudoOriginal) {
      return res.status(400).json({
        sucesso: false,
        erro: "Parâmetros inválidos. 'envelope' e 'hashConteudoOriginal' são obrigatórios.",
      });
    }
    
    const chavePrivadaAtor = keys[actor as keyof typeof keys].privateKey;
    
    const jsonFHIRLimpo = decifrarEnvelopeNoDestinatario(
      envelope.dadosCifradosDEK,
      envelope.dekCifradaComPublicKeyDestino,
      envelope.ivSessao,
      chavePrivadaAtor
    );

    const hashConteudoDecifrado = "0x" + crypto.createHash("sha256").update(jsonFHIRLimpo).digest("hex");
    const hashValido = hashConteudoDecifrado.toLowerCase() === hashConteudoOriginal.toLowerCase();

    return res.status(200).json({
      sucesso: true,
      mensagem: hashValido ? "Envelope decifrado com sucesso e hash validado. Arquivo íntegro." : "Envelope decifrado, mas o hash não corresponde ao original. Arquivo corrompido.",
      hashValido,
      hashConteudoDecifrado,
      hashConteudoOriginal,
      dadosClinicosFHIR: JSON.parse(jsonFHIRLimpo),
    });
  } catch (error: any) {
    return res.status(400).json({
      sucesso: false,
      erro: "Falha ao decifrar o envelope.",
    });
  }
} 