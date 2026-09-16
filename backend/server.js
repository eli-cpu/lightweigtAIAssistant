import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import databaseRoutes from "./routes/database.route.js";
import authRoutes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";

dotenv.config();
const app = express();

app.use(cors()); // allows cross-origin requests from the frontend to the backend
app.use(express.json()); // allows us to parse JSON bodies in requests
app.use(cookieParser()); // allows us to parse cookies in requests

app.use("/database", databaseRoutes);
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);

app.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
});
