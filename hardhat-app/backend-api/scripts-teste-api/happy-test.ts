import dotenv from "dotenv";
import "path";
import axios from "axios";

dotenv.config({ path: "../.env" });
const ENDERECO_INST_B = process.env.ADDRESS_INSTITUICAO_B;

const API_URL = "http://localhost:3001/api/prontuarios";

const idProntuario = `PRONT-${Date.now()}`;
const idPacienteHash = "0x" + Date.now().toString(16).padStart(64, "0");

async function testandoFluxo(){
    console.log("\n Iniciando o teste de ponta a ponta, entre blockchain e criptografia de envelope.\n");

    try{
        console.log("TESTE 1 --- Instituição A cadastra prontuário no Mongo e na Blockchain.");
        const cadastro = await axios.post(
            `${API_URL}/cadastrar`,
            {
                idProntuario,
                idPacienteHash,
                dadosClinicos: {
                    resourceType: "Patient",
                    nome: "Rick Riordan",
                    genero: "Masculine",
                    dataNascimento: "1980-01-01",
                    diagnostico: "Hipertensão Essencial (CID I10)",
                },
                idade: 44,
                sexo: "M",
                macroregiao: "Sul",
                cid: "I10",
            },
            { headers: { "x-actor": "instituicaoA" }}
        );

        console.log("Cadastrado com sucesso!");
        console.log(`Hash SHA-256 armazenado On-chain: ${cadastro.data.hashConteudo}`);
        console.log(`Hash da transação da blockchain:  ${cadastro.data.transactionHash}`);

        console.log("\n TESTE 2 --- Instituição B pesquisa um prontuário pelo hash do paciente.");
        const busca = await axios.get(
            `${API_URL}/busca-paciente/${idPacienteHash}`,
            { headers: { "x-actor": "instituicaoB" }}
        );
        console.log(`Quantidade de prontuários localizados: ${busca.data.totalProntuarios}`);
        const prontuarios = busca.data.prontuarios;
        if (prontuarios && prontuarios.length > 0) {
            console.log("Prontuários encontrados para o hash do paciente fornecido:");
            
            console.log("Detalhes por Prontuário:");
            prontuarios.forEach((item: any, idx: number) => {
                console.log(`\n   --- [Prontuário ${idx + 1}] ---`);
                console.log(`- ID do Prontuário:  ${item.idProntuario}`);
                console.log(`- Hash do Conteúdo:  ${item.hashConteudo}`);
                console.log(`- Instituição Dona:  ${item.instituicaoDona}`);
                console.log(`- Timestamp:         ${item.timestamp}`);
                console.log(`- Data Formatada:    ${item.dataCadastro}`);
            });
            console.log("\n");
        } else {
            console.log("Nenhum prontuário registrado para este hash de paciente.");
        }

        console.log("\n TESTE 3 --- Instituição B solicita acesso ao prontuário.");
        const solicitacao = await axios.post(
            `${API_URL}/solicitar-acesso`,
            {
                idProntuario,
                motivo: "Consulta de emergência em cardiologia",
            },
            { headers: { "x-actor": "instituicaoB" } }
        );
        console.log("Solicitação gravada na Blockchain!");
        console.log(`Hash da transação da blockchain: ${solicitacao.data.transactionHash}\n`);
    

        console.log("TESTE 4 --- Instituição A concede acesso ao prontuário.");
        const concessao = await axios.post(
            `${API_URL}/conceder-acesso`,
            {
                idProntuario,
                enderecoSolicitante: ENDERECO_INST_B,
                actorSolicitante: "instituicaoB",
            },
            { headers: { "x-actor": "instituicaoA" } }
        );

        const { envelope, hashConteudoOriginal } = concessao.data;
        console.log("Acesso autorizado e envelope montado.");
        console.log(`DEK re-cifrada com chave pública do Solicitante: ${envelope.dekCifradaComPublicKeyDestino.substring(0, 35)}`);
        console.log(`Hash da transação da blockchain: ${concessao.data.transactionHash}\n`);

        console.log("\n TESTE 5 --- Instituição B decifra o envelope com sua chave privada e valida o prontuário recebido.");
        const processarEnvelope = await axios.post(
            `${API_URL}/processar-envelope`,
            {
                envelope,
                hashConteudoOriginal,
            },
            { headers: { "x-actor": "instituicaoB" } }
        );

        console.log("Envelope decifrado com sucesso.");

        console.log(`Integridade válida? ${ processarEnvelope.data.hashValido ? true : false}`);
        console.log("Conteúdo do prontuário recuperado: ", JSON.stringify(processarEnvelope.data.dadosClinicosFHIR));

        console.log("\n TESTE 6 --- Secretaria consulta estatísticas epidemiológicas na Blockchain");
        const estatisticas = await axios.get(
            `${API_URL}/estatisticas/${idProntuario}`, {
            headers: { "x-actor": "secretaria" },
        });

        console.log("Dados estatísticos retornados, sem acesso aos dados clínicos.");
        console.log("Indicadores: ", estatisticas.data.dados);
        
        console.log("\n Fluxo completo, testado e validado!\n");
        
    } catch (error: any){
        process.exitCode = 1;
        console.error("\n Erro durante a execução do teste.");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error("Payload do erro:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testandoFluxo();