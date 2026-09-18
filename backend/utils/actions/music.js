const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

function isYouTubeUrl(value) {
  try {
    const url = new URL(value);
    return ["youtube.com", "www.youtube.com", "youtu.be"].includes(
      url.hostname,
    );
  } catch {
    return false;
  }
}

export async function downloadMusic(url, outputDir = "./downloads") {
  if (!isYouTubeUrl(url)) {
    throw new Error("A valid YouTube URL is required.");
  }

  await fs.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const args = [
      "--no-playlist",
      "--restrict-filenames",
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "--no-progress",
      "--print",
      "after_move:filepath",
      "-o",
      path.join(outputDir, "%(title)s.%(ext)s"),
      url,
    ];

    const process = spawn("yt-dlp", args);
    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("error", (error) => {
      reject(new Error(`Could not start yt-dlp: ${error.message}`));
    });

    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        return;
      }

      const filePath = stdout.trim().split("\n").filter(Boolean).pop();

      resolve({
        filePath,
        message: "Music downloaded successfully.",
      });
    });
  });
}
