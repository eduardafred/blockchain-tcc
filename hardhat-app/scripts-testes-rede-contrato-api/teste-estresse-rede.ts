// TESTE DE ESTRESSE --- direto na blockchain.
// Aumenta a taxa de escritas em degraus até o sistema saturar (erros, fila de pendentes ou vazão que não acompanha),
// e depois reduz a taxa para verificar se ele se recupera sozinho.
import {
    cfg, sleep, criarContexto, preflight, VigiaDeBlocos, novoRegistro, gerador, enviarCadastro,
    verificarRecibos, estat, contarErros, estatisticasDeBlocos, gravarResultados, Registro,
} from "./teste-rede-lib.js";

const TPS_INICIAL = Number(process.env.TPS_INICIAL ?? 5);
const TPS_PASSO = Number(process.env.TPS_PASSO ?? 5);
const TPS_MAX = Number(process.env.TPS_MAX ?? 100);
const PASSO_S = Number(process.env.PASSO_S ?? 30);
const LIMITE_ERRO = Number(process.env.LIMITE_ERRO ?? 0.05);        // 5% de erros de envio no degrau
const MAX_PENDENTES = Number(process.env.MAX_PENDENTES ?? 1000);    // fila de transações sem confirmação
const LIMITE_P95_MS = Number(process.env.LIMITE_P95_MS ?? 20000);   // só para o veredito final
const RECUP_TPS = Number(process.env.RECUP_TPS ?? 2);
const RECUP_S = Number(process.env.RECUP_S ?? 90);

console.log("\n TESTE DE ESTRESSE --- blockchain direta");
console.log(`Degraus de ${TPS_PASSO} tx/s a cada ${PASSO_S}s, de ${TPS_INICIAL} até ${TPS_MAX} tx/s (ou até saturar)\n`);

const ctx = await criarContexto();
const totalAntes = await preflight(ctx);

const vigia = new VigiaDeBlocos(ctx.provider, cfg.pollMs);
await vigia.iniciar();

const runId = Date.now().toString(36);
const regs: Registro[] = [];
const tarefas: Promise<void>[] = [];
const passos: { passo: number; tps: number; ini: number; fim: number; recuperacao: boolean }[] = [];
let seq = 0;
let passoAtual = 0;
const inicio = performance.now();

const iniciarGerador = (tps: number) =>
    gerador(tps, () => {
        const conta = ctx.contas[seq % ctx.contas.length];
        const reg = novoRegistro("escrita", conta.nome, passoAtual, false);
        regs.push(reg);
        tarefas.push(enviarCadastro(ctx, vigia, conta, reg, runId, seq++));
    });

let motivoParada = `TPS_MAX (${TPS_MAX} tx/s) atingido sem saturar`;
let passo = 0;

for (let tps = TPS_INICIAL; tps <= TPS_MAX; tps += TPS_PASSO, passo++) {
    passoAtual = passo;
    const ini = performance.now();
    const parar = iniciarGerador(tps);
    await sleep(PASSO_S * 1000);
    parar();
    const fim = performance.now();
    passos.push({ passo, tps, ini, fim, recuperacao: false });

    const doPasso = regs.filter((r) => r.passo === passo);
    const errosEnvio = doPasso.filter((r) => r.status === "erro_envio").length;
    const pendentes = regs.filter((r) => r.status === undefined).length;
    console.log(`  degrau ${passo + 1}: alvo=${tps} tx/s | enviadas=${doPasso.length} | erros de envio=${errosEnvio} | pendentes agora=${pendentes}`);

    if (doPasso.length && errosEnvio / doPasso.length > LIMITE_ERRO) {
        motivoParada = `erros de envio acima de ${LIMITE_ERRO * 100}% no degrau de ${tps} tx/s`;
        break;
    }
    if (pendentes > MAX_PENDENTES) {
        motivoParada = `fila de pendentes acima de ${MAX_PENDENTES} no degrau de ${tps} tx/s`;
        break;
    }
}

console.log(`\nParada da escalada: ${motivoParada}`);
console.log(`Fase de recuperação: ${RECUP_TPS} tx/s por ${RECUP_S}s...`);
passoAtual = passo + 1;
{
    const ini = performance.now();
    const parar = iniciarGerador(RECUP_TPS);
    await sleep(RECUP_S * 1000);
    parar();
    passos.push({ passo: passoAtual, tps: RECUP_TPS, ini, fim: performance.now(), recuperacao: true });
}

console.log("Aguardando confirmações pendentes...");
await Promise.allSettled(tarefas);
vigia.parar();
console.log("Lendo recibos e conferindo consistência...");
await verificarRecibos(ctx, regs);
const totalDepois: bigint = await ctx.contrato.getTotalProntuarios();

