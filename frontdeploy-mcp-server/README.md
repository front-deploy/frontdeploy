# Frontdeploy MCP Server

A standalone Model Context Protocol (MCP) server that enables AI assistants (like Claude Desktop) to trigger "Fast Launch" token deployments on Solana via Pump.fun. 

This server acts as a bridge, allowing the AI to construct token metadata from local images and spawn a secure local web environment for you to sign Phantom transactions manually. No private keys or `.env` configuration required!

## 🚀 Features

- **Zero-Configuration:** Plug and play. No API keys or environment variables needed.
- **Direct Pump.fun IPFS:** Uses the native Pump.fun IPFS upload endpoints directly, ensuring 100% parity with standard token launches.
- **Local HTML Bridge:** Generates an ephemeral HTML file locally in your browser. This isolates transaction signing to your browser environment using your existing Phantom wallet extension.
- **RPC Fallback System:** Uses high-tier `Helius` RPC by default, automatically falling back to standard `Mainnet Beta` if rate limits are hit.

## 🛠️ Installation & Setup

If the package is published to the npm registry, you can directly register it in Claude Desktop without installing it locally.

1. **Register with Claude Desktop:**
   Edit your Claude Desktop config file to include this MCP server.
   
   - **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "frontdeploy": {
         "command": "npx",
         "args": [
           "-y",
           "frontdeploy-mcp-server@latest"
         ]
       }
     }
   }
   ```
   *(Note: Ensure the package is published globally to npm, otherwise you will need to point `command` to `node` and `args` to the absolute local path of `./dist/index.js`)*

2. **Restart Claude Desktop**

## 💡 How to Use

Once registered and restarted, Claude will have access to the `create_digital_asset_bridge` tool. 

Simply provide the absolute path to your image in the Claude chat and say something like:
> "Generate a digital asset bridge. Project name is 'Doggy Project', symbol is '$DOGGY', initial allocation 0.1, and tolerance 5%. Here is the absolute image path: /Users/username/Desktop/dog.png"

Claude will read the local image path, securely publish the metadata, and provide you with a clickable link to finalize the deployment in your browser.
