/**
 * Face Analysis Service
 * Uses face-api.js (original) with TensorFlow.js 1.7.4
 * Uses @napi-rs/canvas (loadImage fix)
 */

// Load TensorFlow.js (Pure JS backend)
const tf = require('@tensorflow/tfjs');

// Load face-api.js
const faceapi = require('face-api.js');

// Load Canvas and patch environment
const ncanvas = require('@napi-rs/canvas');
const { Canvas, Image, ImageData } = ncanvas;
faceapi.env.monkeyPatch({
    Canvas,
    Image,
    ImageData,
    createCanvasElement: () => ncanvas.createCanvas(1, 1),
    createImageElement: () => new ncanvas.Image()
});

const path = require('path');
const fs = require('fs');

let modelsLoaded = false;
const MODELS_DIR = path.join(__dirname, '..', 'models', 'face-api');

async function loadModels() {
    if (modelsLoaded) return;

    if (!fs.existsSync(MODELS_DIR)) {
        fs.mkdirSync(MODELS_DIR, { recursive: true });
    }

    const manifest = path.join(MODELS_DIR, 'ssd_mobilenetv1_model-weights_manifest.json');
    if (!fs.existsSync(manifest)) {
        throw new Error('Models missing. Run "npm run download-models"');
    }

    try {
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_DIR);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_DIR);
        modelsLoaded = true;
        console.log('✅ Face-API models loaded.');
    } catch (err) {
        console.error('❌ Model load failed:', err.message);
        throw err;
    }
}

async function detectFace(buffer) {
    if (!modelsLoaded) await loadModels();

    // Use loadImage from @napi-rs/canvas
    const img = await ncanvas.loadImage(buffer);

    // Create canvas manually
    const canvas = ncanvas.createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const detection = await faceapi.detectSingleFace(canvas).withFaceLandmarks();
    return detection || null;
}

function classifyFaceShape(landmarks) {
    const p = landmarks.positions;
    const d = (i, j) => Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y);

    const foreheadW = d(17, 26);
    const cheekboneW = d(1, 15);
    const jawlineW = d(4, 12);

    // Face Length
    const midX = (p[19].x + p[24].x) / 2;
    const midY = (p[19].y + p[24].y) / 2;
    const nbY = p[27].y;
    const fhTopY = midY - (nbY - midY) * 0.8;
    const faceLen = Math.hypot(p[8].x - midX, p[8].y - fhTopY);

    // Ratios
    const w_l = cheekboneW / faceLen;
    const f_j = foreheadW / jawlineW;
    const c_f = cheekboneW / foreheadW;
    const c_j = cheekboneW / jawlineW;

    const chinAngle = calculateAngle(p[4], p[8], p[12]);

    const s = { Oval: 0, Round: 0, Square: 0, Heart: 0, Diamond: 0, Oblong: 0 };

    // Oval: Balanced, length > width, smooth jaw
    if (w_l < 0.82) s.Oval += 4;
    else if (w_l < 0.88) s.Oval += 2;
    if (Math.abs(f_j - 1.0) < 0.15) s.Oval += 2;
    if (c_f < 1.12 && c_j < 1.12) s.Oval += 2;

    // Round: Width is high compared to length
    if (w_l > 0.88) s.Round += 4;
    if (chinAngle > 150) s.Round += 2;

    // Square: Strong jaw, wide forehead
    if (Math.abs(f_j - 1.0) < 0.10 && chinAngle > 140) s.Square += 5;
    if (w_l > 0.85) s.Square += 1;

    // Heart: Broad forehead, narrow lower face
    if (f_j > 1.25) s.Heart += 5;
    if (chinAngle < 125) s.Heart += 2;

    // Diamond: Exaggerated cheekbone width
    if (c_f > 1.25) s.Diamond += 3;
    if (c_j > 1.25) s.Diamond += 3;
    if (w_l < 0.90) s.Diamond += 1;

    // Oblong: Length is significantly greater than width
    if (w_l < 0.72) s.Oblong += 6;
    else if (w_l < 0.78) s.Oblong += 2;
    if (Math.abs(f_j - 1.0) < 0.10) s.Oblong += 1;

    let best = "Oval", max = 0;
    for (const [k, v] of Object.entries(s)) {
        if (v > max) { max = v; best = k; }
    }

    // Improved confidence based on leading score
    const confidence = Math.min(99, Math.round((max / 7) * 100));

    return {
        faceShape: best,
        confidence: Math.min(confidence, 98),
        measurements: {
            foreheadWidth: Math.round(foreheadW),
            cheekboneWidth: Math.round(cheekboneW),
            jawlineWidth: Math.round(jawlineW),
            faceLength: Math.round(faceLen),
            widthToLength: +w_l.toFixed(2),
            chinAngle: Math.round(chinAngle)
        }
    };
}

function calculateAngle(a, b, c) {
    const ab = Math.hypot(b.x - a.x, b.y - a.y);
    const bc = Math.hypot(b.x - c.x, b.y - c.y);
    const ac = Math.hypot(c.x - a.x, c.y - a.y);
    const cosB = (ab * ab + bc * bc - ac * ac) / (2 * ab * bc);
    return Math.acos(Math.max(-1, Math.min(1, cosB))) * (180 / Math.PI);
}

async function analyzeface(buffer) {
    try {
        const result = await detectFace(buffer);
        if (!result) return { success: false, error: 'NO_FACE', message: 'No face detected.' };
        const shape = classifyFaceShape(result.landmarks);

        const box = result.detection.box;
        return {
            success: true,
            faceShape: shape.faceShape,
            confidence: shape.confidence,
            measurements: shape.measurements,
            boundingBox: {
                x: Math.round(box.x),
                y: Math.round(box.y),
                width: Math.round(box.width),
                height: Math.round(box.height)
            }
        };
    } catch (e) {
        console.error("Pipeline Error:", e);
        throw e;
    }
}

module.exports = { loadModels, analyzeface };
