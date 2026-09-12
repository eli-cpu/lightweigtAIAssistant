import express from "express";

import {
  getID_ChatNames,
  getChatHistory,
  createNewChat,
  deleteChat,
  updateChatName,
  updateChatHistory,
} from "../controllers/database.controller.js";

const router = express.Router();

router.get("/chats", getID_ChatNames);
router.get("/chats/:id", getChatHistory);
router.post("/chats", createNewChat);
router.delete("/chats/:id", deleteChat);
router.put("/chats/:id/name", updateChatName);
router.put("/chats/:id/history", updateChatHistory);

export default router;
