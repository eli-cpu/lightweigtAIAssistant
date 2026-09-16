import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";

import {
  getChatCompletion,
  createNewChat,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/completion", protectRoute, getChatCompletion);
router.post("/new", protectRoute, createNewChat);

export default router;
