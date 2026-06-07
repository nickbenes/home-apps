import fs from "fs";
import os from "os";
import path from "path";
import { buildAuthHeaders } from "./auth.js";

const CONFIG_PATH = path.join(os.homedir(), ".config", "home-apps", "walmart", "api-config.json");
const BASE_URL = "https://developer.api.walmart.com/api-proxy/service/affil/product/v2";

interface EnvConfig {
  consumerId: string;
  keyVersion: string;
  privateKeyFile: string;
}

interface ApiConfigFile {
  environment: "staging" | "production";
  staging: EnvConfig;
  production: EnvConfig;
}

export interface ResolvedConfig extends EnvConfig {
  environment: "staging" | "production";
}

export interface Product {
  itemId: string;
  name: string;
  price: number;
  imageUrl: string;
  url: string;
  availabilityStatus: string;
}

export function loadApiConfig(): ResolvedConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`API config not found at ${CONFIG_PATH}`);
  }
  const file: ApiConfigFile = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  return { environment: file.environment, ...file[file.environment] };
}

export class WalmartClient {
  private config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    this.config = config;
  }

  private authHeaders(): Record<string, string> {
    return buildAuthHeaders(this.config.consumerId, this.config.keyVersion, this.config.privateKeyFile);
  }

  private async get(endpointPath: string, params: Record<string, string> = {}): Promise<unknown> {
    const url = new URL(BASE_URL + endpointPath);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers: this.authHeaders() });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}\n${body}`);
    }
    return res.json();
  }

  async search(query: string, limit: number = 10): Promise<Product[]> {
    const data = await this.get("/search", {
      query,
      numItems: String(Math.min(limit, 25)),
    }) as any;
    const items: any[] = data?.items ?? [];
    return items.map(normalizeProduct);
  }

  async getItem(itemId: string): Promise<Product> {
    const data = await this.get(`/items/${itemId}`) as any;
    return normalizeProduct(data);
  }

  buildCartUrl(items: { itemId: string; quantity: number }[]): string {
    const param = items.map(i => `${i.itemId}:${i.quantity}`).join(',');
    return `https://affil.walmart.com/cart/addToCart?items=${param}`;
  }
}

function normalizeProduct(item: any): Product {
  return {
    itemId: String(item.itemId ?? item.usItemId ?? ""),
    name: item.name ?? "",
    price: item.salePrice ?? item.msrp ?? 0,
    imageUrl: item.thumbnailImage ?? item.largeImage ?? "",
    url: item.productUrl ?? `https://www.walmart.com/ip/${item.itemId}`,
    availabilityStatus: item.availableOnline ? "Available" : "Unavailable",
  };
}
