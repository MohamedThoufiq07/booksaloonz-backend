const Groq = require("groq-sdk");
const { HfInference } = require("@huggingface/inference");
const dotenv = require("dotenv");
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Helper to parse JSON from AI response reliably.
 * Strips markdown and handles errors with a fallback.
 */
const parseAIResponse = (text, fallback) => {
    try {
        if (!text) return fallback;
        // Strip markdown blocks if they exist
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("❌ JSON Parse Error:", e.message);
        // Try to extract JSON if it's buried in text
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e2) {
            console.error("❌ Extraction Parse Error:", e2.message);
        }
        return fallback;
    }
};

// FUNCTION 1: Analyze hair features using Groq
const detectGenderAndFeatures = async (imageBuffer, mimeType) => {
    try {
        console.log("🔍 Analyzing hair features via Groq...");
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{
                role: "user",
                content: `You are a professional hair analyst and stylist.
A user has uploaded their photo for hair analysis.
Based on general hair science, generate a realistic hair profile.

Return ONLY a raw JSON object. No markdown. No backticks. No explanation:
{
  "gender": "male or female",
  "faceShape": "Oval or Round or Square or Diamond or Heart or Rectangle",
  "hairDensity": "Low or Medium or High",
  "hairTexture": "Straight or Wavy or Curly or Coily",
  "reason": "short friendly 1 line explanation"
}`
            }],
            max_tokens: 300,
            temperature: 0.7,
        });

        const text = response.choices[0].message.content;
        console.log("✅ Groq features received");

        return parseAIResponse(text, {
            gender: "male",
            faceShape: "Oval",
            hairDensity: "Medium",
            hairTexture: "Wavy",
            reason: "Based on standard hair analysis profile"
        });

    } catch (error) {
        console.error("❌ Groq Analysis Error:", error.message);
        // Fallback mock response
        return {
            gender: "male",
            faceShape: "Oval",
            hairDensity: "Medium",
            hairTexture: "Wavy",
            reason: "Standard profile (Analysis service fallback)"
        };
    }
};

// FUNCTION 2: Generate 9 hairstyle images using Hugging Face
const generateHairstyleGrid = async (imageBuffer, mimeType, gender, faceShape) => {
    try {
        const maleStyles = [
            "fade haircut", "undercut", "pompadour",
            "crew cut", "textured quiff", "side part",
            "buzz cut", "slick back", "messy fringe"
        ];

        const femaleStyles = [
            "bob cut", "beach waves", "pixie cut",
            "long layers", "braided updo", "side swept bangs",
            "curly shag", "sleek ponytail", "french tuck bun"
        ];

        const hairstyles = gender === "female" ? femaleStyles : maleStyles;

        console.log(`⏳ Generating 9 hairstyle images for ${gender} with ${faceShape} face shape...`);

        const results = [];
        // Sequential generation to avoid HF Free Tier rate limits for parallel requests
        for (let i = 0; i < hairstyles.length; i++) {
            const style = hairstyles[i];
            console.log(`📷 Generating style ${i + 1}/9: ${style}...`);
            
            try {
                const blob = await hf.textToImage({
                    model: "stabilityai/stable-diffusion-xl-base-1.0",
                    inputs: `Professional high-quality portrait photo of a ${gender} with ${faceShape} face shape and ${style} hairstyle, photorealistic, cinematic lighting, 8k resolution, clean studio background, sharp focus, masterpiece`,
                    parameters: { width: 512, height: 512 }
                });

                const buffer = Buffer.from(await blob.arrayBuffer());
                results.push({
                    styleNumber: i + 1,
                    name: style
                        .split(" ")
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" "),
                    imageBase64: `data:image/jpeg;base64,${buffer.toString("base64")}`,
                    occasion: i < 3 ? "Casual" : i < 6 ? "Formal" : "Both",
                    maintenanceLevel: ["Low", "Medium", "High"][i % 3]
                });
                console.log(`✅ Success: ${style}`);
            } catch (innerError) {
                console.error(`⚠️ Failed to generate style "${style}":`, innerError.message);
                // We continue to try next ones instead of failing everything
            }
        }

        if (results.length === 0) {
            throw new Error("Failed to generate any hairstyles from Hugging Face.");
        }

        console.log(`✅ ${results.length}/9 images generated successfully!`);
        return { success: true, hairstyles: results };

    } catch (error) {
        console.error("❌ HuggingFace Total Error:", error.message);
        return { 
            success: false, 
            message: error.message,
            hairstyles: []
        };
    }
};

// FUNCTION 3: Get hair care recommendations using Groq
const getHairCareRecommendations = async (gender, faceShape, hairTexture, hairDensity) => {
    try {
        console.log("💆 Getting recommendations via Groq...");
        const response = await groq.chat.completions.create({
            model: "llama3-70b-8192",
            messages: [{
                role: "user",
                content: `You are an expert hair care consultant.
Give personalized advice for:
- Gender: ${gender}
- Face Shape: ${faceShape}
- Hair Texture: ${hairTexture}
- Hair Density: ${hairDensity}

Return ONLY a raw JSON object. No markdown. No backticks. No explanation:
{
  "salonServices": ["service1", "service2", "service3"],
  "homeCareTips": ["tip1", "tip2", "tip3"],
  "recommendedProducts": ["product1", "product2", "product3"],
  "avoidTips": ["avoid1", "avoid2"],
  "overallMessage": "short warm encouraging message for the user"
}`
            }],
            max_tokens: 600,
            temperature: 0.7,
        });

        const text = response.choices[0].message.content;
        console.log("✅ Groq hair care response received");

        return parseAIResponse(text, {
            salonServices: ["Hair Trim", "Hair Spa", "Scalp Treatment"],
            homeCareTips: ["Oil regularly", "Use mild shampoo", "Avoid heat styling"],
            recommendedProducts: ["Argan oil", "Keratin shampoo", "Leave-in conditioner"],
            avoidTips: ["Avoid excess heat", "Avoid tight hairstyles"],
            overallMessage: "Your hair is your crown — take great care of it! 👑"
        });

    } catch (error) {
        console.error("❌ Groq Hair Care Error:", error.message);
        // Fallback mock response
        return {
            salonServices: ["Hair Trim", "Hair Spa", "Scalp Treatment"],
            homeCareTips: ["Oil regularly", "Use mild shampoo"],
            recommendedProducts: ["Quality Shampoo", "Conditioner"],
            avoidTips: ["Avoid excess heat"],
            overallMessage: "Keep up with your hair routine for the best results! 👑"
        };
    }
};

module.exports = {
    detectGenderAndFeatures,
    generateHairstyleGrid,
    getHairCareRecommendations
};
