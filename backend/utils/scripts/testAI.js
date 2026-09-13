import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  baseURL: process.env.OLLAMA_URL,
  apiKey: "ollama", // required but ignored
});

const chatCompletion = await openai.chat.completions.create({
  messages: [{ role: "user", content: "Say this is a test" }],
  model: "gpt-oss:latest",
});

console.log(chatCompletion.choices[0].message.content);
