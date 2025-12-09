// File: saji-backend/utils/ngrokWatcher.js
import fs from "fs";
import axios from "axios";
import path from "path";

const NGROK_API = "http://127.0.0.1:4040/api/tunnels";

// Simpan file di folder backend, bukan di luar
const STORAGE_FILE = path.join(__dirname, "..", "backend_url.json");

async function updateNgrokUrl() {
    try {
        const res = await axios.get(NGROK_API);
        const tunnels = res.data.tunnels;

        const httpsTunnel = tunnels.find(t => t.proto === "https");
        if (!httpsTunnel) {
            console.log("⚠ Tidak ada tunnel HTTPS ngrok!");
            return;
        }

        const newUrl = httpsTunnel.public_url;

        let oldUrl = null;
        if (fs.existsSync(STORAGE_FILE)) {
            oldUrl = JSON.parse(fs.readFileSync(STORAGE_FILE)).url;
        }

        if (newUrl !== oldUrl) {
            console.log(`🔄 URL Ngrok berubah! ➡ Baru: ${newUrl}`);

            fs.writeFileSync("../backend_url.json", JSON.stringify({ url: newUrl }, null, 2));
            fs.writeFileSync("../../backend_url.json", JSON.stringify({ url: newUrl }, null, 2));

            console.log("💾 URL DIUPDATE → backend_url.json");
        } else {
            console.log("✔ URL sama. Tidak ada perubahan.");
        }

    } catch (err) {
        console.error("❌ Error mengambil URL Ngrok:", err.message);
    }
}

setInterval(updateNgrokUrl, 3000);

console.log("🚀 ngrokWatcher aktif memantau URL...");
