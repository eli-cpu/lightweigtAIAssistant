import { supabase } from "../utils/supabaseConfig.js";
import dotenv from "dotenv";
import { generateCompletion } from "./llm.controller.js";

dotenv.config();

// just getting the chat name and id from the database and not the history to save on bandwidth
export const getID_ChatNames = async (req, res) => {
  const { data, error } = await supabase.from("chats").select("id, name");
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
};

// needs id
export const getChatHistory = async (req, res) => {
  const { id } = req.query;
  const { data, error } = await supabase
    .from("chats")
    .select("id, name, messages")
    .eq("id", id);
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
};

const getLargestChatId = async (req, res) => {
  const { data, error } = await supabase
    .from("chats")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? 0;
};

export const createNewChat = async (req, res) => {
  // const id = (await getLargestChatId(req, res)) + 1;
  const { messages } = req.body;
  const namingMessages = [
    ...messages,
    {
      role: "user",
      content:
        "Summarize the conversation and return only a short name. No intro or outro.",
    },
  ];
  const completion = await generateCompletion(namingMessages); // tbd: testing
  const name = completion.content;
  const { data, error } = await supabase
    .from("chats")
    .insert([
      {
        user_id: req.user.id,
        messages,
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

export const deleteChat = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Chat ID is required" });
    }

    const { data: chat, error: fetchError } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.user_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this chat" });
    }

    const { data, error } = await supabase
      .from("chats")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      message: "Chat deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateChatName = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Chat ID is required" });
    }
    const { data: chat, error: fetchError } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.user_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to update this chat" });
    }

    const { name } = req.body;
    const { data, error } = await supabase
      .from("chats")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      message: "Chat updated successfully",
    });
  } catch (error) {
    console.error("Error updating chat:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateChatHistory = async (req, res) => {
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

    if (fetchError) throw fetchError;

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (String(chat.user_id) !== String(req.user.id)) {
      return res.status(403).json({
        error: "Unauthorized to update this chat",
      });
    }

    const existingMessages = Array.isArray(chat.messages) ? chat.messages : [];

    const updatedMessages = [...existingMessages, ...messages];

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

    return res.status(200).json({
      message: "Chat history updated successfully",
      chat: data,
    });
  } catch (error) {
    console.error("Error updating chat history:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};
