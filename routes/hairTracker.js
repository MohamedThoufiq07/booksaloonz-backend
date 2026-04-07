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

router.post("/analyze-hair", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No image file provided."
            });
        }

        console.log(`\n--- New Analysis Request (Vision Analysis) ---`);
        
        // Analyze features directly from image buffer using Gemini Vision
        const analysis = await detectGenderAndFeatures(req.file.buffer);
        
        if (!analysis.success) {
            let errorMsg = "Analysis failed. Please try again with a clearer photo.";
            if (analysis.error === "not_a_face") {
                errorMsg = "Please upload a correct picture of a person's face. We couldn't detect a human face in your image.";
            } else if (analysis.error === "vision_not_configured") {
                errorMsg = "AI Vision is not fully configured (Missing Google Gemini Key). Please contact the developer.";
            } else if (analysis.error === "analysis_error") {
                errorMsg = "The AI encountered an error analyzing this specific image. Please try another photo.";
            }

            return res.status(400).json({
                success: false,
                error: errorMsg
            });
        }

        const features = {
            gender: analysis.gender || req.body.gender || "male",
            faceShape: analysis.faceShape || req.body.faceShape || "Oval",
            hairType: analysis.hairType || req.body.hairType || "Wavy",
            hairDensity: analysis.hairDensity || req.body.hairDensity || "Medium"
        };

        console.log("Features identified by AI:", features);

        // Get hairstyle choices based on identified features
        let hairstyles = await generateHairstyleGrid(features);

        if (!hairstyles || hairstyles.length === 0) {
            console.log("⚠️ Results empty after logic. Triggering emergency UI fallback...");
            hairstyles = await getHairstyleSuggestions({ ...features, forceFallback: true });
        }

        console.log(`✅ ${hairstyles.length} hairstyles ready for display.`);

        res.json({
            success: true,
            features,
            hairstyles: hairstyles || []
        });

    } catch (error) {
        console.error("❌ Fatal Route Error:", error.message);
        res.status(500).json({
            success: false,
            error: "The hair analysis session failed. Using local style recommendations.",
            hairstyles: [] // Frontend will handle empty or backend will have fallback
        });
    }
});

module.exports = router;
