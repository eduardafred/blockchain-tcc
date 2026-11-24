import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function env(nome: string, padrao?: string): string {
    const v = process.env[nome] ?? padrao;
    if (v === undefined || v === "") {
        console.error(`Variável ${nome} não encontrada no .env`);
        process.exit(1);
    }
    return v;
}

// ---------------------------------------------------------------------------
// Configuração (tudo pode ser sobrescrito pelo .env)
// ---------------------------------------------------------------------------
export const cfg = {
    rpcUrlA: env("RPC_URL_A", "http://localhost:8546"),       // Besu Direto Nó 1
    rpcUrlB: env("RPC_URL_B", "http://localhost:8550"),       // Besu Direto Nó 2          // Besu direto (ou EthSigner, se quiser medir o salto extra)
    contrato: env("CONTRACT_ADDRESS"),
    abiPath: env("ABI_PATH", path.resolve(__dirname, "../artifacts/contracts/HealthAuditRegistry.sol/HealthAuditRegistry.json")),
    pkA: env("PRIVATE_KEY_INSTITUICAO_A"),
    pkB: env("PRIVATE_KEY_INSTITUICAO_B"),
    gasLimit: BigInt(env("GAS_LIMIT", "1500000")),
    gasPrice: BigInt(env("GAS_PRICE_WEI", "0")),              // 0 = rede sem custo de gas
    pollMs: Number(env("POLL_MS", "200")),                    // intervalo de consulta de novos blocos
    confirmTimeoutMs: Number(env("CONFIRM_TIMEOUT_MS", "60000")),
    tentativasEnvio: Number(env("TENTATIVAS_ENVIO", "2")),
};

// ---------------------------------------------------------------------------
// Registro de cada operação
// ---------------------------------------------------------------------------
export interface Registro {
    tipo: "escrita" | "leitura";
    conta: string;
    passo: number;
    aquecimento: boolean;
    t0: number;
    idProntuario?: string;
    hash?: string;
    submitMs?: number;      // escrita: tempo até o nó aceitar a transação
    latMs?: number;         // escrita: envio -> aparece em bloco | leitura: duração do eth_call
    confirmadoEm?: number;
    bloco?: number;
    gas?: number;
    bytes?: number;
    status?: "ok" | "revertida" | "erro_envio" | "sem_confirmacao" | "erro_leitura";
    erro?: string;
}

export function novoRegistro(tipo: "escrita" | "leitura", conta: string, passo = 0, aquecimento = false): Registro {
    return { tipo, conta, passo, aquecimento, t0: performance.now() };
}

export function mensagemErro(e: any): string {
    return String(e?.error?.message || e?.info?.error?.message || e?.shortMessage || e?.message || e);
}

export function classificarErro(msg: string): string {
    const m = msg.toLowerCase();
    if (m.includes("nonce")) return "nonce";
    if (m.includes("underpriced") || m.includes("gas price")) return "preco_gas";
    if (m.includes("timeout") || m.includes("econn") || m.includes("fetch") || m.includes("socket")) return "rede_timeout";
    if (m.includes("full") || m.includes("pool") || m.includes("limit")) return "pool_cheio_ou_limite";
    if (m.includes("revert")) return "revert";
    return msg.slice(0, 80);
}

export class Conta {
    signer: any;
    address: string;
    nonce = 0;
    constructor(public nome: string, pk: string, public provider: any) {
        this.signer = new ethers.Wallet(pk);   
        this.address = this.signer.address;
    }
    async sincronizar() {
        this.nonce = await this.provider.getTransactionCount(this.address, "pending");
    }
    proximoNonce() {
        return this.nonce++;
    }
}

