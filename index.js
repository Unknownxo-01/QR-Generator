#!/usr/bin/env node
/**
 * QR Code Generator
 * ------------------
 * Type ANYTHING — an email, a Facebook link, a GitHub link, any URL,
 * or plain text — and it will automatically be turned into a QR code.
 *
 * Usage:
 *   node index.js
 *      -> interactive mode, keeps asking for input until you type "exit"
 *
 *   node index.js "someone@example.com"
 *   node index.js "https://github.com/torvalds"
 *      -> one-shot mode, generates a single QR code and exits
 */

const readline = require("readline");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

const OUTPUT_DIR = path.join(__dirname, "qrcodes");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ---------- Detect the type of input and format it correctly ----------
function detectAndFormat(raw) {
  const input = raw.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(input)) {
    return { type: "Email", value: `mailto:${input}`, label: input };
  }

  // Already a full URL
  if (/^https?:\/\//i.test(input)) {
    return { type: detectPlatform(input), value: input, label: input };
  }

  // Common social/dev platforms typed without protocol,
  // e.g. "facebook.com/username", "github.com/username", "linkedin.com/in/xyz"
  if (/^(www\.)?[\w-]+\.[a-z]{2,}(\/\S*)?$/i.test(input)) {
    const withProtocol = `https://${input}`;
    return { type: detectPlatform(withProtocol), value: withProtocol, label: withProtocol };
  }

  // Bare "facebook", "github", "instagram" etc with a handle, e.g. "github:torvalds"
  const handleMatch = input.match(/^(facebook|fb|github|instagram|ig|twitter|x|linkedin|youtube|tiktok)[:\s]+(.+)$/i);
  if (handleMatch) {
    const platform = handleMatch[1].toLowerCase();
    const handle = handleMatch[2].trim();
    const urls = {
      facebook: `https://facebook.com/${handle}`,
      fb: `https://facebook.com/${handle}`,
      github: `https://github.com/${handle}`,
      instagram: `https://instagram.com/${handle}`,
      ig: `https://instagram.com/${handle}`,
      twitter: `https://twitter.com/${handle}`,
      x: `https://x.com/${handle}`,
      linkedin: `https://linkedin.com/in/${handle}`,
      youtube: `https://youtube.com/${handle}`,
      tiktok: `https://tiktok.com/@${handle}`,
    };
    const url = urls[platform];
    return { type: detectPlatform(url), value: url, label: url };
  }

  // Fallback: treat as plain text
  return { type: "Text", value: input, label: input };
}

function detectPlatform(url) {
  const lower = url.toLowerCase();
  if (lower.includes("facebook.com")) return "Facebook Link";
  if (lower.includes("github.com")) return "GitHub Link";
  if (lower.includes("instagram.com")) return "Instagram Link";
  if (lower.includes("linkedin.com")) return "LinkedIn Link";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "Twitter/X Link";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YouTube Link";
  if (lower.includes("tiktok.com")) return "TikTok Link";
  return "URL";
}

function safeFileName(str) {
  return str.replace(/[^a-z0-9]/gi, "_").slice(0, 50);
}

// ---------- Generate the QR code (PNG file + terminal preview) ----------
async function generateQR(raw) {
  const { type, value, label } = detectAndFormat(raw);
  const fileName = `${safeFileName(label)}_${Date.now()}.png`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  await QRCode.toFile(filePath, value, {
    width: 400,
    margin: 2,
  });

  const terminalQR = await QRCode.toString(value, { type: "terminal", small: true });

  console.log("\n----------------------------------------");
  console.log(`Detected type : ${type}`);
  console.log(`Encoded value : ${value}`);
  console.log(`Saved image   : ${filePath}`);
  console.log("----------------------------------------\n");
  console.log(terminalQR);

  return filePath;
}

// ---------- Interactive mode ----------
function startInteractive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("=== QR Code Generator ===");
  console.log("Type an email, a Facebook/GitHub/Instagram/etc. link, any URL, or plain text.");
  console.log('Type "exit" to quit.\n');

  const ask = () => {
    rl.question("Enter value: ", async (answer) => {
      if (!answer.trim()) return ask();
      if (answer.trim().toLowerCase() === "exit") {
        rl.close();
        return;
      }
      try {
        await generateQR(answer);
      } catch (err) {
        console.error("Error generating QR code:", err.message);
      }
      ask();
    });
  };

  ask();
}

// ---------- Entry point ----------
const arg = process.argv.slice(2).join(" ");
if (arg) {
  generateQR(arg).catch((err) => {
    console.error("Error generating QR code:", err.message);
    process.exit(1);
  });
} else {
  startInteractive();
}
