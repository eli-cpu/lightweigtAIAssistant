import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import databaseRoutes from "./routes/database.route.js";
import llmRoutes from "./routes/llm.route.js";
import authRoutes from "./routes/auth.route.js";

dotenv.config();
const app = express();

app.use(cors()); // allows cross-origin requests from the frontend to the backend
app.use(express.json()); // allows us to parse JSON bodies in requests
app.use(cookieParser()); // allows us to parse cookies in requests

app.use("/database", databaseRoutes);
app.use("/llm", llmRoutes);
app.use("/auth", authRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running on port " + (process.env.PORT || 3000));
});
