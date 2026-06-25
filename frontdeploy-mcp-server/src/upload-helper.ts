import fs from "fs";
import FormData from "form-data";
import axios from "axios";

export interface MetadataDraft {
  name: string;
  symbol: string;
  description: string;
  imagePath: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export async function uploadMetadata(draft: MetadataDraft): Promise<string> {
  let finalImagePath = draft.imagePath;

  // Handle URL inputs by downloading to a temp file
  if (draft.imagePath.startsWith("http://") || draft.imagePath.startsWith("https://")) {
    const tmpPath = `/tmp/mcp_download_${Date.now()}.png`;
    const response = await axios({
      url: draft.imagePath,
      method: "GET",
      responseType: "stream"
    });
    
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tmpPath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
    
    finalImagePath = tmpPath;
  }

  const imageStream = fs.createReadStream(finalImagePath);
  const formData = new FormData();
  
  formData.append("file", imageStream, { filename: "image.png" });
  formData.append("name", draft.name);
  formData.append("symbol", draft.symbol);
  formData.append("description", draft.description);
  formData.append("showName", "true");
  
  if (draft.twitter) formData.append("twitter", draft.twitter);
  if (draft.telegram) formData.append("telegram", draft.telegram);
  if (draft.website) formData.append("website", draft.website);

  try {
    const res = await axios.post("https://pump.fun/api/ipfs", formData, {
      headers: formData.getHeaders()
    });

    return res.data.metadataUri;
  } catch (err: any) {
    console.error("[MCP] Pump.fun IPFS upload failed:", err.message);
    if (err.response?.data) {
      console.error("[MCP] Response error:", err.response.data);
    }
    throw new Error(`Pump.fun upload failed: ${err.message}`);
  }
}
