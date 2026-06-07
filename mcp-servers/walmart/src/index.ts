#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadApiConfig, WalmartClient } from "./client.js";

const server = new Server(
  { name: "walmart-local", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "status",
      description: "Check Walmart API config and connectivity",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "search",
      description: "Search Walmart products by query string",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term (e.g. 'whole milk gallon')" },
          limit: { type: "number", description: "Max results to return (default 10, max 25)" },
        },
        required: ["query"],
      },
    },
    {
      name: "get_item",
      description: "Get details for a specific Walmart product by item ID",
      inputSchema: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "Walmart item ID" },
        },
        required: ["item_id"],
      },
    },
    {
      name: "add_to_cart",
      description: "Add a Walmart product to the cart by item ID",
      inputSchema: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "Walmart item ID from search results" },
          quantity: { type: "number", description: "Quantity (default 1)" },
        },
        required: ["item_id"],
      },
    },
    {
      name: "view_cart",
      description: "View current Walmart cart contents and totals",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "remove_from_cart",
      description: "Remove a product from the Walmart cart by item ID",
      inputSchema: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "Walmart item ID to remove" },
        },
        required: ["item_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = (args ?? {}) as Record<string, any>;

  try {
    switch (name) {
      case "status": {
        try {
          const config = loadApiConfig();
          return ok(
            `Walmart API configured\nEnvironment: ${config.environment}\nConsumer ID: ${config.consumerId}\nKey version: ${config.keyVersion}\nKey file: ${config.privateKeyFile}`
          );
        } catch (e) {
          return ok(`Not configured: ${(e as Error).message}`);
        }
      }

      case "search": {
        const client = requireClient();
        const limit = Math.min(a.limit ?? 10, 25);
        const products = await client.search(a.query, limit);
        if (products.length === 0) return ok("No results found.");
        const lines = products.map(
          (p, i) => `${i + 1}. [${p.itemId}] ${p.name} — $${p.price.toFixed(2)} (${p.availabilityStatus})\n   ${p.url}`
        );
        return ok(lines.join("\n"));
      }

      case "get_item": {
        const client = requireClient();
        const p = await client.getItem(a.item_id);
        return ok(`[${p.itemId}] ${p.name}\nPrice: $${p.price.toFixed(2)}\nStatus: ${p.availabilityStatus}\n${p.url}`);
      }

      case "add_to_cart":
      case "view_cart":
      case "remove_from_cart": {
        const client = requireClient();
        if (name === "add_to_cart") await client.addToCart(a.item_id, a.quantity ?? 1);
        else if (name === "view_cart") await client.viewCart();
        else await client.removeFromCart(a.item_id);
        return ok("Done.");
      }

      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
});

function requireClient(): WalmartClient {
  const config = loadApiConfig();
  return new WalmartClient(config);
}

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function err(text: string) {
  return { content: [{ type: "text" as const, text: `Error: ${text}` }] };
}

const transport = new StdioServerTransport();
await server.connect(transport);
