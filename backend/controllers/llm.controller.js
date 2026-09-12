import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "http://192.168.168.105:11434/v1/",
  apiKey: "ollama",
});

export const generateResponse = async (req, res) => {
  console.log("Received request body:", req.body);
  const { messages } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: "llama3.2",
      messages: messages,
    });

    return res.status(200).json({ response: response.choices[0].message });
  } catch (error) {
    console.error("Error generating response:", error);
    return res.status(500).json({ error: "Failed to generate response" });
  }
};
