// File: saji-backend/utils/getPublicUrl.js
const fs = require("fs");
const path = require("path");

function getPublicBackendURL() {
    try {
        const filePath = path.join(__dirname, "..", "backend_url.json");
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);

        if (!data.url) throw new Error("backend_url.json tidak punya field url");

        return data.url;
    } catch (err) {
        console.error("❌ Gagal membaca backend_url.json:", err.message);
        return process.env.PUBLIC_BACKEND_URL; // fallback
    }
}

module.exports = { getPublicBackendURL };
