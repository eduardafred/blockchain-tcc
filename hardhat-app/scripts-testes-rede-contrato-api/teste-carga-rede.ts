// TESTE DE CARGA --- direto na blockchain (sem API, sem MongoDB, sem criptografia de envelope).
// Mantém uma taxa constante de escritas (cadastrarProntuario) e leituras (buscarProntuariosPorPaciente)
// durante um tempo fixo, para medir latência e vazão em regime estável.
import {
    cfg, sleep, criarContexto, preflight, VigiaDeBlocos, novoRegistro, gerador, enviarCadastro, lerBusca,
    hashPaciente, verificarRecibos, estat, contarErros, estatisticasDeBlocos, gravarResultados, Registro,
} from "./teste-rede-lib.js";

const TPS_ESCRITA = Number(process.env.TPS_ESCRITA ?? 5);
const TPS_LEITURA = Number(process.env.TPS_LEITURA ?? 20);
const DURACAO_S = Number(process.env.DURACAO_S ?? 120);
const AQUECIMENTO_S = Number(process.env.AQUECIMENTO_S ?? 15);

console.log("\n TESTE DE CARGA --- blockchain direta");
console.log(`Escritas: ${TPS_ESCRITA}/s | Leituras: ${TPS_LEITURA}/s | Duração: ${DURACAO_S}s (aquecimento ${AQUECIMENTO_S}s, descartado)\n`);

const ctx = await criarContexto();
const totalAntes = await preflight(ctx);

const vigia = new VigiaDeBlocos(ctx.provider, cfg.pollMs);
await vigia.iniciar();

const runId = Date.now().toString(36);
const regs: Registro[] = [];
const tarefas: Promise<void>[] = [];
let seq = 0;
const inicio = performance.now();
const emAquecimento = () => performance.now() - inicio < AQUECIMENTO_S * 1000;

const pararEscrita = gerador(TPS_ESCRITA, () => {
    const conta = ctx.contas[seq % ctx.contas.length];
    const reg = novoRegistro("escrita", conta.nome, 0, emAquecimento());
    regs.push(reg);
    tarefas.push(enviarCadastro(ctx, vigia, conta, reg, runId, seq++));
});

const pararLeitura = TPS_LEITURA > 0
    ? gerador(TPS_LEITURA, () => {
        const reg = novoRegistro("leitura", ctx.contas[0].nome, 0, emAquecimento());
        regs.push(reg);
        const n = Math.floor(Math.random() * Math.max(1, Math.min(seq, 500)));
        tarefas.push(lerBusca(ctx, reg, hashPaciente(runId, n)));
    })
    : () => {};

const progresso = setInterval(() => {
    const w = regs.filter((r) => r.tipo === "escrita");
    const ok = w.filter((r) => r.status === "ok").length;
    const err = w.filter((r) => r.status === "erro_envio" || r.status === "sem_confirmacao").length;
    const pend = w.filter((r) => r.status === undefined).length;
    console.log(`  [${((performance.now() - inicio) / 1000).toFixed(0)}s] escritas enviadas=${w.length} confirmadas=${ok} erros=${err} pendentes=${pend}`);
}, 10000);

await sleep(DURACAO_S * 1000);
pararEscrita();
pararLeitura();
const fimEnvio = performance.now();
console.log("\nEnvio encerrado. Aguardando confirmações pendentes...");
await Promise.allSettled(tarefas);
clearInterval(progresso);
vigia.parar();

console.log("Lendo recibos e conferindo consistência...");
await verificarRecibos(ctx, regs);
const totalDepois: bigint = await ctx.contrato.getTotalProntuarios();

// ---------------------------------------------------------------------------
// Relatório (somente o que veio depois do aquecimento)
// ---------------------------------------------------------------------------
const janelaIni = inicio + AQUECIMENTO_S * 1000;
const janelaS = (fimEnvio - janelaIni) / 1000;
const medidos = regs.filter((r) => !r.aquecimento);
const w = medidos.filter((r) => r.tipo === "escrita");
const l = medidos.filter((r) => r.tipo === "leitura");
const wOk = w.filter((r) => r.status === "ok");
const confirmadasNaJanela = regs.filter((r) => r.tipo === "escrita" && r.status === "ok" && r.confirmadoEm! >= janelaIni && r.confirmadoEm! <= fimEnvio).length;
const gasMedio = wOk.filter((r) => r.gas).length
    ? Math.round(wOk.reduce((a, r) => a + (r.gas ?? 0), 0) / wOk.filter((r) => r.gas).length) : null;
