import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  baseURL: process.env.OLLAMA_URL,
  apiKey: "ollama",
});

export const generateCompletion = async (messages) => {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OLLAMA_MODEL,
      messages,
    });

    return response.choices[0].message;
  } catch (error) {
    console.error("Error generating response:", error);
    return res.status(500).json({ error: "Failed to generate response" });
  }
};
