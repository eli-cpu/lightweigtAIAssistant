import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";

import {
  getID_ChatNames,
  getChatHistory,
  createNewChat,
  deleteChat,
  updateChatName,
  updateChatHistory,
} from "../controllers/database.controller.js";

const router = express.Router();

router.get("/chats", protectRoute, getID_ChatNames);
router.get("/chats/:id", protectRoute, getChatHistory);
router.post("/chats", protectRoute, createNewChat);
router.delete("/chats/", protectRoute, deleteChat);
router.put("/chats/name", protectRoute, updateChatName);
router.put("/chats/history", protectRoute, updateChatHistory);

export default router;
