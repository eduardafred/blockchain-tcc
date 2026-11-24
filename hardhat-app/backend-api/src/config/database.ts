import mongoose from "mongoose";

export const connectDB = async () => {
    try{
        const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/prontuarios";
        await mongoose.connect(mongoURI);
        console.log("Conectado ao MongoDB");
    } catch (error) {
        console.error("Erro ao conectar ao MongoDB:", error);
        process.exit(1);
    }
};