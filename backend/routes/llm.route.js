import express from "express";

import { generateResponse } from "../controllers/llm.controller.js";

const router = express.Router();

router.post("/generate", generateResponse);

export default router;
