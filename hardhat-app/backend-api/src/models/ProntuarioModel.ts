import { Schema, model } from "mongoose";

export interface IProntuarioOffChain {
  idProntuario: string;
  idPacienteHash: string;
  dadosCifradosLocal: string;
  dekCifradaLocal: string;
  ivLocal: string;
  hashConteudo: string;
  instituicaoDona: string;
  dataCriacao?: Date;
}

const ProntuarioSchema = new Schema<IProntuarioOffChain>(
    {
        idProntuario: { type: String, required: true, unique: true },
        idPacienteHash: { type: String, required: true },
        dadosCifradosLocal: { type: String, required: true },
        dekCifradaLocal: { type: String, required: true },
        ivLocal: { type: String, required: true },
        hashConteudo: { type: String, required: true },
        instituicaoDona: { type: String, required: true },
    },
    { timestamps: true }
);

export const ProntuarioModel = model<IProntuarioOffChain>("Prontuario", ProntuarioSchema);