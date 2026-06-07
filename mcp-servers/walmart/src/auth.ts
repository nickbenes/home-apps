import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const KEYS_DIR = path.join(os.homedir(), ".config", "home-apps", "walmart", "keys");

export function buildAuthHeaders(
  consumerId: string,
  keyVersion: string,
  privateKeyFile: string
): Record<string, string> {
  const keyPath = path.join(KEYS_DIR, privateKeyFile);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Private key not found at ${keyPath}`);
  }
  const privateKey = fs.readFileSync(keyPath, "utf-8");
  const timestamp = String(Date.now());

  // Walmart signature payload: consumerId + "\n" + timestamp + "\n" + keyVersion + "\n"
  const payload = `${consumerId}\n${timestamp}\n${keyVersion}\n`;
  const signer = crypto.createSign("SHA256");
  signer.update(payload);
  const signature = signer.sign(privateKey, "base64");

  return {
    "WM_SEC.KEY_VERSION": keyVersion,
    "WM_CONSUMER.ID": consumerId,
    "WM_CONSUMER.INTIMESTAMP": timestamp,
    "WM_SEC.AUTH_SIGNATURE": signature,
    "WM_SVC.NAME": "Walmart Open API",
    "WM_QOS.CORRELATION_ID": crypto.randomUUID(),
    "Accept": "application/json",
  };
}
