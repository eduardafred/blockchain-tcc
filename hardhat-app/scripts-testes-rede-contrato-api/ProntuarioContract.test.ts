import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Smart Contract --- Testes de Segurança e Regras de Negócio", function () {

    let contrato: any;
    let admin: any;
    let instituicaoA: any;
    let instituicaoB: any;
    let secretaria: any;
    let contaSemAcesso: any;

    let INSTITUICAO_ROLE: string;
    let SECRETARIA_ROLE: string;
    let DEFAULT_ADMIN_ROLE: string;

    const idPacienteHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const idPacienteHash2 = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890ABCDEF";
    const idProntuario = "PRONT-ONCHAIN-001";
    const hashConteudo = "0xb2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01";

    async function eventoDe(tx: any, nome: string) {
        const receipt = await tx.wait();
        for (const log of receipt.logs) {
            try {
                const parsed = contrato.interface.parseLog(log);
                if (parsed && parsed.name === nome) {
                    const bloco = await ethers.provider.getBlock(receipt.blockNumber);
                    return { args: parsed.args, timestamp: BigInt(bloco!.timestamp) };
                }
            } catch {  }
        }
        throw new Error(`Evento ${nome} não encontrado na transação`);
    }

    async function esperarSemPapel(chamada: Promise<any>, conta: any, papel: string) {
        await expect(chamada)
            .to.be.revertedWithCustomError(contrato, "AccessControlUnauthorizedAccount")
            .withArgs(conta.address, papel);
    }


    beforeEach(async function () {
        [admin, instituicaoA, instituicaoB, secretaria, contaSemAcesso] = await ethers.getSigners();

        const ContratoFactory = await ethers.getContractFactory("HealthAuditRegistry");

        contrato = await ContratoFactory.deploy(
            admin.address,
            instituicaoA.address,
            instituicaoB.address,
            secretaria.address
        );
        await contrato.waitForDeployment();

        INSTITUICAO_ROLE = await contrato.INSTITUICAO_ROLE();
        SECRETARIA_ROLE = await contrato.SECRETARIA_ROLE();
        DEFAULT_ADMIN_ROLE = await contrato.DEFAULT_ADMIN_ROLE();

        await contrato.connect(instituicaoA).cadastrarProntuario(
            idProntuario, 
            idPacienteHash,
            hashConteudo,
            25,
            "F",
            "Norte",
            "A00",
        );
    });

    describe("1. Teste nos papéis atribuídos no deploy", function(){
        it("Deve atribuir os papéis corretamente no deploy", async function () {
            expect(await contrato.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
            expect(await contrato.hasRole(INSTITUICAO_ROLE, instituicaoA.address)).to.be.true;
            expect(await contrato.hasRole(INSTITUICAO_ROLE, instituicaoB.address)).to.be.true;
            expect(await contrato.hasRole(SECRETARIA_ROLE, secretaria.address)).to.be.true;
            expect(await contrato.hasRole(INSTITUICAO_ROLE, secretaria.address)).to.be.false;
            expect(await contrato.hasRole(INSTITUICAO_ROLE, contaSemAcesso.address)).to.be.false;
        });

        it("Deve permitir que o admin conceda o INSTITUICAO_ROLE a uma nova conta, que passa a cadastrar", async function () {
            await contrato.connect(admin).grantRole(INSTITUICAO_ROLE, contaSemAcesso.address);
            const idProntuarioTest = "PRONT-ONCHAIN-003";
            await contrato.connect(contaSemAcesso).cadastrarProntuario(
                idProntuarioTest, 
                idPacienteHash,
                hashConteudo,
                22,
                "M",
                "Nordeste",
                "B11",
            );
        });

        it("Deve rejeitar grantRole por quem não é admin.", async function(){
            await esperarSemPapel(
                contrato.connect(instituicaoA).grantRole(INSTITUICAO_ROLE, contaSemAcesso.address),
                instituicaoA,
                DEFAULT_ADMIN_ROLE
            )
        });
    });

    describe("1. Testes no cadastro de prontuários", function () {
        it("Deve rejeitar o cadastro de uma conta sem INSTITUICAO_ROLE", async function () {
            await esperarSemPapel(
                contrato.connect(contaSemAcesso).cadastrarProntuario(
                    idProntuario,
                    idPacienteHash,
                    hashConteudo,
                    42,
                    "M",
                    "Centro-Oeste",
                    "I10"
                ),
                contaSemAcesso,
                INSTITUICAO_ROLE,
            );
        });

        it("Deve rejeitar o cadastro duplicado do mesmo ID de prontuário", async function () {
            await expect(
                contrato.connect(instituicaoA).cadastrarProntuario(
                    idProntuario,
                    idPacienteHash,
                    hashConteudo,
                    42,
                    "M",
                    "Centro-Oeste",
                    "I10"
                )
            ).to.be.revertedWith("Prontuario ja cadastrado.");
        });

        it("Deve rejeitar duplicidade mesmo quando outra instituição tenta reutilizar o ID", async function () {
            await expect(
                contrato.connect(instituicaoB).cadastrarProntuario(
                    idProntuario,
                    idPacienteHash,
                    hashConteudo,
                    37,
                    "M",
                    "Sudeste",
                    "J78"
                )
            ).to.be.revertedWith("Prontuario ja cadastrado.");
        });
 
        describe("1.1 Validação de cada campo obrigatório", function () {
            it("Deve rejeitar hash de paciente com tamanho diferente de 66 caracteres", async function () {
                await expect(
                    contrato.connect(instituicaoB).cadastrarProntuario(
                        "PRONT-003",
                        "0x1234",
                        hashConteudo,
                        10,
                        "M",
                        "Sudeste",
                        "J78"
                    )
                ).to.be.revertedWith("Hash de paciente invalido");
            });
 
            it("Deve rejeitar hash de paciente vazio", async function () {
                await expect(
                    contrato.connect(instituicaoB).cadastrarProntuario(
                        "PRONT-004",
                        "",
                        hashConteudo,
                        10,
                        "M",
                        "Sudeste",
                        "J78"
                    )
                ).to.be.revertedWith("Hash de paciente invalido");
            });
 
            it("Deve rejeitar hash de conteúdo vazio", async function () {
                await expect(
                    contrato.connect(instituicaoB).cadastrarProntuario(
                        "PRONT-005",
                        idPacienteHash,
                        "",
                        37,
                        "M",
                        "Sudeste",
                        "J78"
                    )
                ).to.be.revertedWith("Hash de conteudo obrigatorio");
            });
 
            it("Deve rejeitar idade igual a zero", async function () {
                await expect(
                    contrato.connect(instituicaoB).cadastrarProntuario(
                        "PRONT-006",
                        idPacienteHash,
                        hashConteudo,
                        0,
                        "M",
                        "Sudeste",
                        "J78"
                    )
                ).to.be.revertedWith("Idade obrigatoria.");
            });
 
            it("Deve aceitar a idade máxima do uint8 (255)", async function () {
                await expect(
                    contrato.connect(instituicaoB).cadastrarProntuario(
                        "PRONT-007",
                        idPacienteHash,
                        hashConteudo,
                        255,
                        "M",
                        "Sudeste",
                        "J78"
                    )
                ).to.not.be.revert(ethers);
            });
 
            it("Deve rejeitar sexo vazio", async function () {
                await expect(
                    contrato.connect(instituicaoB).cadastrarProntuario(
                        "PRONT-008",
                        idPacienteHash,
                        hashConteudo,
                        37,
                        "",
                        "Sudeste",
                        "J78"
                    )
                ).to.be.revertedWith("Sexo obrigatorio.");
            });
 
            it("Deve rejeitar macrorregião vazia", async function () {
                await expect(
                    contrato.connect(instituicaoB).cadastrarProntuario(
                        "PRONT-009",
                        idPacienteHash,
                        hashConteudo,
                        37,
                        "M",
                        "",
                        "J78"
                    )
                ).to.be.revertedWith("Macroregiao obrigatorio.");
            });
 
            it("Deve rejeitar CID vazio", async function () {
                await expect(
                    contrato.connect(instituicaoB).cadastrarProntuario(
                        "PRONT-010",
                        idPacienteHash,
                        hashConteudo,
                        37,
                        "M",
                        "Sudeste",
                        ""
                    )
                ).to.be.revertedWith("CID obrigatorio.");
            });
        });

        describe("1.2 Efeitos de cadastro de prontuário bem-sucedido", function (){
            it("Deve incrementar o total de prontuários e registrar o ID na lista", async function(){
                expect(await contrato.getTotalProntuarios()).to.equal(1n);
                await contrato.connect(instituicaoB).cadastrarProntuario(
                        "PRONT-B-001",
                        idPacienteHash,
                        hashConteudo,
                        42,
                        "M",
                        "Centro-Oeste",
                        "I10");

                expect(await contrato.getTotalProntuarios()).to.equal(2n);

                const lista = await contrato.connect(instituicaoA).getListaIdsProntuarios();
                expect([...lista]).to.deep.equal([idProntuario, "PRONT-B-001"]);
            });
            
            it("Deve registrar quem cadastrou como instituição dona", async function () {
                expect(await contrato.verificarPermissao(idProntuario, instituicaoA.address)).to.be.true;
                expect(await contrato.verificarPermissao(idProntuario, instituicaoB.address)).to.be.false;
            });

            it("Deve guardar os dados estatísticos corretamente", async function () {
                const [registros, timestampConsulta] = await contrato.connect(secretaria).obterDadosEstatisticos();
                expect(registros.length).to.equal(1);
                expect(registros[0].macroregiao).to.equal("Norte");
                expect(registros[0].cid).to.equal("A00");
                expect(registros[0].idade).to.equal(25n);
                expect(registros[0].sexo).to.equal("F");
                expect(registros[0].idPacienteHash).to.equal(idPacienteHash);
                expect(registros[0].instituicaoDona).to.equal(instituicaoA.address);
                expect(timestampConsulta).to.be.greaterThan(0n);
            });
        });
    });

    describe("2. Testes na concessão de acesso a prontuários", function () {
        it("Deve rejeitar quando a Instituição B tenta autorizar o acesso a um prontuário que não é de sua propriedade", async function () {
            await expect(
                contrato.connect(instituicaoB).autorizarAcesso(idProntuario, contaSemAcesso.address)
            ).to.be.revertedWith("Apenas a instituicao dona pode autorizar acesso.");
        });

        it("Deve permitir que a Instituição A autorize o acesso de seu prontuário, à Instituição B", async function () {
            const tx = await contrato.connect(instituicaoA).autorizarAcesso(idProntuario, instituicaoB);
            const { args, timestamp } = await eventoDe(tx, "AcessoConcedido");

            expect(args.idProntuario.hash).to.equal(ethers.id(idProntuario));
            expect(args.instituicaoDona).to.equal(instituicaoA.address);
            expect(args.solicitante).to.equal(instituicaoB.address);
            expect(args.timestamp).to.equal(timestamp);

            expect(await contrato.verificarPermissao(idProntuario, instituicaoB.address)).to.be.true;
        });

        it("Deve rejeitar autorização para si mesmo", async function () {
            await expect(
                contrato.connect(instituicaoA).autorizarAcesso(idProntuario, instituicaoA.address)
            ).to.be.revertedWith("Nao e necessario conceder acesso a si mesmo.");
        });
 
        it("Deve rejeitar autorização a um endereço sem INSTITUICAO_ROLE", async function () {
            await expect(
                contrato.connect(instituicaoA).autorizarAcesso(idProntuario, contaSemAcesso.address)
            ).to.be.revertedWith("Solicitante deve ser uma instituicao autorizada.");
        });
 
        it("Deve rejeitar autorização a um endereço que só tem SECRETARIA_ROLE", async function () {
            await expect(
                contrato.connect(instituicaoA).autorizarAcesso(idProntuario, secretaria.address)
            ).to.be.revertedWith("Solicitante deve ser uma instituicao autorizada.");
        });
 
        it("Deve rejeitar autorização de prontuário inexistente", async function () {
            await expect(
                contrato.connect(instituicaoA).autorizarAcesso("PRONT-INEXISTENTE", instituicaoB.address)
            ).to.be.revertedWith("Apenas a instituicao dona pode autorizar acesso.");
        });
 
        it("Deve rejeitar autorização feita por conta sem INSTITUICAO_ROLE", async function () {
            await esperarSemPapel(
                contrato.connect(contaSemAcesso).autorizarAcesso(idProntuario, instituicaoB.address),
                contaSemAcesso,
                INSTITUICAO_ROLE
            );
        });
 
        it("Deve rejeitar autorização feita pela Secretaria", async function () {
            await esperarSemPapel(
                contrato.connect(secretaria).autorizarAcesso(idProntuario, instituicaoB.address),
                secretaria,
                INSTITUICAO_ROLE
            );
        });
 
        it("Deve rejeitar autorização feita pelo admin (que não tem INSTITUICAO_ROLE)", async function () {
            await esperarSemPapel(
                contrato.connect(admin).autorizarAcesso(idProntuario, instituicaoB.address),
                admin,
                INSTITUICAO_ROLE
            );
        });
 
        it("Não deve permitir que quem recebeu acesso repasse a autorização a terceiros", async function () {
            await contrato.connect(instituicaoA).autorizarAcesso(idProntuario, instituicaoB.address);
            await expect(
                contrato.connect(instituicaoB).autorizarAcesso(idProntuario, contaSemAcesso.address)
            ).to.be.revertedWith("Apenas a instituicao dona pode autorizar acesso.");
        });
 
        it("Autorizar duas vezes não deve alterar o resultado", async function () {
            await contrato.connect(instituicaoA).autorizarAcesso(idProntuario, instituicaoB.address);
            await expect(
                contrato.connect(instituicaoA).autorizarAcesso(idProntuario, instituicaoB.address)
            ).to.not.be.revert(ethers);
            expect(await contrato.verificarPermissao(idProntuario, instituicaoB.address)).to.be.true;
        });
    });

    describe("3. Solicitação de acesso a prontuários", function () {
        it("Deve rejeitar a solicitação de acesso a um prontuário inexistente", async function () {
            await expect(
                contrato.connect(instituicaoB).solicitarAcesso("PRONT-INEXISTENTE", "Motivo emergencial")
            ).to.be.revertedWith("Prontuario nao existe.");
        });
 
        it("Deve rejeitar a solicitação da própria instituição dona", async function () {
            await expect(
                contrato.connect(instituicaoA).solicitarAcesso(idProntuario, "Motivo")
            ).to.be.revertedWith("O proprietario nao pode solicitar acesso ao proprio prontuario.");
        });
 
        it("Deve rejeitar solicitação de conta sem INSTITUICAO_ROLE", async function () {
            await esperarSemPapel(
                contrato.connect(contaSemAcesso).solicitarAcesso(idProntuario, "Motivo"),
                contaSemAcesso,
                INSTITUICAO_ROLE
            );
        });
 
        it("Deve rejeitar solicitação da Secretaria", async function () {
            await esperarSemPapel(
                contrato.connect(secretaria).solicitarAcesso(idProntuario, "Motivo"),
                secretaria,
                INSTITUICAO_ROLE
            );
        });
 
        it("Deve emitir AcessoSolicitado com solicitante, motivo e timestamp", async function () {
            const motivo = "Paciente transferido em emergência";
            const tx = await contrato.connect(instituicaoB).solicitarAcesso(idProntuario, motivo);
            const { args, timestamp } = await eventoDe(tx, "AcessoSolicitado");
 
            expect(args.idProntuario.hash).to.equal(ethers.id(idProntuario));
            expect(args.solicitante).to.equal(instituicaoB.address);
            expect(args.motivo).to.equal(motivo);
            expect(args.timestamp).to.equal(timestamp);
        });
 
        it("Solicitar acesso não deve conceder permissão por si só", async function () {
            await contrato.connect(instituicaoB).solicitarAcesso(idProntuario, "Motivo");
            expect(await contrato.verificarPermissao(idProntuario, instituicaoB.address)).to.be.false;
        });
    });

    describe("4. Restrição de consultas", function () {
        it("Deve rejeitar a busca de lista de IDs por conta sem permissão", async function () {
            await expect(
                contrato.connect(contaSemAcesso).getListaIdsProntuarios()
            ).to.be.revertedWith("Acesso negado.");
        });
 
        it("Deve permitir que a Secretaria consulte a lista de IDs de prontuários", async function () {
            const listaIds = await contrato.connect(secretaria).getListaIdsProntuarios();
            expect(listaIds.length).to.equal(1);
            expect(listaIds[0]).to.equal(idProntuario);
        });
 
        it("Deve permitir que uma Instituição consulte a lista de IDs", async function () {
            const listaIds = await contrato.connect(instituicaoB).getListaIdsProntuarios();
            expect(listaIds.length).to.equal(1);
        });
 
        it("Deve permitir a qualquer conta consultar apenas o total de prontuários", async function () {
            expect(await contrato.connect(contaSemAcesso).getTotalProntuarios()).to.equal(1n);
        });
    });

    describe("5. Dados estatísticos gerais (obterDadosEstatisticos - Secretaria)", function () {
        it("Deve rejeitar a consulta de Instituição (falta SECRETARIA_ROLE)", async function () {
            await esperarSemPapel(
                contrato.connect(instituicaoA).obterDadosEstatisticos(),
                instituicaoA,
                SECRETARIA_ROLE
            );
        });
 
        it("Deve rejeitar a consulta de conta sem papel", async function () {
            await esperarSemPapel(
                contrato.connect(contaSemAcesso).obterDadosEstatisticos(),
                contaSemAcesso,
                SECRETARIA_ROLE
            );
        });
 
        it("Deve retornar lista vazia quando ainda não houver prontuários na rede", async function () {
            const ContratoFactory = await ethers.getContractFactory("HealthAuditRegistry");
            const contratoVazio = await ContratoFactory.deploy(
                admin.address,
                instituicaoA.address,
                instituicaoB.address,
                secretaria.address
            );
            await contratoVazio.waitForDeployment();

            const [registros, timestampConsulta] = await contratoVazio.connect(secretaria).obterDadosEstatisticos();
            expect(registros.length).to.equal(0);
            expect(timestampConsulta).to.be.greaterThan(0n);
        });
 
        it("Deve retornar todos os prontuários da rede com seus respectivos metadados e timestamps", async function () {
            const tx = await contrato.connect(instituicaoB).cadastrarProntuario(
                "PRONT-TS",
                idPacienteHash2,
                hashConteudo,
                37,
                "M",
                "Sudeste",
                "J78"
            );
            const receipt = await tx.wait();
            const bloco = await ethers.provider.getBlock(receipt.blockNumber);
 
            const [registros, timestampConsulta] = await contrato.connect(secretaria).obterDadosEstatisticos();
            expect(registros.length).to.equal(2);

            expect(registros[0].cid).to.equal("A00");
            expect(registros[0].instituicaoDona).to.equal(instituicaoA.address);

            expect(registros[1].idPacienteHash).to.equal(idPacienteHash2);
            expect(registros[1].hashConteudo).to.equal(hashConteudo);
            expect(registros[1].instituicaoDona).to.equal(instituicaoB.address);
            expect(registros[1].idade).to.equal(37n);
            expect(registros[1].sexo).to.equal("M");
            expect(registros[1].macroregiao).to.equal("Sudeste");
            expect(registros[1].cid).to.equal("J78");
            expect(registros[1].timestamp).to.equal(BigInt(bloco!.timestamp));

            expect(timestampConsulta).to.be.greaterThanOrEqual(BigInt(bloco!.timestamp));
        });
    });

    describe("6. verificarPermissao", function () {
        it("Deve retornar true para a instituição dona", async function () {
            expect(await contrato.verificarPermissao(idProntuario, instituicaoA.address)).to.be.true;
        });
 
        it("Deve retornar false para quem não é dono nem foi autorizado", async function () {
            expect(await contrato.verificarPermissao(idProntuario, instituicaoB.address)).to.be.false;
            expect(await contrato.verificarPermissao(idProntuario, contaSemAcesso.address)).to.be.false;
            expect(await contrato.verificarPermissao(idProntuario, secretaria.address)).to.be.false;
        });
 
        it("Deve retornar true para quem foi autorizado", async function () {
            await contrato.connect(instituicaoA).autorizarAcesso(idProntuario, instituicaoB.address);
            expect(await contrato.verificarPermissao(idProntuario, instituicaoB.address)).to.be.true;
        });
 
        it("A autorização vale só para o prontuário informado", async function () {
            await contrato.connect(instituicaoA).cadastrarProntuario(
                "PRONT-A-002",
                idPacienteHash2,
                hashConteudo,
                37,
                "M",
                "Sudeste",
                "J78"
            );

            await contrato.connect(instituicaoA).autorizarAcesso(idProntuario, instituicaoB.address);
 
            expect(await contrato.verificarPermissao(idProntuario, instituicaoB.address)).to.be.true;
            expect(await contrato.verificarPermissao("PRONT-A-002", instituicaoB.address)).to.be.false;
        });
 
        it("A autorização é por prontuário e não depende da direção entre instituições", async function () {
            await contrato.connect(instituicaoB).cadastrarProntuario(
                    "PRONT-B-001",
                    idPacienteHash2,
                    hashConteudo,
                    37,
                    "M",
                    "Sudeste",
                    "J78"
                );
            await contrato.connect(instituicaoA).autorizarAcesso(idProntuario, instituicaoB.address);
 
            expect(await contrato.verificarPermissao("PRONT-B-001", instituicaoA.address)).to.be.false;
        });
 
        it("Prontuário inexistente: retorna false para qualquer endereço comum", async function () {
            expect(await contrato.verificarPermissao("PRONT-INEXISTENTE", instituicaoA.address)).to.be.false;
        });
 
        it("Prontuário inexistente: consultar o endereço zero retorna true (comportamento atual)", async function () {
            expect(await contrato.verificarPermissao("PRONT-INEXISTENTE", ethers.ZeroAddress)).to.be.true;
        });
    });

    describe("7. buscarProntuariosPorPaciente", function () {
        it("Deve rejeitar conta sem INSTITUICAO_ROLE", async function () {
            await esperarSemPapel(
                contrato.connect(contaSemAcesso).buscarProntuariosPorPaciente(idPacienteHash),
                contaSemAcesso,
                INSTITUICAO_ROLE
            );
        });
 
        it("Deve rejeitar a Secretaria", async function () {
            await esperarSemPapel(
                contrato.connect(secretaria).buscarProntuariosPorPaciente(idPacienteHash),
                secretaria,
                INSTITUICAO_ROLE
            );
        });
 
        it("Deve retornar lista vazia para paciente sem prontuários", async function () {
            const r = await contrato.connect(instituicaoA).buscarProntuariosPorPaciente("0xPACIENTESEMCADASTRO");
            expect(r.length).to.equal(0);
        });
 
        it("Deve retornar os campos corretos do resumo", async function () {
            const r = await contrato.connect(instituicaoA).buscarProntuariosPorPaciente(idPacienteHash);
            expect(r.length).to.equal(1);
            expect(r[0].idProntuario).to.equal(idProntuario);
            expect(r[0].hashConteudo).to.equal(hashConteudo);
            expect(r[0].instituicaoDona).to.equal(instituicaoA.address);
            expect(r[0].timestamp).to.be.greaterThan(0n);
        });
 
        it("Não deve misturar prontuários de pacientes diferentes", async function () {
            await contrato.connect(instituicaoA).cadastrarProntuario(
                    "PRONT-OUTRO",
                    idPacienteHash2,
                    hashConteudo,
                    37,
                    "M",
                    "Sudeste",
                    "J78"
                );
 
            const r1 = await contrato.connect(instituicaoA).buscarProntuariosPorPaciente(idPacienteHash);
            const r2 = await contrato.connect(instituicaoA).buscarProntuariosPorPaciente(idPacienteHash2);
 
            expect(r1.length).to.equal(1);
            expect(r2.length).to.equal(1);
            expect(r2[0].idProntuario).to.equal("PRONT-OUTRO");
        });
 
        it("Deve mostrar o resumo à outra instituição, sem exigir autorização prévia (comportamento atual)", async function () {
            const r = await contrato.connect(instituicaoB).buscarProntuariosPorPaciente(idPacienteHash);
            expect(r.length).to.equal(1);
        });
    });

    describe("8. Eventos de cadastro", function () {
        it("Deve emitir ProntuarioCadastrado com os dados corretos", async function () {
            const tx = await contrato.connect(instituicaoA).cadastrarProntuario(
                    "PRONT-EV-001",
                    idPacienteHash2,
                    hashConteudo,
                    37,
                    "M",
                    "Sudeste",
                    "J78"
                );
            const { args, timestamp } = await eventoDe(tx, "ProntuarioCadastrado");
 
            expect(args.idProntuario.hash).to.equal(ethers.id("PRONT-EV-001"));
            expect(args.idPacienteHash.hash).to.equal(ethers.id(idPacienteHash2));
            expect(args.cid).to.equal("J78");
            expect(args.instituicao).to.equal(instituicaoA.address);
            expect(args.timestamp).to.equal(timestamp);
        });
    });

    describe("9. Pesquisa de estatísticas por CID (obterEstatisticasPorCid - Secretaria)", function () {
        it("Deve rejeitar a consulta de Instituição (falta SECRETARIA_ROLE)", async function () {
            await esperarSemPapel(
                contrato.connect(instituicaoA).obterEstatisticasPorCid("A00"),
                instituicaoA,
                SECRETARIA_ROLE
            );
        });

        it("Deve rejeitar a consulta de conta sem papel", async function () {
            await esperarSemPapel(
                contrato.connect(contaSemAcesso).obterEstatisticasPorCid("A00"),
                contaSemAcesso,
                SECRETARIA_ROLE
            );
        });

        it("Deve retornar lista vazia e timestamp da consulta para CID sem registros", async function () {
            const [registros, timestampConsulta] = await contrato.connect(secretaria).obterEstatisticasPorCid("Z99");
            expect(registros.length).to.equal(0);
            expect(timestampConsulta).to.be.greaterThan(0n);
        });

        it("Deve retornar apenas os prontuários correspondentes ao CID pesquisado, mesmo de instituições diferentes", async function () {
            // Cadastra segundo prontuário com o mesmo CID ("A00") pela Instituição B
            await contrato.connect(instituicaoB).cadastrarProntuario(
                "PRONT-A00-2",
                idPacienteHash2,
                hashConteudo,
                50,
                "M",
                "Sul",
                "A00"
            );

            // Cadastra prontuário com outro CID ("J43") que não deve aparecer no filtro de "A00"
            const txJ43 = await contrato.connect(instituicaoB).cadastrarProntuario(
                "PRONT-J43-1",
                idPacienteHash2,
                hashConteudo,
                62,
                "F",
                "Sudeste",
                "J43"
            );
            const receiptJ43 = await txJ43.wait();
            const blocoJ43 = await ethers.provider.getBlock(receiptJ43.blockNumber);

            const [registrosA00, timestampConsultaA00] = await contrato.connect(secretaria).obterEstatisticasPorCid("A00");
            expect(registrosA00.length).to.equal(2);
            expect(registrosA00[0].instituicaoDona).to.equal(instituicaoA.address);
            expect(registrosA00[0].idPacienteHash).to.equal(idPacienteHash);
            expect(registrosA00[0].cid).to.equal("A00");
            expect(registrosA00[1].instituicaoDona).to.equal(instituicaoB.address);
            expect(registrosA00[1].idPacienteHash).to.equal(idPacienteHash2);
            expect(registrosA00[1].idade).to.equal(50n);
            expect(registrosA00[1].cid).to.equal("A00");
            expect(timestampConsultaA00).to.be.greaterThan(0n);

            const [registrosJ43, timestampConsultaJ43] = await contrato.connect(secretaria).obterEstatisticasPorCid("J43");
            expect(registrosJ43.length).to.equal(1);
            expect(registrosJ43[0].idPacienteHash).to.equal(idPacienteHash2);
            expect(registrosJ43[0].hashConteudo).to.equal(hashConteudo);
            expect(registrosJ43[0].instituicaoDona).to.equal(instituicaoB.address);
            expect(registrosJ43[0].idade).to.equal(62n);
            expect(registrosJ43[0].sexo).to.equal("F");
            expect(registrosJ43[0].macroregiao).to.equal("Sudeste");
            expect(registrosJ43[0].cid).to.equal("J43");
            expect(registrosJ43[0].timestamp).to.equal(BigInt(blocoJ43!.timestamp));
            expect(timestampConsultaJ43).to.be.greaterThanOrEqual(BigInt(blocoJ43!.timestamp));
        });
    });

});