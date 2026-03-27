const AIHairReport = require('../models/AIHairReport');
const { detectGenderAndFeatures, generateHairstyleGrid } = require('../services/geminiService');

/**
 * POST /api/ai/analyze
 * STRICT PROCESS:
 * 1. Analyze face to detect gender, shape, density, and texture
 * 2. Generate a 3x3 grid of hairstyles using Gemini AI (user's own face)
 * 3. NO stock photo fallback
 */
exports.analyzeFaceAndHair = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

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

        try {
            // STEP 1: Detect Gender and analyze face features
            console.log("Step 1: Analyzing gender and face features...");
            const analysis = await detectGenderAndFeatures(req.file.buffer, req.file.mimetype);

            reportData.faceShape = analysis.faceShape || "Oval";
            reportData.gender = analysis.gender || "male";
            reportData.hairDensity = analysis.hairDensity || "Medium";
            reportData.hairTexture = analysis.hairTexture || "Straight";
            reportData.explanation = analysis.reason;
            reportData.confidence = 98;

            // STEP 2: Generate hairstyle grid using Gemini
            console.log(`Step 2: Generating ${reportData.gender} hairstyle grid with user's face...`);
            const gridResult = await generateHairstyleGrid(
                req.file.buffer,
                req.file.mimetype,
                reportData.gender,
                reportData.faceShape
            );

            if (gridResult.success && gridResult.gridImageBase64) {
                reportData.transformedImageURL = gridResult.gridImageBase64;
                reportData.fallbackSearchUsed = false;
            } else {
                throw new Error(gridResult.message || "AI could not generate hairstyle grid. Please try again.");
            }

            reportData.recommendations = [];

            // Save the report to DB
            const newReport = new AIHairReport(reportData);
            await newReport.save();

            res.status(200).json({
                success: true,
                report: newReport,
                treatmentSuggestions: reportData.gender === 'male'
                    ? ["Use scalp revitalizing tonic", "Scalp massage twice a week"]
                    : ["Apply heat protectant", "Deep conditioning every 15 days"],
                productRecommendations: reportData.gender === 'male'
                    ? ["Caffeine Shampoo", "Matt Wax"]
                    : ["Argan Oil", "Volume Mousse"]
            });

        } catch (analysisError) {
            console.error("AI processing failed:", analysisError.message);
            res.status(422).json({
                success: false,
                message: analysisError.message || 'AI could not process the image. Please try again.'
            });
        }

    } catch (error) {
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
