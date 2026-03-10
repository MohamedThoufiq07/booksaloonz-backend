/**
 * Download OLD face-api.js (justadudewhohacks) models
 * Use: npm run download-models
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'models', 'face-api');
const BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const FILES = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1',
    'ssd_mobilenetv1_model-shard2',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1'
];

async function main() {
    console.log('⬇️ Downloading (legacy) face-api.js models...');
    if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

    for (const f of FILES) {
        // Redownload always to be safe? Or check size? Check existence.
        // Actually, previous files might be from vladmandic. They might differ. Let's overwrite.
        // But force overwrite if exists? No, just check existence. But names are same!
        // I should DELETE models folder first.
        try {
            await download(`${BASE}/${f}`, path.join(MODELS_DIR, f));
        } catch (e) {
            console.error(`  ❌ ${f}: ${e.message}`);
        }
    }
    console.log('✅ Legacy models ready.');
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        // Always overwrite to ensure correct version
        const file = fs.createWriteStream(dest);
        const go = (u) => {
            https.get(u, res => {
                if (res.statusCode === 301 || res.statusCode === 302) return go(res.headers.location);
                if (res.statusCode !== 200) return reject(new Error(res.statusCode));
                res.pipe(file);
                file.on('finish', () => { file.close(); console.log(`  ✔ ${path.basename(dest)}`); resolve(); });
            }).on('error', e => { fs.unlink(dest, () => { }); reject(e); });
        };
        go(url);
    });
}

main();