const blocosJanela = vigia.blocos.filter((b) => b.em >= janelaIni && b.em <= fimEnvio);

const esperado = BigInt(regs.filter((r) => r.tipo === "escrita" && r.status === "ok").length);
const delta = totalDepois - totalAntes;

const resumo = {
    configuracao: { TPS_ESCRITA, TPS_LEITURA, DURACAO_S, AQUECIMENTO_S, rpcA: cfg.rpcUrlA, rpcB: cfg.rpcUrlB },
    envioReal: {
        escritasPorSegundo: Number((w.length / janelaS).toFixed(2)),
        leiturasPorSegundo: Number((l.length / janelaS).toFixed(2)),
    },
    escritas: {
        enviadas: w.length,
        confirmadas: wOk.length,
        revertidas: w.filter((r) => r.status === "revertida").length,
        errosDeEnvio: w.filter((r) => r.status === "erro_envio").length,
        semConfirmacao: w.filter((r) => r.status === "sem_confirmacao").length,
        vazaoConfirmadaPorSegundo: Number((confirmadasNaJanela / janelaS).toFixed(2)),
        gasMedioPorCadastro: gasMedio,
        latenciaSubmissaoMs: estat(w.filter((r) => r.submitMs !== undefined).map((r) => r.submitMs!)),
        latenciaConfirmacaoMs: estat(wOk.map((r) => r.latMs!)),
        erros: contarErros(w),
    },
    leituras: {
        enviadas: l.length,
        ok: l.filter((r) => r.status === "ok").length,
        erros: l.filter((r) => r.status === "erro_leitura").length,
        latenciaMs: estat(l.filter((r) => r.status === "ok").map((r) => r.latMs!)),
        errosPorTipo: contarErros(l),
    },
    blocos: estatisticasDeBlocos(blocosJanela),
    consistencia: {
        totalAntes: totalAntes.toString(),
        totalDepois: totalDepois.toString(),
        cadastrosConfirmadosPeloTeste: esperado.toString(),
        confere: delta === esperado,
    },
};

console.log("\n================ RESULTADO ================");
console.log("Taxa de envio real (se for menor que a alvo, o gerador é o gargalo):", resumo.envioReal);
console.log("\nESCRITAS");
console.log(`  enviadas=${resumo.escritas.enviadas} confirmadas=${resumo.escritas.confirmadas} revertidas=${resumo.escritas.revertidas} errosDeEnvio=${resumo.escritas.errosDeEnvio} semConfirmacao=${resumo.escritas.semConfirmacao}`);
console.log(`  vazão confirmada: ${resumo.escritas.vazaoConfirmadaPorSegundo} tx/s | gas médio por cadastro: ${gasMedio}`);
console.log("  latência de submissão (ms):", resumo.escritas.latenciaSubmissaoMs);
console.log("  latência até aparecer em bloco (ms):", resumo.escritas.latenciaConfirmacaoMs);
if (Object.keys(resumo.escritas.erros).length) console.log("  erros:", resumo.escritas.erros);
console.log("\nLEITURAS (eth_call buscarProntuariosPorPaciente)");
console.log(`  enviadas=${resumo.leituras.enviadas} ok=${resumo.leituras.ok} erros=${resumo.leituras.erros}`);
console.log("  latência (ms):", resumo.leituras.latenciaMs);
console.log("\nBLOCOS na janela medida:", resumo.blocos);
console.log("\nCONSISTÊNCIA: prontuários antes", totalAntes.toString(), "| depois", totalDepois.toString(),
    "| confirmados pelo teste", esperado.toString(), "|", resumo.consistencia.confere ? "CONFERE" : "DIVERGE");

gravarResultados("carga", resumo, regs, inicio);
process.exit(0);