export async function criarContexto() {
    const providerA = new ethers.JsonRpcProvider(cfg.rpcUrlA, undefined, {
        staticNetwork: true, batchMaxCount: 1, cacheTimeout: -1,
    });

    const providerB = new ethers.JsonRpcProvider(cfg.rpcUrlB, undefined, {
        staticNetwork: true, batchMaxCount: 1, cacheTimeout: -1,
    });

    const abi = JSON.parse(fs.readFileSync(cfg.abiPath, "utf-8")).abi;
    const iface = new ethers.Interface(abi);
    const contrato = new ethers.Contract(cfg.contrato, abi, providerA);
    const rede = await providerA.getNetwork();

    const contas = [
        new Conta("instituicaoA", cfg.pkA, providerA),
        new Conta("instituicaoB", cfg.pkB, providerB),
    ];
    return { provider: providerA, abi, iface, contrato, chainId: rede.chainId, contas };
}

export type Contexto = Awaited<ReturnType<typeof criarContexto>>;

export const hashPaciente = (runId: string, n: number) => ethers.id(`${runId}-pac-${n}`);

export function dadosCadastro(ctx: Contexto, runId: string, seq: number) {
    const id = `LOAD-${runId}-${seq}`;
    const data = ctx.iface.encodeFunctionData("cadastrarProntuario", [
        id,
        hashPaciente(runId, seq % 500),
        ethers.id(id),
        20 + (seq % 70),
        seq % 2 ? "M" : "F",
        "Sul",
        "I10",
    ]);
    return { id, data };
}

export async function preflight(ctx: Contexto): Promise<bigint> {
    const bloco = await ctx.provider.getBlockNumber();
    const codigo = await ctx.provider.getCode(cfg.contrato);
    if (codigo === "0x") throw new Error("Nenhum contrato no endereço CONTRACT_ADDRESS.");

    const role = await ctx.contrato.INSTITUICAO_ROLE();
    for (const c of ctx.contas) {
        if (!(await ctx.contrato.hasRole(role, c.address))) {
            throw new Error(`${c.nome} (${c.address}) não possui INSTITUICAO_ROLE.`);
        }
        await c.sincronizar();
    }

    const total: bigint = await ctx.contrato.getTotalProntuarios();
    const { data } = dadosCadastro(ctx, "preflight" + Date.now().toString(36), 1);
    const gas = await ctx.provider.estimateGas({ from: ctx.contas[0].address, to: cfg.contrato, data, gasPrice: cfg.gasPrice });

    console.log(`Rede: chainId ${ctx.chainId}, bloco atual ${bloco}`);
    console.log(`Contrato: ${cfg.contrato} (prontuários já cadastrados: ${total})`);
    console.log(`Gas estimado para um cadastro: ${gas} (limite usado nos testes: ${cfg.gasLimit})`);
    if (gas > cfg.gasLimit) throw new Error("GAS_LIMIT menor que o gas estimado; aumente no .env.");

    // Teto teórico de escrita: quantos cadastros cabem em um bloco e quantos blocos por segundo a rede produz.
    const ultimo = await ctx.provider.getBlock("latest");
    if (ultimo) {
        const txsPorBloco = Number(ultimo.gasLimit / gas);
        let linha = `Limite de gas do bloco: ${ultimo.gasLimit} -> cabem ~${txsPorBloco} cadastros por bloco`;
        if (ultimo.number >= 10) {
            const ref = await ctx.provider.getBlock(ultimo.number - 10);
            const periodo = ref ? (ultimo.timestamp - ref.timestamp) / 10 : 0;
            if (periodo > 0) linha += ` | período de bloco ~${periodo.toFixed(1)}s -> teto teórico ~${(txsPorBloco / periodo).toFixed(0)} tx/s`;
        }
        console.log(linha);
    }
    return total;
}

export class VigiaDeBlocos {
    ultimo = -1;
    ativo = false;
    vistos = new Map<string, { bloco: number; em: number }>();
    esperando = new Map<string, (v: { bloco: number; em: number }) => void>();
    blocos: { numero: number; ts: number; txs: number; em: number }[] = [];

    constructor(private provider: any, private pollMs: number) {}