// ---------------------------------------------------------------------------
// Relatório por degrau
// ---------------------------------------------------------------------------
const tabela = passos.map((p) => {
    const rp = regs.filter((r) => r.passo === p.passo);
    const ok = rp.filter((r) => r.status === "ok");
    const dur = (p.fim - p.ini) / 1000;
    // vazão medida pelo momento da CONFIRMAÇÃO dentro da janela do degrau
    // (na recuperação, só as transações da própria fase, para não contar a fila drenando dos degraus anteriores)
    const conf = regs.filter((r) => r.status === "ok" && r.confirmadoEm! >= p.ini && r.confirmadoEm! < p.fim
        && (!p.recuperacao || r.passo === p.passo)).length;
    const lat = estat(ok.map((r) => r.latMs!)) as any;
    return {
        degrau: p.recuperacao ? "recuperação" : p.passo + 1,
        tpsAlvo: p.tps,
        tpsEnviado: Number((rp.length / dur).toFixed(1)),
        tpsConfirmado: Number((conf / dur).toFixed(1)),
        enviadas: rp.length,
        confirmadas: ok.length,
        errosEnvio: rp.filter((r) => r.status === "erro_envio").length,
        semConfirmacao: rp.filter((r) => r.status === "sem_confirmacao").length,
        revertidas: rp.filter((r) => r.status === "revertida").length,
        p50ms: lat.p50, p95ms: lat.p95, p99ms: lat.p99,
    };
});

console.log("\n================ RESULTADO POR DEGRAU ================");
console.table(tabela);

const escalada = tabela.filter((t) => t.degrau !== "recuperação");
const p95Base = escalada[0]?.p95ms ?? 0;
// Saturado = erros, transações sem confirmação, latência p95 acima do limite absoluto ou 3x a do primeiro degrau,
// ou vazão confirmada abaixo de 75% do alvo (a vazão por degrau oscila +-1 bloco; por isso o limiar folgado
// e a recomendação de PASSO_S >= 30).
const saturado = (t: any) =>
    t.errosEnvio > 0 || t.semConfirmacao > 0 ||
    (t.p95ms ?? 0) > LIMITE_P95_MS || (p95Base > 0 && (t.p95ms ?? 0) > 3 * p95Base) ||
    t.tpsConfirmado < 0.75 * t.tpsAlvo;
const primeiroSaturado = escalada.find(saturado);
console.log(primeiroSaturado
    ? `Primeiro sinal de saturação: degrau ${primeiroSaturado.degrau} (alvo ${primeiroSaturado.tpsAlvo} tx/s, confirmado ${primeiroSaturado.tpsConfirmado} tx/s, p95 ${primeiroSaturado.p95ms} ms).`
    : "Nenhum degrau mostrou saturação pelos critérios (erros, latência, vazão).");
const maiorSustentado = [...escalada].reverse().find((t) => !saturado(t));
console.log(maiorSustentado ? `Maior taxa sustentada sem problemas: ${maiorSustentado.tpsAlvo} tx/s.` : "Nenhum degrau foi sustentado sem problemas.");

const base = escalada[0];
const rec = tabela[tabela.length - 1];
if (base?.p95ms && rec?.p95ms !== undefined) {
    const recuperou = rec.p95ms <= 2 * base.p95ms && rec.semConfirmacao === 0 && rec.errosEnvio === 0;
    console.log(`Recuperação: p95 do primeiro degrau = ${base.p95ms} ms | p95 na recuperação = ${rec.p95ms} ms -> ${recuperou ? "RECUPEROU" : "NÃO recuperou por completo (ou ainda drenando a fila)"}.`);
}

const esperado = BigInt(regs.filter((r) => r.status === "ok").length);
const confere = totalDepois - totalAntes === esperado;
console.log("\nCONSISTÊNCIA: prontuários antes", totalAntes.toString(), "| depois", totalDepois.toString(),
    "| confirmados pelo teste", esperado.toString(), "|", confere ? "CONFERE" : "DIVERGE");
console.log("Erros por tipo:", contarErros(regs));
console.log("Blocos:", estatisticasDeBlocos(vigia.blocos));

gravarResultados("estresse", {
    configuracao: { TPS_INICIAL, TPS_PASSO, TPS_MAX, PASSO_S, LIMITE_ERRO, MAX_PENDENTES, RECUP_TPS, RECUP_S, rpcA: cfg.rpcUrlA, rpcB: cfg.rpcUrlB },
    motivoParada, degraus: tabela, consistencia: { totalAntes, totalDepois, confirmados: esperado, confere },
}, regs, inicio);
process.exit(0);