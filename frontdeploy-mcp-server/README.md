# Frontdeploy MCP Server

Standalone Model Context Protocol (MCP) server that enables AI assistants (like Claude Desktop) to trigger "Fast Launch" token deployments on Solana via Pump.fun. 

This server acts as a bridge, allowing the AI to construct token metadata from local images and spawn a secure local web environment for you to sign Phantom transactions manually. No private keys or `.env` configuration required!

## 🚀 Features

- **Zero-Configuration:** Plug and play. No API keys or environment variables needed.
- **Direct Pump.fun IPFS:** Uses the native Pump.fun IPFS upload endpoints directly, ensuring 100% parity with standard token launches.
- **Local HTML Bridge:** Generates an ephemeral HTML file locally in your browser. This isolates transaction signing to your browser environment using your existing Phantom wallet extension.
- **RPC Fallback System:** Uses high-tier `Helius` RPC by default, automatically falling back to standard `Mainnet Beta` if rate limits are hit.

## 🛠️ Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Build the Project:**
   ```bash
   npm run build
   ```

3. **Register with Claude Desktop:**
   Edit your Claude Desktop config file to include this MCP server.
   
   - **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

   Add the following snippet to your configuration:
   ```json
   {
     "mcpServers": {
       "frontdeploy": {
         "command": "npx",
         "args": [
           "-y",
           "frontdeploy-mcp-server"
         ]
       }
     }
   }
   ```
   *(Catatan: Anda harus memastikan paket sudah ter-publish ke npm global jika ingin menggunakan perintah di atas di komputer lain, atau gunakan path absolut ke script lokal jika hanya berjalan lokal)*

4. **Restart Claude Desktop**

## 💡 How to Use

Once registered and restarted, Claude will have access to the `fast_launch_token` tool. 

Simply drag and drop an image into the Claude chat and say something like:
> "Deploy token baru menggunakan gambar ini, dengan ticker $PEPE, dev buy 0.1 SOL, dan slippage 5%"

Claude will read the local image path, upload the metadata to IPFS, and provide you with a secure, clickable link. Clicking the link will open the Phantom Bridge in your browser for you to review and sign the deployment transactions.
