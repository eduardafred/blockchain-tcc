import dotenv from "dotenv";
import path from "path"; 
import axios from "axios"; 

dotenv.config({ path: "../.env"}); 
const ENDERECO_INST_B = process.env.ADDRESS_INSTITUICAO_B;
const ENDERECO_INST_A = process.env.ADDRESS_INSTITUICAO_A; 

const API_URL = "http://localhost:3001/api/prontuarios";  

const idProntuario = `PRONT-${Date.now()}`;
const idPacienteHash = "0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0";

async function testandoFluxo(){
    console.log("\n Iniciando os testes que devem retornar erro.\n");

    try{
        console.log("Cadastrando prontuário válido como Instituição A para os testes de permissão de acesso e integridade do envelope.\n");
        await axios.post(
            `${API_URL}/cadastrar`,
            {
                idProntuario,
                idPacienteHash,
                dadosClinicos: {
                    resourceType: "Patient",
                    nome: "George Raymond Richard Martin",
                    genero: "Masculine",
                    dataNascimento: "1948-09-20",
                    diagnostico: "Episódio depressivo não especificado (CID F32.9)",
                },
                idade: 78,
                sexo: "M",
                macroregiao: "Nordeste",
                cid: "F32.9",
            },
            { headers: { "x-actor": "instituicaoA" }}
        );
        console.log("Prontuário cadastrado com sucesso!");
    } catch (error: any){
        console.error("Erro durante o cadastro do prontuário.");
        console.error(error.response?.data || error.message);
        process.exitCode = 1;
        return;
    }

    try{
        console.log("TESTE 1 --- Tentativa de cadastrar prontuário sem os campos obrigatórios.\n");
        await axios.post(
            `${API_URL}/cadastrar`,
            { idProntuario: "PRONT-INVALIDO-001"},
            { headers: { "x-actor": "instituicaoA" }}
        );
        console.log("\nFALHA --- Cadastrado com sucesso! (Isso não deveria acontecer, pois os campos obrigatórios não foram fornecidos.)\n");        
        process.exitCode = 1;
        
    } catch (error: any){
        if (error.response?.status === 400) {
            console.log("SUCESSO --- Erro HTTP 400, campos obrigatórios não fornecidos, cadastro não realizado.\n");
        } else {
            console.error("FALHA --- Erro inesperado durante o teste.\n");
            process.exitCode = 1;
        }
    }
    try{
        console.log("\nTESTE 2 --- Tentativa de buscar prontuário com hash de paciente inválido.\n");
        await axios.get(`${API_URL}/busca-paciente/0xHASH_INVALIDO-001`, {
        headers: { "x-actor": "instituicaoB" },
        });
        console.log("FALHA --- o hash inválido foi aceito! (Isso não deveria acontecer, pois o hash do paciente fornecido é inválido.)");
        process.exitCode = 1;
    } catch (error: any) {
        if (error.response?.status === 400) {
        console.log("SUCESSO --- Erro HTTP 400, informação inválida fornecida.\n");
        } else {
        console.log("FALHA --- Erro inesperado durante o teste.\n");
        process.exitCode = 1;
        }
    }

    // TESTES DE PERMISSÃO DE ACESSO PARA A SECRETARIA
    try{
        console.log("\nTESTE 3 --- Secretaria tenta cadastrar prontuário.\n");
        await axios.post(
            `${API_URL}/cadastrar`,
            {
                idProntuario: `PRONT-${Date.now()}`,
                idPacienteHash,
                dadosClinicos: {
                    resourceType: "Patient",
                    nome: "John Ronald Reuel Tolkien",
                    genero: "Masculine",
                    dataNascimento: "1892-01-03",
                    diagnostico: "Úlcera gástrica com hemorragia aguda (CID K25.4)",
                },
                idade: 81,
                sexo: "M",
                macroregiao: "Sul",
                cid: "K25.4",
            },
            { headers: { "x-actor": "secretaria" }}
        );
        console.log("FALHA --- Cadastrado com sucesso! (Isso não deveria acontecer, pois a secretaria não tem permissão para cadastrar prontuários.)\n");
        process.exitCode = 1;
    } catch (error: any){
        if (error.response?.status === 403) {
            console.log("SUCESSO --- Erro HTTP 403, permissão negada, cadastro não realizado.\n");
        } else {
            console.error("FALHA --- Erro inesperado durante o teste.\n");
            process.exitCode = 1;
        }
    }
    try{
        console.log("\nTESTE 4 --- Secretaria tenta liberar acesso a um prontuário.\n");
        await axios.post(
            `${API_URL}/conceder-acesso`,
            {
                idProntuario,
                enderecoSolicitante: ENDERECO_INST_B,
                actorSolicitante: "instituicaoB",
            },
            { headers: { "x-actor": "secretaria" } }
        );
        console.log("FALHA --- Acesso liberado com sucesso! (Isso não deveria acontecer, pois a secretaria não tem permissão para conceder acesso à prontuários.)\n");
        process.exitCode = 1;
    } catch (error: any){
        if (error.response?.status === 403) {
            console.log("SUCESSO --- Erro HTTP 403, permissão negada, acesso não concedido.\n");
        } else {
            console.error("FALHA --- Erro inesperado durante o teste.\n");
            process.exitCode = 1;
        }
    }
    try{
        console.log("\nTESTE 5 --- Secretaria tenta solicitar acesso a um prontuário.\n");
        await axios.post(
            `${API_URL}/solicitar-acesso`,
            {
                idProntuario,
                motivo: "Consulta de emergência em cardiologia",
            },
            { headers: { "x-actor": "secretaria" } }
        );
        console.log("FALHA --- Solicitação efetuada com sucesso! (Isso não deveria acontecer, pois a secretaria não tem permissão para solicitar acesso a prontuários.)\n");
        process.exitCode = 1;
    } catch (error: any){
        if (error.response?.status === 403) {
            console.log("SUCESSO --- Erro HTTP 403, permissão negada, solicitação de acesso não efetuada.\n");
        } else {
            console.error("FALHA --- Erro inesperado durante o teste.\n");
            process.exitCode = 1;
        }
    }
    try {
        console.log("\n TESTE 6 --- Secretaria tenta realizar busca por paciente. \n");
        await axios.get(`${API_URL}/busca-paciente/${idPacienteHash}`, {
        headers: { "x-actor": "secretaria" },
        });
        console.log("FALHA --- Busca efetuada com sucesso! (Isso não deveria acontecer, pois a secretaria não tem permissão para buscar informações de pacientes.)");
        process.exitCode = 1;
    } catch (error: any) {
        if (error.response?.status === 403) {
            console.log("SUCESSO --- Erro HTTP 403, permissão negada, busca por paciente não efetuada.\n");
        } else {
            console.error("FALHA --- Erro inesperado durante o teste.\n");
            process.exitCode = 1;
        }
    }

    //TESTES DE PERMISSÃO DE ACESSO PARA INSTITUIÇÕES
    try{
        console.log("\nTESTE 7 --- Instituição B tenta obter estatísticas, ação específica a secretaria.\n");
        await axios.get(
            `${API_URL}/estatisticas/${idProntuario}`, {
            headers: { "x-actor": "instituicaoB" },
        });
        console.log("FALHA --- Dados estatísticos retornados! (Isso não deveria acontecer, pois instituições não tem permissão para obter estatísticas.)");
        process.exitCode = 1;
    }catch (error: any){
        if (error.response?.status === 403) {
            console.log("SUCESSO --- Erro HTTP 403, permissão negada, não foi possível obter as estatísticas.\n");
        } else {
            console.error("FALHA --- Erro inesperado durante o teste.\n");
            process.exitCode = 1;
        }
    }
    try{
        console.log("\nTESTE 8 --- Instituição B tenta conceder acesso a um prontuário que não lhe pertence.\n");
        await axios.post(
            `${API_URL}/conceder-acesso`,
            {
                idProntuario,
                enderecoSolicitante: ENDERECO_INST_A,
                actorSolicitante: "instituicaoA",
            },
            { headers: { "x-actor": "instituicaoB" } }
        );
        console.log("FALHA --- Acesso liberado com sucesso! (Isso não deveria acontecer, pois a instituição B não é proprietária desse prontuário.)\n");
        process.exitCode = 1;
    } catch (error: any){
        if (error.response?.status === 400) {
            console.log("SUCESSO --- Permissão negada, acesso não concedido.\n");
        } else {
            console.error("FALHA --- Erro inesperado durante o teste.\n");
            process.exitCode = 1;
        }
    }
    try{
        console.log("\nTESTE 9 --- Instituição A tenta solicitar acesso a um prontuário que já lhe pertence.\n");
        await axios.post(
            `${API_URL}/solicitar-acesso`,
            {
                idProntuario,
                motivo: "Consulta de emergência em cardiologia",
            },
            { headers: { "x-actor": "instituicaoA" } }
        );
        console.log("FALHA --- Solicitação efetuada com sucesso! (Isso não deveria acontecer, pois a instituição A já é proprietária desse prontuário.)\n");
        process.exitCode = 1;
    } catch (error: any){
        if (error.response?.status === 400) {
            console.log("SUCESSO --- Auto-solicitação negada.\n");
        } else {
            console.error("FALHA --- Erro inesperado durante o teste.\n");
            process.exitCode = 1;
        }
    }

    //TESTE DE ADULTERAÇÃO DE HASH DO PRONTUÁRIO
    try{
        console.log("\nTESTE 10 --- Envio de envelope inválido.\n");

        const envelopeFalso = {
            dadosCifradosDEK: "FAKE-ENVELOPE-DEK-00000000000000",
            dekCifradaComPublicKeyDestino: "FAKE-DEK-000",
            ivSessao: "FAKE-IV-000000000",
        };
        const hashAdulterado = "0xFAKEHASH00000000000000000000000000000000000000000000000000000000";
        
        const response = await axios.post(
            `${API_URL}/processar-envelope`,
            {
                envelope: envelopeFalso,
                hashConteudoOriginal: hashAdulterado,
            },
            { headers: { "x-actor": "instituicaoB" } }
        );
        
        console.log("FALHA --- Envelope processado com sucesso! (Isso não deveria acontecer, pois o envelope enviado é inválido, as informação nele contidas são falsas.)\n");
        
        process.exitCode = 1;
    }catch (error: any){
        if (error.response?.status === 400) {
            console.log("SUCESSO --- Erro HTTP 400, envelope inválido, não foi possível processar o envelope.\n");
        } else {
            console.error("FALHA --- Erro inesperado durante o teste.\n");
            process.exitCode = 1;
        }
    }
    try{
        console.log("\nTESTE 11 --- Envio de envelope válido, mas com hash adulterado.\n");
        
        const concessao = await axios.post(
            `${API_URL}/conceder-acesso`,
            {
                idProntuario,
                enderecoSolicitante: ENDERECO_INST_B,
                actorSolicitante: "instituicaoB",
            },
            { headers: { "x-actor": "instituicaoA" } }
        );

        const envelope = concessao.data.envelope;
        const hashAdulterado = "0xFAKEHASH00000000000000000000000000000000000000000000000000000000";
        
        const response = await axios.post(
            `${API_URL}/processar-envelope`,
            {
                envelope,
                hashConteudoOriginal: hashAdulterado,
            },
            { headers: { "x-actor": "instituicaoB" } }
        );
        
        if(response.data.hashValido === false){
            console.log("SUCESSO --- Envelope processado, mas hash adulterado detectado, integridade inválida.\n");
        }else{
            console.log("FALHA --- Integridade válida! (Isso não deveria acontecer, pois o hash do prontuário foi adulterado.)\n");
            process.exitCode = 1;
        }
    }catch (error: any){
        console.error("FALHA --- Erro inesperado durante o teste.\n");
        process.exitCode = 1;
    }
}

testandoFluxo();