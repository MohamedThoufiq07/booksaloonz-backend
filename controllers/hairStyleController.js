const { detectGenderAndFeatures, generateHairstyleGrid } = require('../services/geminiService');
const { searchHairstyles } = require('../services/searchService');

/**
 * POST /api/hairstyle/analyze
 * STRICT PROCESS:
 * 1. Analyze face using Gemini Flash
 * 2. Generate 3x3 hairstyle grid using Gemini Pro
 * 3. IF Gemini fails, trigger SEARCH FALLBACK
 */
const analyzeFaceAndRecommend = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

        // STEP 1: Detect Gender and analyze face features
        console.log("Step 1 (Hairstyle AI): Analyzing face features...");
        const analysis = await detectGenderAndFeatures(req.file.buffer, req.file.mimetype);

        // STEP 2 & 3: Generate the Hairstyle Grid Image using Gemini
        let gridResult = { success: false };
        try {
            console.log(`Step 2 & 3 (Hairstyle AI): Generating ${analysis.gender} hairstyle grid (Gemini)...`);
            gridResult = await generateHairstyleGrid(
                req.file.buffer,
                req.file.mimetype,
                analysis.gender
            );
        } catch (geminiError) {
            console.error("Gemini Failure in Hairstyle AI:", geminiError.message);
        }

        let finalResponse = {
            success: true,
            faceShape: analysis.faceShape,
            hairDensity: analysis.hairDensity,
            hairTexture: analysis.hairTexture,
            confidence: 98,
            gender: analysis.gender,
            measurements: analysis.reason
        };

        // STEP 4 & 5: Handle Gemini Failure & Web Search Fallback
        if (gridResult.success && gridResult.gridImageBase64 && gridResult.gridImageBase64.length > 500) {
            finalResponse.transformedImageURL = gridResult.gridImageBase64;
            finalResponse.fallbackSearchUsed = false;
        } else {
            console.log("⚠️ Hairstyle AI triggering Step 5: Web Search Fallback...");
            const searchResults = await searchHairstyles(
                analysis.faceShape,
                analysis.hairDensity,
                analysis.hairTexture,
                analysis.gender
            );

            if (searchResults && searchResults.length > 0) {
                finalResponse.fallbackImages = searchResults;
                finalResponse.fallbackSearchUsed = true;
            } else {
                throw new Error("No hairstyle suggestions found. Please upload a clearer photo.");
            }
        }

        return res.status(200).json(finalResponse);

    } catch (error) {
        console.error('❌ Hair style analysis error:', error.message);
        return res.status(422).json({
            success: false,
            message: error.message || 'No hairstyle suggestions found. Please upload a clearer photo.'
        });
    }
};

/**
 * GET /api/hairstyle/shapes
 */
const getFaceShapes = (req, res) => {
    return res.status(200).json({
        success: true,
        shapes: {
            Oval: "Balanced proportions",
            Round: "Soft edges",
            Square: "Strong jaw",
            Heart: "Wide forehead",
            Diamond: "Prominent cheekbones"
        }
    });
};

/**
 * Static dummy endpoint
 */
const getRecommendationsByShape = (req, res) => {
    return res.status(200).json({
        success: true,
        recommendations: []
    });
};

module.exports = {
    analyzeFaceAndRecommend,
    getFaceShapes,
    getRecommendationsByShape
};
