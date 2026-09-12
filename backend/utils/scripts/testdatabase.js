import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const privateKey = process.env.SUPABASE_SECRET_KEY;
if (!privateKey) throw new Error(`Expected env var SUPABASE_SECRET_KEY`);
const url = process.env.SUPABASE_URL;
if (!url) throw new Error(`Expected env var SUPABASE_URL`);
const supabase = createClient(url, privateKey);

const messages = [
  {
    role: "system",
    content: "You are a helpful assistant.",
  },
];

const data = {
  id: 1,
  name: "Testing",
  messages,
};

await supabase.from("chats").insert(data);
