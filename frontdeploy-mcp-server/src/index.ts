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
        name: "fast_launch_token",
        description: "Deploy a new meme coin using Frontdeploy's fast launch system. Prompts the user to sign a Phantom transaction via a local bridge.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Token name" },
            ticker: { type: "string", description: "Token ticker symbol (e.g., $MCOIN)" },
            description: { type: "string", description: "Token description" },
            image_path: { type: "string", description: "Absolute path to the local image file (drag and drop the image into chat to get this path)." },
            website: { type: "string", description: "Website URL (optional)" },
            twitter: { type: "string", description: "Twitter URL (optional)" },
            telegram: { type: "string", description: "Telegram URL (optional)" },
            dev_buy_amount: { type: "number", description: "Amount of SOL to buy immediately (e.g., 0.1). Defaults to 0." },
            slippage: { type: "number", description: "Slippage percentage for dev buy (e.g., 5). Defaults to 5." },
            priority_fee: { type: "number", description: "Priority fee in SOL (e.g., 0.0005). Defaults to 0.0005." },
          },
          required: ["name", "ticker", "description", "image_path", "dev_buy_amount", "slippage"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "fast_launch_token") {
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
            text: `Fast Launch prepared for ${name} (${ticker})!\n\nMetadata has been uploaded to IPFS: ${metadataUri}\n\nPlease click the link below to open the Phantom Bridge in your browser and sign the transactions:\n\n[Open Phantom Bridge](file://${bridgeHtmlPath})`
          }
        ]
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error during fast launch preparation: ${err.message}`
          }
        ],
        isError: true
      };
    }
  }

  throw new Error("Tool not found");
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
