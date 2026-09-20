import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function getFunctions() {
  const actionsPath = path.join(__dirname, "actions");

  const files = fs
    .readdirSync(actionsPath)
    .filter((file) => file.endsWith(".js"));

  const modules = await Promise.all(
    files.map(
      (file) => import(pathToFileURL(path.join(actionsPath, file)).href),
    ),
  );

  return modules.flatMap((module) =>
    Object.values(module).filter((value) => typeof value === "function"),
  );
}
