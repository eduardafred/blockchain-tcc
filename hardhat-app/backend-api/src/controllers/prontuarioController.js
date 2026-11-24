"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscaPorPaciente = exports.solicitarAcesso = exports.obterEstatisticas = exports.cadastrarProntuario = void 0;
const blockchain_js_1 = require("../services/blockchain.js");
const cadastrarProntuario = async (req, res) => {
    try {
        const actor = req.headers["x-actor"];
        if (actor === "secretaria") {
            return res.status(403).json({
                sucesso: false,
                erro: "Acesso negado. A secretaria não tem permissão para cadastrar prontuários.",
            });
        }
        const { idProntuario, idPacienteHash, hashConteudo, idade, sexo, macroregiao, cid } = req.body;
        const contrato = (await (0, blockchain_js_1.getContractInstance)(actor));
        const tx = await contrato.cadastrarProntuario(idProntuario, idPacienteHash, hashConteudo, idade, sexo, macroregiao, cid, { gasPrice: 0 });
        const receipt = await tx.wait();
        return res.status(201).json({
            sucesso: true,
            mensagem: "Prontuário cadastrado com sucesso!",
            transactionHash: receipt.hash,
        });
    }
    catch (error) {
        return res.status(400).json({
            sucesso: false,
            erro: error.reason || error.message || "Erro ao processar transação na blockchain.",
        });
    }
};
exports.cadastrarProntuario = cadastrarProntuario;
const obterEstatisticas = async (req, res) => {
    try {
        const actor = req.headers["x-actor"];
        if (actor !== "secretaria") {
            return res.status(403).json({
                sucesso: false,
                erro: "Acesso negado. Apenas a secretaria tem permissão para obter dados estatísticos.",
            });
        }
        const idProntuario = req.params.idProntuario;
        const contrato = (await (0, blockchain_js_1.getContractInstance)(actor));
        const dados = await contrato.obterDadosEstatisticos(idProntuario);
        return res.status(200).json({
            sucesso: true,
            mensagem: "Os dados estatísticos foram obtidos com sucesso!",
            dados: {
                macroregiao: dados.macroregiao,
                idade: Number(dados.idade),
                sexo: dados.sexo,
                cid: dados.cid,
            }
        });
    }
    catch (error) {
        return res.status(400).json({
            sucesso: false,
            erro: error.reason || error.message || "Erro ao processar a solicitação de estatísticas na blockchain.",
        });
    }
};
exports.obterEstatisticas = obterEstatisticas;
const solicitarAcesso = async (req, res) => {
    try {
        const actor = req.headers["x-actor"] || req.query["x-actor"];
        if (actor !== "instituicaoA" && actor !== "instituicaoB") {
            return res.status(403).json({
                sucesso: false,
                erro: "Acesso negado. Apenas instituições A e B têm permissão para obter prontuários.",
            });
        }
        const { idProntuario, motivo } = req.body;
        if (!idProntuario || !motivo) {
            return res.status(400).json({
                sucesso: false,
                erro: "Parâmetros inválidos. 'idProntuario' e 'motivo' são obrigatórios.",
            });
        }
        const contrato = (await (0, blockchain_js_1.getContractInstance)(actor));
        const tx = await contrato.solicitarAcesso(idProntuario, motivo, { gasPrice: 0 });
        const receipt = await tx.wait();
        return res.status(200).json({
            sucesso: true,
            mensagem: "Solicitação de acesso ao prontuário enviada com sucesso!",
            transactionHash: receipt.hash,
        });
    }
    catch (error) {
        return res.status(400).json({
            sucesso: false,
            erro: error.reason || error.message || "Erro ao processar a solicitação de acesso na blockchain.",
        });
    }
};
exports.solicitarAcesso = solicitarAcesso;
const buscaPorPaciente = async (req, res) => {
    try {
        const actor = req.headers["x-actor"] || req.query["x-actor"];
        if (actor !== "instituicaoA" && actor !== "instituicaoB") {
            return res.status(403).json({
                sucesso: false,
                erro: "Acesso negado. Apenas instituições A e B têm permissão para realizar esta operação.",
            });
        }
        const actorAddress = blockchain_js_1.actorAddresses[actor];
        const idPacienteHash = req.params.idPacienteHash;
        if (!idPacienteHash) {
            return res.status(400).json({
                sucesso: false,
                erro: "Parâmetro inválido. 'idPacienteHash' é obrigatório.",
            });
        }
        const contrato = (await (0, blockchain_js_1.getContractInstance)(actor));
        const resultados = await contrato.buscarProntuariosPorPaciente(idPacienteHash, { from: actorAddress });
        const prontuariosFormatados = resultados.map((prontuario) => ({
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
    }
    catch (error) {
        return res.status(400).json({
            sucesso: false,
            erro: error.reason || error.message || "Erro ao processar a busca de prontuários na blockchain.",
        });
    }
};
exports.buscaPorPaciente = buscaPorPaciente;
//# sourceMappingURL=prontuarioController.js.map