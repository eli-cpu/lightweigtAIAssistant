import { supabase } from "../utils/supabaseConfig.js";
import dotenv from "dotenv";
import { generateResponse } from "./llm.controller.js";

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
  const { id } = req.params;
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
  const id = (await getLargestChatId(req, res)) + 1;
  const messages = req.body.messages;
  const name = "New Chat"; // tbd: generate a name based on the first message in the chat history -> llm
  const { data, error } = await supabase.from("chats").insert([
    {
      id,
      user_id: req.user.id,
      messages,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ id });
};

export const deleteChat = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("chats").delete().eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200);
};

export const updateChatName = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const { data, error } = await supabase
    .from("chats")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200);
};

export const updateChatHistory = async (req, res) => {
  const { id } = req.params;
  const { messages } = req.body;
  const { data, error } = await supabase
    .from("chats")
    .update({ messages, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200);
};
