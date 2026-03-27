const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Step 1: Detect Gender and analyze basic face features
const detectGenderAndFeatures = async (imageBuffer, mimeType) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // ✅ Fixed

        const prompt = `Analyze this face image. Return ONLY a JSON object with: 
        "gender" (male/female), 
        "faceShape" (Oval/Round/Square/Diamond/Heart/Rectangle), 
        "hairDensity" (Low/Medium/High), 
        "hairTexture" (Straight/Wavy/Curly/Coily), 
        "reason" (short explanation).
        Return ONLY raw JSON, no markdown, no backticks.`;

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text().trim()
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Analysis Error:", error.message);
        throw error;
    }
};

// Step 2: Generate Hairstyle Grid
const generateHairstyleGrid = async (imageBuffer, mimeType, gender, faceShape) => {
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp" // ✅ Fixed - only model that supports image generation
        });

        const prompt = `
Take the face of the person in the uploaded photo. 
Generate a single vertical 9:16 high-quality image containing a 3x3 grid (9 tiles). 
In EACH tile, show the EXACT SAME PERSON from the photo but with a DIFFERENT ${gender} hairstyle suited for ${faceShape} face shape.

STRICT RULES:
- FACE LOCK: Use the user's exact face in every tile.
- NO REPETITION: 9 completely unique hairstyles.
- LABELS: Add a clear text label at the bottom of each tile (e.g., "STYLE: FADE").
- NO OBJECTS: No trimmers, no combs, no generic barber icons.
- HIGH QUALITY: Photorealistic skin and hair texture.

Output ONLY the generated image, nothing else.`;

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType
            },
        };

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: prompt }, imagePart]
            }],
            generationConfig: { 
                responseModalities: ["IMAGE", "TEXT"] // ✅ Fixed - TEXT is required alongside IMAGE
            }
        });

        const response = await result.response;
        const part = response.candidates[0].content.parts.find(p => p.inlineData);

        if (part) {
            return {
                success: true,
                gridImageBase64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            };
        }
        return { success: false, message: "AI failed to generate image. Try again." };

    } catch (error) {
        console.error("Generation Error:", error.message);
        return { success: false, message: error.message };
    }
};

module.exports = { detectGenderAndFeatures, generateHairstyleGrid };