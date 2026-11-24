"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const prontuarioController_js_1 = require("./controllers/prontuarioController.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post("/api/prontuarios", prontuarioController_js_1.cadastrarProntuario);
app.post("/api/prontuarios/solicitar-acesso", prontuarioController_js_1.solicitarAcesso);
app.get("/api/prontuarios/estatisticas/:idProntuario", prontuarioController_js_1.obterEstatisticas);
app.get("/api/prontuarios/busca-paciente/:idPacienteHash", prontuarioController_js_1.buscaPorPaciente);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
//# sourceMappingURL=index.js.map