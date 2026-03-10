const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Step 1: Detect Gender and analyze basic face features
 */
const detectGenderAndFeatures = async (imageBuffer, mimeType, retryCount = 0) => {
    try {
        // Use gemini-2.0-flash-lite for initial analysis as it's faster and more available
        const modelName = retryCount > 0 ? "models/gemini-2.0-flash-lite" : "models/gemini-2.0-flash";
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Analyze this uploaded face image with high precision. Return a JSON object containing:
            "gender": "male" or "female",
            "faceShape": One of "Oval", "Round", "Square", "Diamond", "Heart", "Rectangle",
            "hairDensity": "Low", "Medium", or "High" (base on scalp visibility),
            "hairTexture": "Straight", "Wavy", "Curly", or "Coily",
            "reason": "Provide a brief, specific explanation of why you chose these attributes based on visual cues in the image."
        `;

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // With responseMimeType: "application/json", text SHOULD be valid JSON
        try {
            return JSON.parse(text);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError.message, "Text:", text);
            // Fallback for non-JSON response if any
            const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(cleanedJson);
        }
    } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error.message);

        // If rate limited (429) and haven't retried yet, try once more with flash-lite
        if (error.status === 429 && retryCount < 1) {
            console.log("Rate limit hit. Retrying with Lite model in 1 second...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            return detectGenderAndFeatures(imageBuffer, mimeType, retryCount + 1);
        }

        if (error.status === 404) {
            throw new Error(`AI Model ${retryCount > 0 ? 'Lite' : 'Standard'} not found.`);
        }
        if (error.status === 429) {
            throw new Error("AI Service is heavily loaded. Please wait a few moments and try again.");
        }
        throw new Error(`Face analysis failed: ${error.message || 'Unknown error'}`);
    }
};

/**
 * Step 2: Generate 3x3 Hairstyle Grid using Gender-Specific Strict Prompts
 */
const generateHairstyleGrid = async (imageBuffer, mimeType, gender) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const malePrompt = `
Use the uploaded image as a STRICT, NON-NEGOTIABLE identity reference.

ABSOLUTE FACE LOCK (HIGHEST PRIORITY):
- The face in the output MUST be pixel-identical to the uploaded image
- SAME facial geometry, SAME skin texture, SAME pores, SAME moles, SAME asymmetry
- SAME expression, SAME head tilt, SAME eye direction
- NO beautification, NO symmetry correction, NO aging or de-aging
- NO gender change, NO facial feature enhancement
- NO lighting changes that alter facial appearance

FIRST (INTERNAL STEP ONLY — DO NOT OUTPUT TEXT):
Analyze the uploaded face to determine:
- Face shape
- Hair density
- Hair texture and curl pattern
- Natural growth direction and hairline

SECOND (FINAL OUTPUT — IMAGE ONLY):
Generate ONE single vertical 9:16, true-4K composite image containing a 3×3 grid.

GRID RULES:
- 9 UNIQUE hairstyles (no repeats)
- Hairstyles applied realistically while preserving the EXACT SAME FACE
- Hair is the ONLY editable region
- Face, skin tone, shadows, proportions MUST remain unchanged in every tile

STRICT CONSISTENCY REQUIREMENTS:
- SAME pose, SAME camera angle, SAME focal length
- SAME background, SAME lighting direction and intensity
- SAME facial expression across all 9 tiles

HAIRSTYLE VARIATION RULES:
- Mix short, medium, and slightly longer hairstyles
- Professional, college, and youthful styles implicitly represented
- Respect real hair density, texture, and scalp visibility
- Natural hairlines and realistic parting
- NO wigs, NO fantasy volume, NO AI over-styling

TECHNICAL REQUIREMENTS:
- Vertical 9:16 layout
- True 4K clarity
- Photorealistic hair texture and shadows
- Natural hair movement without distortion

ABSOLUTE RESTRICTIONS:
- OUTPUT IMAGE ONLY
- NO text, captions, labels, or explanations
- NO background changes
- NO makeup or facial changes unless present in the original image

GOAL:
Create a barber-grade haircut reference grid where the uploaded face is IDENTICAL in all 9 tiles and ONLY the hairstyle changes.`;

        const femalePrompt = `
Use the uploaded image as a STRICT identity reference.

FACE LOCK — CRITICAL:
- The face must remain EXACTLY the same in all 9 tiles
- Same facial structure, same eyes, nose, lips, jawline
- Same expression, same head angle, same camera distance
- NO face beautification, reshaping, aging, or gender changes

INTERNAL ANALYSIS ONLY (do NOT output text):
Analyze the uploaded face to determine:
- Face shape (jawline, cheekbones, forehead ratio)
- Hair density, natural texture, curl pattern (1A–4C), porosity
- Natural parting and growth direction

FINAL OUTPUT — IMAGE ONLY:
Generate ONE single vertical 9:16, true-4K image containing a 3×3 grid of FEMALE hairstyles applied realistically on MY FACE.

GRID REQUIREMENTS:
- 9 UNIQUE female hairstyles
- Hairstyles ONLY change — NOTHING else
- Same lighting, same background, same pose across all tiles
- Maintain exact facial identity in every frame

HAIRSTYLE VARIATION RULES:
- Mix short, medium, and long female hairstyles
- Include professional, college, and youthful/teen-appropriate looks
- Examples of variation (do NOT label):
  • Bob / Lob
  • Layered medium cut
  • Long straight or soft waves
  • Shoulder-length with curtain bangs
  • Low-volume professional styles
  • Youthful modern feminine cuts
- Respect my real hair texture and density
- Natural hairlines, realistic scalp visibility
- No fantasy volume, wigs, or over-styled AI hair

TECHNICAL REQUIREMENTS:
- Vertical 9:16 composition
- True 4K clarity
- Natural lighting (studio or daylight)
- Realistic hair movement and shadows
- Photorealistic skin and hair texture

ABSOLUTE RESTRICTIONS:
- NO text
- NO captions
- NO explanations
- NO labels
- NO background changes
- NO makeup changes unless already present

GOAL:
Create a professional female hairstyle reference grid where ONLY the hairstyle changes and the face remains perfectly identical.`;

        const prompt = gender.toLowerCase() === 'female' ? femalePrompt : malePrompt;

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;

        // Try to find image data in response parts
        let imageData = "";
        const parts = response.candidates[0]?.content?.parts || [];

        for (const part of parts) {
            if (part.inlineData) {
                imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break;
            }
        }

        // Fallback to text if no inlineData found (some models return base64 as text)
        if (!imageData) {
            imageData = response.text();
            if (imageData && !imageData.startsWith('data:')) {
                imageData = `data:image/png;base64,${imageData}`;
            }
        }

        return {
            success: true,
            gridImageBase64: imageData
        };
    } catch (error) {
        console.error("Grid Generation Error:", error);
        return { success: false, message: error.message };
    }
};

module.exports = {
    detectGenderAndFeatures,
    generateHairstyleGrid
};
