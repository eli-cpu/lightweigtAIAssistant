import OpenAI from "openai";
import dotenv from "dotenv";
import getFunctions from "./getFunctions.js";
import { getAgentSystemPrompt } from "./prompts/AgentSystemPrompt.js";

dotenv.config();

const openai = new OpenAI({
  baseURL: process.env.OLLAMA_URL,
  apiKey: "ollama",
});

export async function runAgent({
  userQuery,
  retrievedDocuments = [],
  conversationHistory = [],
}) {
  const actions = await getFunctions();
  const actionMap = new Map(actions.map((action) => [action.name, action.fn]));

  const messages = [
    {
      role: "system",
      content: getAgentSystemPrompt({
        userQuery,
        retrievedDocuments,
        conversationHistory,
      }),
    },
    ...conversationHistory,
    { role: "user", content: userQuery },
  ];

  for (let step = 0; step < 8; step += 1) {
    const response = await openai.chat.completions.create({
      model: process.env.OLLAMA_MODEL,
      messages,
      tools: actions.map((action) => action.tool),
      tool_choice: "auto",
    });

    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage;
    }

    for (const toolCall of assistantMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const action = actionMap.get(functionName);

      if (!action) {
        throw new Error(`Function not found: ${functionName}`);
      }

      try {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        const result = await action(...Object.values(args));

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ success: true, result }),
        });
      } catch (error) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            success: false,
            error: error.message,
          }),
        });
      }
    }
  }

  throw new Error("Maximum agent execution steps exceeded.");
}

export const generateCompletion = async (messages) => {
  const response = await openai.chat.completions.create({
    model: process.env.OLLAMA_MODEL,
    messages,
  });

  return response.choices[0].message;
};

export const generateStreamCompletion = async (messages) =>
  openai.chat.completions.create({
    model: process.env.OLLAMA_MODEL,
    messages,
    stream: true,
  });
