// sajile-backend/tools/syncToFrontendRoot.js
// Node.js script: copy backend_url.json dari sajile-backend -> project root
// Gunakan dengan: node syncToFrontendRoot.js (dari folder manapun)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendFile = path.resolve(__dirname, '..', 'backend_url.json');
const frontendTarget = path.resolve(__dirname, '..', '..', 'backend_url.json');

function syncOnce() {
  try {
    if (!fs.existsSync(backendFile)) {
      console.warn(`[sync] ❌ backend_url.json not found at: ${backendFile}`);
      console.log('[sync] Make sure ngrokWatcher or backend server has created it.');
      return false;
    }

    const raw = fs.readFileSync(backendFile, 'utf8');
    
    // Validate JSON
    try {
      JSON.parse(raw);
    } catch (parseErr) {
      console.error('[sync] ❌ Invalid JSON in backend_url.json:', parseErr.message);
      return false;
    }

    fs.writeFileSync(frontendTarget, raw, { encoding: 'utf8' });
    console.log(`[sync] ✅ Synced backend_url.json`);
    console.log(`       From: ${backendFile}`);
    console.log(`       To:   ${frontendTarget}`);
    return true;
  } catch (err) {
    console.error('[sync] ❌ Error syncing backend_url.json:', err.message);
    return false;
  }
}

// Run once
const success = syncOnce();
process.exit(success ? 0 : 1);