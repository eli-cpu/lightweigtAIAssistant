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

    return res.status(200).json({ response: response.choices[0].message });
  } catch (error) {
    console.error("Error generating response:", error);
    return res.status(500).json({ error: "Failed to generate response" });
  }
};

export const generateResponse = async (req, res) => {
  console.log("Received request body:", req.body);
  const { messages } = req.body;

  genrateCompletion(messages);
};