    async iniciar() {
        this.ultimo = await this.provider.getBlockNumber();
        this.ativo = true;
        void this.loop();
    }

    parar() {
        this.ativo = false;
    }

    private async loop() {
        while (this.ativo) {
            try {
                const n = await this.provider.getBlockNumber();
                for (let b = this.ultimo + 1; b <= n; b++) {
                    const blk = await this.provider.getBlock(b);
                    if (!blk) break;
                    const em = performance.now();
                    this.blocos.push({ numero: b, ts: blk.timestamp, txs: blk.transactions.length, em });
                    for (const h of blk.transactions as string[]) {
                        const info = { bloco: b, em };
                        this.vistos.set(h, info);
                        const resolver = this.esperando.get(h);
                        if (resolver) {
                            resolver(info);
                            this.esperando.delete(h);
                        }
                    }
                    this.ultimo = b;
                }
            } catch {

            }
            await sleep(this.pollMs);
        }
    }

    aguardar(hash: string, timeoutMs: number): Promise<{ bloco: number; em: number } | null> {
        const ja = this.vistos.get(hash);
        if (ja) return Promise.resolve(ja);
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                this.esperando.delete(hash);
                resolve(null);
            }, timeoutMs);
            this.esperando.set(hash, (info) => {
                clearTimeout(timer);
                resolve(info);
            });
        });
    }
}

async function preencherLacuna(ctx: Contexto, conta: Conta, nonce: number) {
    try {
        const tx = await conta.signer.signTransaction({
            to: conta.address, nonce, gasLimit: 21000n, gasPrice: cfg.gasPrice,
            chainId: ctx.chainId, type: 0, value: 0n,
        });
        await conta.provider.send("eth_sendRawTransaction", [tx]);
    } catch { /* melhor esforço */ }
}

export async function enviarCadastro(ctx: Contexto, vigia: VigiaDeBlocos, conta: Conta, reg: Registro, runId: string, seq: number) {
    const { id, data } = dadosCadastro(ctx, runId, seq);
    reg.idProntuario = id;

    const nonce = conta.proximoNonce();
    const assinada = await conta.signer.signTransaction({
        to: cfg.contrato, data, nonce, gasLimit: cfg.gasLimit, gasPrice: cfg.gasPrice,
        chainId: ctx.chainId, type: 0, value: 0n,
    });
    const hash = ethers.keccak256(assinada);
    reg.hash = hash;

    const t1 = performance.now();
    let ultimoErro = "";
    for (let tent = 0; tent <= cfg.tentativasEnvio; tent++) {
        try {
            await conta.provider.send("eth_sendRawTransaction", [assinada]);
            ultimoErro = "";
            break;
        } catch (e) {
            const msg = mensagemErro(e);
            if (/already known|known transaction/i.test(msg)) { ultimoErro = ""; break; }
            ultimoErro = msg;
            await sleep(100 * (tent + 1));
        }
    }
    reg.submitMs = performance.now() - t1;

    if (ultimoErro) {
        reg.status = "erro_envio";
        reg.erro = classificarErro(ultimoErro);
        await preencherLacuna(ctx, conta, nonce);
        return;
    }

    const visto = await vigia.aguardar(hash, cfg.confirmTimeoutMs);
    if (!visto) {
        reg.status = "sem_confirmacao";
        return;
    }
    reg.latMs = visto.em - t1;
    reg.confirmadoEm = visto.em;
    reg.bloco = visto.bloco;
    reg.status = "ok";
}

export async function lerBusca(ctx: Contexto, reg: Registro, pacienteHash: string) {
    const data = ctx.iface.encodeFunctionData("buscarProntuariosPorPaciente", [pacienteHash]);
    const t1 = performance.now();
    try {
        const out: string = await ctx.provider.call({ from: ctx.contas[0].address, to: cfg.contrato, data });
        reg.latMs = performance.now() - t1;
        reg.bytes = (out.length - 2) / 2;
        reg.status = "ok";
    } catch (e) {
        reg.latMs = performance.now() - t1;
        reg.status = "erro_leitura";
        reg.erro = classificarErro(mensagemErro(e));
    }
}

