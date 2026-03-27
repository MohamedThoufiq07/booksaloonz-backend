const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
    detectGenderAndFeatures,
    generateHairstyleGrid,
    getHairCareRecommendations
} = require("../geminiClient");

// Multer configured for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Simple memory-based rate limit
let lastRequestTime = 0;

/**
 * POST /api/hairtracker/analyze-hair
 * Main endpoint for hair analysis and hairstyle generation
 */
router.post("/analyze-hair", upload.single("image"), async (req, res) => {
    try {
        // Rate limit — 10 second cooldown to prevent API spam
        const now = Date.now();
        if (now - lastRequestTime < 10000) {
            return res.status(429).json({
                success: false,
                error: "Please wait at least 10 seconds between analysis requests."
            });
        }
        lastRequestTime = now;

        // Validation
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No image file provided. Please upload a clear portrait photo."
            });
        }

        console.log(`\n--- New Analysis Request: ${req.file.originalname} ---`);

        // Step 1: Detect features using Groq (llama3-70b-8192)
        console.log("🔍 STEP 1: Detecting hair features...");
        const features = await detectGenderAndFeatures(
            req.file.buffer,
            req.file.mimetype
        );
        console.log("✅ Features:", JSON.stringify(features, null, 2));

        // Step 2: Generate hairstyle choices using Hugging Face (SDXL)
        console.log("🎨 STEP 2: Generating 9 hairstyle variants...");
        const hairstyleResult = await generateHairstyleGrid(
            req.file.buffer,
            req.file.mimetype,
            features.gender,
            features.faceShape
        );
        console.log(`✅ Hairstyles Generated: ${hairstyleResult.success ? hairstyleResult.hairstyles.length : 0}`);

        // Step 3: Get personalized hair care recommendations using Groq
        console.log("💆 STEP 3: Fetching hair care routine...");
        const hairCare = await getHairCareRecommendations(
            features.gender,
            features.faceShape,
            features.hairTexture,
            features.hairDensity
        );
        console.log("✅ Recommendations ready");

        // Return final consolidated response
        res.json({
            success: true,
            features,
            hairstyles: hairstyleResult.hairstyles || [],
            hairCare
        });

    } catch (error) {
        console.error("❌ Fatal Route Error:", error.message);
        res.status(500).json({
            success: false,
            error: "The hair analysis session failed to complete. Please try again later.",
            details: error.message
        });
    }
});

module.exports = router;
