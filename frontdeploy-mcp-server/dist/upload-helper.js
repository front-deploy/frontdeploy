import fs from "fs";
import FormData from "form-data";
import axios from "axios";
export async function uploadMetadata(draft) {
    // Directly use Pump.fun's IPFS API as requested
    const imageStream = fs.createReadStream(draft.imagePath);
    const formData = new FormData();
    formData.append("file", imageStream, { filename: "image.png" });
    formData.append("name", draft.name);
    formData.append("symbol", draft.symbol);
    formData.append("description", draft.description);
    formData.append("showName", "true");
    if (draft.twitter)
        formData.append("twitter", draft.twitter);
    if (draft.telegram)
        formData.append("telegram", draft.telegram);
    if (draft.website)
        formData.append("website", draft.website);
    try {
        const res = await axios.post("https://pump.fun/api/ipfs", formData, {
            headers: formData.getHeaders()
        });
        return res.data.metadataUri;
    }
    catch (err) {
        console.error("[MCP] Pump.fun IPFS upload failed:", err.message);
        if (err.response?.data) {
            console.error("[MCP] Response error:", err.response.data);
        }
        throw new Error(`Pump.fun upload failed: ${err.message}`);
    }
}
