#!/usr/bin/env tsx
/**
 * One-time session bootstrap. Run with: npm run bootstrap
 *
 * Instructions:
 *   1. Log into walmart.com in your real browser
 *   2. Open DevTools → Network tab → check "Preserve log"
 *   3. Search for any grocery item (e.g. "milk")
 *   4. Find the search XHR request in the network panel
 *   5. Right-click it → Copy → Copy as cURL (bash)
 *   6. Paste it when prompted below
 */

import readline from "readline";
import { saveSession, sessionPath } from "./session.js";

function parseCurl(raw: string): { cookies: string; headers: Record<string, string> } {
  const cookies: string[] = [];
  const headers: Record<string, string> = {};

  // Match -H 'Name: Value' or -H "Name: Value"
  const headerRe = /-H\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(raw)) !== null) {
    const colonIdx = m[1].indexOf(": ");
    if (colonIdx === -1) continue;
    const name = m[1].slice(0, colonIdx).toLowerCase();
    const value = m[1].slice(colonIdx + 2);
    if (name === "cookie") {
      // Collect full cookie string
      cookies.push(value);
    } else if (name !== "content-length") {
      headers[name] = value;
    }
  }

  // Also match --cookie 'val' form
  const cookieRe = /--cookie\s+['"]([^'"]+)['"]/g;
  while ((m = cookieRe.exec(raw)) !== null) {
    cookies.push(m[1]);
  }

  return {
    cookies: cookies.join("; "),
    headers,
  };
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("=== Walmart MCP Session Bootstrap ===\n");
  console.log("Paste the cURL command from your browser (end with a blank line):\n");

  const lines: string[] = [];
  for await (const line of rl) {
    if (line.trim() === "" && lines.length > 0) break;
    lines.push(line);
  }
  rl.close();

  const raw = lines.join("\n");
  if (!raw.includes("walmart.com")) {
    console.error("Error: cURL does not appear to be from walmart.com");
    process.exit(1);
  }

  const { cookies, headers } = parseCurl(raw);
  if (!cookies) {
    console.error("Error: no Cookie header found in the cURL command");
    process.exit(1);
  }

  const session = { cookies, headers, savedAt: new Date().toISOString() };
  saveSession(session);

  const cookieCount = cookies.split(";").length;
  console.log(`\nSaved ${cookieCount} cookies and ${Object.keys(headers).length} headers`);
  console.log(`Session stored at: ${sessionPath()}`);
  console.log("\nRun `claude mcp list` to verify the walmart-local server is connected.");
}

main().catch((e) => { console.error(e); process.exit(1); });
