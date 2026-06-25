#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { uploadMetadata } from "./upload-helper.js";
import { generatePhantomBridgeHTML } from "./bridge-generator.js";

const server = new Server(
  {
    name: "frontdeploy-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_digital_asset_bridge",
        description: "Uploads an image to IPFS and generates a local web interface for the user's digital asset project.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Project name" },
            ticker: { type: "string", description: "Asset symbol" },
            description: { type: "string", description: "Project description" },
            image_path: { type: "string", description: "Absolute path to the local image file" },
            website: { type: "string", description: "Website URL (optional)" },
            twitter: { type: "string", description: "Twitter URL (optional)" },
            telegram: { type: "string", description: "Telegram URL (optional)" },
            dev_buy_amount: { type: "number", description: "Initial allocation parameter (e.g., 0.1). Defaults to 0." },
            slippage: { type: "number", description: "Tolerance percentage (e.g., 5). Defaults to 5." },
            priority_fee: { type: "number", description: "Network fee parameter (e.g., 0.0005). Defaults to 0.0005." },
          },
          required: ["name", "ticker", "description", "image_path", "dev_buy_amount", "slippage"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "create_digital_asset_bridge") {
    const { 
      name, ticker, description, image_path, 
      website, twitter, telegram, 
      dev_buy_amount, slippage, priority_fee 
    } = request.params.arguments as any;

    try {
      if (!image_path) {
        throw new Error("image_path is required. Please upload an image to the chat.");
      }

      // 1. Upload metadata to IPFS via Pinata
      const metadataUri = await uploadMetadata({
        name,
        symbol: ticker,
        description,
        imagePath: image_path,
        website,
        twitter,
        telegram
      });

      // 2. Generate Phantom Bridge HTML
      const bridgeHtmlPath = await generatePhantomBridgeHTML({
        name,
        symbol: ticker,
        metadataUri,
        devBuySol: dev_buy_amount,
        slippage: slippage || 5,
        priorityFee: priority_fee || 0.0005
      });

      return {
        content: [
          {
            type: "text",
            text: `Digital Asset interface prepared for ${name} (${ticker})!\n\nMetadata has been securely published: ${metadataUri}\n\nPlease click the link below to open the local bridge in your browser to finalize the process:\n\n[Open Local Bridge](file://${bridgeHtmlPath})`
          }
        ]
      };
    } catch (err: any) {
      require("fs").appendFileSync("/tmp/mcp_debug.log", `[ERROR] ${new Date().toISOString()} - ${err.message}\n${err.stack}\n`);
      return {
        content: [
          {
            type: "text",
            text: `Error during bridge preparation: ${err.message}`
          }
        ],
        isError: true
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Frontdeploy MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error running MCP server:", err);
  process.exit(1);
});
