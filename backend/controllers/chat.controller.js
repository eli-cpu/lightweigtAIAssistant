import dotenv from "dotenv";
import { generateCompletion } from "../utils/lllmConfig.js";
import { supabase } from "../utils/supabaseConfig.js";

dotenv.config();

export const createNewChat = async (req, res) => {
  const { messages } = req.body;
  const namingMessages = [
    ...messages,
    {
      role: "user",
      content:
        "Summarize the conversation and return only a short name. No intro or outro.",
    },
  ];
  const [completion, answer] = await Promise.all([
    generateCompletion(namingMessages),
    generateCompletion(messages),
  ]);

  const name = completion.content;
  const assistantMessage = answer;
  console.log("Assistant message:", assistantMessage);

  const { data, error } = await supabase
    .from("chats")
    .insert([
      {
        user_id: req.user.id,
        messages: [...messages, assistantMessage],
        name,
      },
    ])
    .select("id, name, messages")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ data });
};

export const getChatCompletion = async (req, res) => {
  try {
    const { id } = req.query;
    const { messages } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Chat ID is required" });
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Messages must be an array",
      });
    }

    const { data: chat, error: fetchError } = await supabase
      .from("chats")
      .select("user_id, messages")
      .eq("id", id)
      .maybeSingle();

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (String(chat.user_id) !== String(req.user.id)) {
      return res.status(403).json({
        error: "Unauthorized to update this chat",
      });
    }
    const existingMessages = Array.isArray(chat.messages) ? chat.messages : [];
    const response = await generateCompletion([
      ...existingMessages,
      ...messages,
    ]);
    const updatedMessages = [...existingMessages, ...messages, response];
    const { data, error: updateError } = await supabase
      .from("chats")
      .update({
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("id, name, messages, updated_at")
      .single();

    if (updateError) throw updateError;

    console.log("Response from generateCompletion:", response);
    console.log("Updated chat data:", data);

    return res.status(200).json({
      message: "Chat history updated successfully",
      chat: response,
    });
  } catch (error) {
    console.error("Error generating response:", error);
    return res.status(500).json({ error: "Failed to generate response" });
  }
};
