const AIHairReport = require('../models/AIHairReport');
const { detectGenderAndFeatures, generateHairstyleGrid } = require('../services/geminiService');
const { searchHairstyles } = require('../services/searchService');
const { analyzeface } = require('../services/faceAnalysisService');

/**
 * POST /api/ai/analyze
 * STRICT PROCESS:
 * 1. Analyze face to detect gender, shape, density, and texture
 * 2. Apply gender-specific prompt to Gemini Pro to generate 3x3 grid
 * 3. IF Gemini fails, trigger SEARCH FALLBACK (Unsplash / Web)
 * 4. Return results (No fallbacks allowed)
 */
exports.analyzeFaceAndHair = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

        // Check if Gemini API Key is available
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                success: false,
                message: 'AI Service is currently unavailable. Please check API configuration.'
            });
        }

        let reportData = {
            userId: req.user ? req.user.id : null,
            imageURL: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        };

        // INNER TRY for AI Business Logic (422 status)
        try {
            let analysis;
            try {
                // STEP 1: Detect Gender and analyze face features
                console.log("Step 1: Analyzing gender and face features...");
                analysis = await detectGenderAndFeatures(req.file.buffer, req.file.mimetype);
            } catch (initialError) {
                console.error("Initial Gemini analysis failed:", initialError.message);

                // FALLBACK: Use local Face-API for face shape if Gemini is busy
                if (initialError.message.includes("busy") || initialError.message.includes("loaded") || initialError.message.includes("429") || initialError.message.includes("timeout")) {
                    console.log("Triggering local fallback for face analysis...");
                    const localResult = await analyzeface(req.file.buffer);
                    if (localResult && localResult.success) {
                        analysis = {
                            gender: 'Unknown',
                            faceShape: localResult.faceShape,
                            hairDensity: 'Undetected',
                            hairTexture: 'Undetected',
                            reason: 'High-precision AI busy. Used local shape detection.',
                            fromFallback: true
                        };
                    } else {
                        throw initialError;
                    }
                } else {
                    throw initialError;
                }
            }

            reportData.faceShape = analysis.faceShape;
            reportData.gender = analysis.gender;
            reportData.hairDensity = analysis.hairDensity;
            reportData.hairTexture = analysis.hairTexture;
            reportData.explanation = analysis.reason;
            reportData.confidence = analysis.fromFallback ? 70 : 98;

            // STEP 2 & 3: Generate the Hairstyle Grid Image using Gemini
            let gridResult = { success: false };
            try {
                console.log(`Step 2 & 3: Generating strict ${reportData.gender} hairstyle grid (Gemini Pro)...`);
                gridResult = await generateHairstyleGrid(
                    req.file.buffer,
                    req.file.mimetype,
                    reportData.gender
                );
            } catch (geminiError) {
                console.error("Gemini Grid Generation Failed:", geminiError.message);
            }

            // STEP 4 & 5: Gemini Failure Handling & Web Search Fallback
            if (gridResult.success && gridResult.gridImageBase64 && gridResult.gridImageBase64.length > 500) {
                reportData.transformedImageURL = gridResult.gridImageBase64;
                reportData.fallbackSearchUsed = false;
            } else {
                console.log("⚠️ Step 4: Gemini failed. Triggering Step 5: Web Search Fallback...");
                const searchResults = await searchHairstyles(
                    analysis.faceShape,
                    analysis.hairDensity,
                    analysis.hairTexture,
                    analysis.gender
                );

                if (searchResults && searchResults.length > 0) {
                    reportData.fallbackImages = searchResults;
                    reportData.fallbackSearchUsed = true;
                    // No single transformedImageURL in fallback mode
                } else {
                    throw new Error("No hairstyle suggestions found. Please upload a clearer photo.");
                }
            }

            // Final safety check: If both failed, it's an error.
            if (!reportData.transformedImageURL && (!reportData.fallbackImages || reportData.fallbackImages.length === 0)) {
                throw new Error("No hairstyle suggestions found. Please upload a clearer photo.");
            }

            // Clear any static recommendations logic
            reportData.recommendations = [];

            // Save the report to DB
            const newReport = new AIHairReport(reportData);
            await newReport.save();

            res.status(200).json({
                success: true,
                report: newReport,
                treatmentSuggestions: analysis.gender === 'male'
                    ? ["Use scalp revitalizing tonic", "Scalp massage twice a week"]
                    : ["Apply heat protectant", "Deep conditioning every 15 days"],
                productRecommendations: analysis.gender === 'male'
                    ? ["Caffeine Shampoo", "Matt Wax"]
                    : ["Argan Oil", "Volume Mousse"]
            });

        } catch (analysisError) { // This catch handles errors that result in a 422 status
            console.error("AI processing failed:", analysisError.message);
            res.status(422).json({
                success: false,
                message: analysisError.message || 'No hairstyle suggestions found. Please upload a clearer photo.'
            });
        }

    } catch (error) { // This catch handles general server errors (500)
        console.error('AI Analysis Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during analysis' });
    }
};

/**
 * GET /api/ai/history
 */
exports.getHistory = async (req, res) => {
    try {
        const history = await AIHairReport.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
};
