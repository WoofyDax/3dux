#!/usr/bin/env node
/**
 * Copies MediaPipe WASM from node_modules to public/mediapipe/wasm
 * and downloads .task model files for offline build.
 * Run before build: npm run setup-mediapipe && npm run build
 */

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_MEDIAPIPE = path.join(ROOT, "public", "mediapipe");
const WASM_SRC = path.join(ROOT, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const WASM_DST = path.join(PUBLIC_MEDIAPIPE, "wasm");

const MODELS = [
  {
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    file: "face_landmarker.task",
  },
  {
    url: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    file: "hand_landmarker.task",
  },
];

function copyDirSync(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn("WARN: " + src + " not found. Run npm install first.");
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) {
      copyDirSync(s, d);
    } else {
      fs.copyFileSync(s, d);
      console.log("Copied " + name + " -> " + path.relative(ROOT, d));
    }
  }
}

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          return download(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(PUBLIC_MEDIAPIPE, { recursive: true });

  console.log("Copying MediaPipe WASM from node_modules...");
  copyDirSync(WASM_SRC, WASM_DST);

  for (const { url, file } of MODELS) {
    const outPath = path.join(PUBLIC_MEDIAPIPE, file);
    if (fs.existsSync(outPath)) {
      console.log("Exists: " + file + " (skip download)");
      continue;
    }
    console.log("Downloading " + file + "...");
    try {
      const buf = await download(url);
      fs.writeFileSync(outPath, buf);
      console.log("Saved " + file);
    } catch (e) {
      console.warn("WARN: Could not download " + file + ": " + e.message);
      console.warn("Download manually and put in public/mediapipe/: " + url);
    }
  }

  console.log("MediaPipe setup done. Run: npm run build");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
