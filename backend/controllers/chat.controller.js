import dotenv from "dotenv";
import { generateCompletion, generateStreamCompletion } from "../utils/lllmConfig.js";
import { supabase } from "../utils/supabaseConfig.js";

dotenv.config();

export const createNewChat = async (req, res) => {
  const { messages } = req.body;
  const namingMessages = [
    ...messages,
    {
      role: "user",
      content:
        "Summarize the conversation and return only a short name. No intro or outro. Max 30 chars.",
    },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Start generating name in the background
    const namePromise = generateCompletion(namingMessages).catch(() => ({ content: "New Chat" }));

    // Create chat in DB immediately to get an ID
    const { data: chatData, error } = await supabase
      .from("chats")
      .insert([
        {
          user_id: req.user.id,
          messages: messages,
          name: "Generating...",
        },
      ])
      .select("id, name, messages")
      .single();

    if (error) throw error;

    // Send initial chat info to frontend
    res.write(`data: ${JSON.stringify({ type: "chat_info", chat: chatData })}\n\n`);

    // Start streaming completion
    const stream = await generateStreamCompletion(messages);
    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);
      }
    }

    // Wait for the name generation to finish
    const nameCompletion = await namePromise;
    const name = nameCompletion.content.replace(/["']/g, '');

    // Update DB with final messages and name
    await supabase
      .from("chats")
      .update({
        messages: [...messages, { role: "model", content: fullResponse }],
        name: name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatData.id);

    // Send final name update
    res.write(`data: ${JSON.stringify({ type: "name_update", name })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Stream error in createNewChat:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    res.end();
  }
};

export const getChatCompletion = async (req, res) => {
  try {
    const { id } = req.query;
    const { messages } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Chat ID is required" });
    }
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages must be an array" });
    }

    const { data: chat, error: fetchError } = await supabase
      .from("chats")
      .select("user_id, messages")
      .eq("id", id)
      .maybeSingle();

    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (String(chat.user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const existingMessages = Array.isArray(chat.messages) ? chat.messages : [];
    const stream = await generateStreamCompletion([
      ...existingMessages,
      ...messages,
    ]);

    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);
      }
    }

    const updatedMessages = [
      ...existingMessages,
      ...messages,
      { role: "model", content: fullResponse },
    ];

    await supabase
      .from("chats")
      .update({
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Stream error in getChatCompletion:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate response" });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
      res.end();
    }
  }
};
