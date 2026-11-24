import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import { cadastrarProntuario, obterEstatisticas, buscaPorPaciente, solicitarAcesso, concederAcesso, decifrarEnvelope, obterEstatisticasPorCid } from "./controllers/prontuarioController.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.post("/api/prontuarios/cadastrar", cadastrarProntuario);
app.post("/api/prontuarios/solicitar-acesso", solicitarAcesso);
app.post("/api/prontuarios/conceder-acesso", concederAcesso);
app.post("/api/prontuarios/processar-envelope", decifrarEnvelope);
app.get("/api/prontuarios/busca-paciente/:idPacienteHash", buscaPorPaciente);

app.get("/api/prontuarios/estatisticas/", obterEstatisticas);
app.get("/api/prontuarios/estatisticas/:cid", obterEstatisticasPorCid);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});