export function gerador(tps: number, acao: () => void) {
    let acc = 0;
    let ultimo = performance.now();
    const iv = setInterval(() => {
        const agora = performance.now();
        acc += (tps * (agora - ultimo)) / 1000;
        ultimo = agora;
        const n = Math.floor(acc);
        acc -= n;
        for (let i = 0; i < n; i++) acao();
    }, 50);
    return () => clearInterval(iv);
}


async function emLotes<T>(itens: T[], n: number, fn: (x: T) => Promise<void>) {
    let i = 0;
    await Promise.all(Array.from({ length: n }, async () => {
        while (i < itens.length) await fn(itens[i++]);
    }));
}

export async function verificarRecibos(ctx: Contexto, regs: Registro[]) {
    const alvo = regs.filter((r) => r.tipo === "escrita" && r.status === "ok" && r.hash);
    await emLotes(alvo, 20, async (r) => {
        try {
            const rec = await ctx.provider.getTransactionReceipt(r.hash!);
            if (!rec) return;
            r.gas = Number(rec.gasUsed);
            if (rec.status === 0) { r.status = "revertida"; r.erro = "revert"; }
        } catch { 

         }
    });
}

export function estat(v: number[]) {
    if (!v.length) return { n: 0 };
    const s = [...v].sort((a, b) => a - b);
    const p = (q: number) => s[Math.min(s.length - 1, Math.max(0, Math.ceil((q / 100) * s.length) - 1))];
    const r = (x: number) => Math.round(x);
    return {
        n: s.length, min: r(s[0]), p50: r(p(50)), p95: r(p(95)), p99: r(p(99)), max: r(s[s.length - 1]),
        media: r(s.reduce((a, b) => a + b, 0) / s.length),
    };
}

export function contarErros(regs: Registro[]) {
    const m: Record<string, number> = {};
    for (const r of regs) if (r.erro) m[r.erro] = (m[r.erro] ?? 0) + 1;
    return m;
}

export function estatisticasDeBlocos(blocos: { ts: number; txs: number }[]) {
    if (blocos.length < 2) return { blocos: blocos.length };
    const intervalo = (blocos[blocos.length - 1].ts - blocos[0].ts) / (blocos.length - 1);
    const txs = blocos.map((b) => b.txs);
    return {
        blocos: blocos.length,
        intervaloMedioS: Number(intervalo.toFixed(2)),
        txsPorBlocoMedia: Number((txs.reduce((a, b) => a + b, 0) / txs.length).toFixed(1)),
        txsPorBlocoMax: Math.max(...txs),
    };
}

export function gravarResultados(prefixo: string, resumo: any, regs: Registro[], inicio: number) {
    const dir = path.resolve(__dirname, "resultados");
    fs.mkdirSync(dir, { recursive: true });
    const base = path.join(dir, `${prefixo}-${new Date().toISOString().replace(/[:.]/g, "-")}`);

    fs.writeFileSync(base + ".json", JSON.stringify(resumo, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));

    const linhas = ["tipo,conta,passo,aquecimento,t_inicio_s,submit_ms,lat_ms,bloco,gas,bytes,status,erro,id"];
    for (const r of regs) {
        linhas.push([
            r.tipo, r.conta, r.passo, r.aquecimento, ((r.t0 - inicio) / 1000).toFixed(3),
            r.submitMs?.toFixed(1) ?? "", r.latMs?.toFixed(1) ?? "", r.bloco ?? "", r.gas ?? "", r.bytes ?? "",
            r.status ?? "pendente", (r.erro ?? "").replace(/,/g, ";"), r.idProntuario ?? "",
        ].join(","));
    }
    fs.writeFileSync(base + ".csv", linhas.join("\n"));
    console.log(`\nResultados gravados em:\n  ${base}.json\n  ${base}.csv`);
}