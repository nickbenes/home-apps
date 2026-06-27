import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CONFIG_PATH = path.join(os.homedir(), '.config', 'home-apps', 'walmart', 'api-config.json');
const KEYS_DIR = path.join(os.homedir(), '.config', 'home-apps', 'walmart', 'keys');
const AFFIL_BASE = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2';

interface EnvConfig { consumerId: string; keyVersion: string; privateKeyFile: string; }
interface ApiConfigFile { environment: 'staging' | 'production'; staging: EnvConfig; production: EnvConfig; }

export interface WalmartProduct {
  itemId: string;
  name: string;
  price: number;
  imageUrl: string;
  url: string;
  availabilityStatus: string;
  size: string;
  packCount: number;
}

function loadConfig(): EnvConfig {
  if (!fs.existsSync(CONFIG_PATH)) throw new Error('Walmart API config not found');
  const file: ApiConfigFile = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  return file[file.environment];
}

function buildAuthHeaders(consumerId: string, keyVersion: string, privateKeyFile: string): Record<string, string> {
  const keyPath = path.join(KEYS_DIR, privateKeyFile);
  if (!fs.existsSync(keyPath)) throw new Error(`Private key not found: ${keyPath}`);
  const privateKey = fs.readFileSync(keyPath, 'utf-8');
  const timestamp = String(Date.now());
  const payload = `${consumerId}\n${timestamp}\n${keyVersion}\n`;
  const signer = crypto.createSign('SHA256');
  signer.update(payload);
  const signature = signer.sign(privateKey, 'base64');
  return {
    'WM_SEC.KEY_VERSION': keyVersion,
    'WM_CONSUMER.ID': consumerId,
    'WM_CONSUMER.INTIMESTAMP': timestamp,
    'WM_SEC.AUTH_SIGNATURE': signature,
    'WM_SVC.NAME': 'Walmart Open API',
    'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
    'Accept': 'application/json',
  };
}

// Retail packs are commonly described as "4 Count", "6-pack", "12 ct", etc.,
// either in the dedicated size field or trailing the product name. Falls back
// to 1 (single unit) when no pack count can be found.
const PACK_COUNT_PATTERN = /(\d+)\s*-?\s*(?:ct|count|pack|pk)\b/i;

export function parsePackCount(size: string, name: string): number {
  const match = PACK_COUNT_PATTERN.exec(size) ?? PACK_COUNT_PATTERN.exec(name);
  if (!match) return 1;
  const count = parseInt(match[1], 10);
  return count > 0 ? count : 1;
}

function normalizeProduct(item: Record<string, unknown>): WalmartProduct {
  const name = String(item.name ?? '');
  const size = String(item.size ?? '');
  return {
    itemId: String(item.itemId ?? item.usItemId ?? ''),
    name,
    price: Number(item.salePrice ?? item.msrp ?? 0),
    imageUrl: String(item.thumbnailImage ?? item.largeImage ?? ''),
    url: String(item.productUrl ?? `https://www.walmart.com/ip/${item.itemId}`),
    availabilityStatus: item.availableOnline ? 'Available' : 'Unavailable',
    size,
    packCount: parsePackCount(size, name),
  };
}

export async function searchWalmart(query: string, limit = 5): Promise<WalmartProduct[]> {
  const config = loadConfig();
  const headers = buildAuthHeaders(config.consumerId, config.keyVersion, config.privateKeyFile);
  const url = new URL(AFFIL_BASE + '/search');
  url.searchParams.set('query', query);
  url.searchParams.set('numItems', String(Math.min(limit, 25)));
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Walmart search failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json() as { items?: Record<string, unknown>[] };
  return (data.items ?? []).map(normalizeProduct);
}

export function buildCartUrl(items: { itemId: string; quantity: number }[]): string {
  const itemsParam = items.map(i => `${i.itemId}:${i.quantity}`).join(',');
  return `https://affil.walmart.com/cart/addToCart?items=${itemsParam}`;
}
