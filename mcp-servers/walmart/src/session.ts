import fs from "fs";
import os from "os";
import path from "path";

const SESSION_FILE = path.join(os.homedir(), ".config", "home-apps", "walmart", "session.json");

export interface WalmartSession {
  cookies: string;       // raw Cookie header value
  headers: Record<string, string>; // extra headers observed from browser
  savedAt: string;
}

export function loadSession(): WalmartSession | null {
  if (!fs.existsSync(SESSION_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function saveSession(session: WalmartSession): void {
  const dir = path.dirname(SESSION_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), { mode: 0o600 });
}

export function clearSession(): void {
  if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
}

export function sessionPath(): string {
  return SESSION_FILE;
}
