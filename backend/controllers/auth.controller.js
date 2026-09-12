import { generateTokenAndSetCookie } from "../utils/generateToken.js";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const privateKey = process.env.SUPABASE_SECRET_KEY;
if (!privateKey) throw new Error(`Expected env var SUPABASE_SECRET_KEY`);
const url = process.env.SUPABASE_URL;
if (!url) throw new Error(`Expected env var SUPABASE_URL`);
const supabase = createClient(url, privateKey);

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // const existingUser = await User.findOne({ username });
    const { data: existingUser, error: usernameError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (usernameError) throw usernameError;
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    // const existingEmail = await User.findOne({ email });
    const { data: existingEmail, error: emailError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (emailError) throw emailError;
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already taken" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      username,
      email,
      password: hashedPassword,
    };

    if (newUser) {
      generateTokenAndSetCookie(newUser.id, res);
      await supabase.from("users").insert(newUser);

      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      });
    } else {
      res.status(400).json({ error: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    // const user = await User.findOne({ username });
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user?.password || "",
    );

    if (!user || !isPasswordCorrect) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    generateTokenAndSetCookie(user._id, res);

    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie("jwlt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMe = async (req, res) => {
  try {
    // const user = await User.findById(req.user.id).select("-password");
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .maybeSingle();
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getMe controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
