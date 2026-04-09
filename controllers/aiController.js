const axios = require('axios');

/**
 * @desc    Suggest 5 hairstyles based on gender, face shape, hair type, and density
 * @route   POST /api/ai/hair-analysis
 * @access  Public (Temporary for testing)
 */
const hairAnalysis = async (req, res) => {
    const { gender, faceShape, hairType, hairDensity } = req.body;

    if (!gender || !faceShape || !hairType || !hairDensity) {
        return res.status(400).json({ success: false, message: "All fields required" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Prompt for Gemini - Updated with specific guidance from user's manual
    const prompt = `Suggest 5 hairstyles for a ${gender} with ${faceShape} face shape, ${hairType} hair and ${hairDensity} density. 
    Main objective for this face shape: ${
        faceShape.toLowerCase() === 'oval' ? 'Don\'t hide features' :
        faceShape.toLowerCase() === 'square' ? 'Soften angles' :
        faceShape.toLowerCase() === 'round' ? 'Add height' :
        faceShape.toLowerCase() === 'heart' ? 'Balance the chin' :
        'Soften cheekbones'
    }.
    Return ONLY a valid JSON array with no extra text. Each item must have exactly these fields: name, description, suitability, searchKeyword`;

    try {
        if (GEMINI_API_KEY) {
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
            const suggestions = JSON.parse(cleaned);

            if (Array.isArray(suggestions) && suggestions.length >= 1) {
                return res.json({ success: true, hairstyles: suggestions.slice(0, 5) });
            }
        }
        throw new Error("AI failed");

    } catch (error) {
        console.error("⚠️ AI Generation Failed, falling back to authoritative guide data:", error.message);
        
        // Authoritative Fallback Data based on User's Manual
        const FALLBACK_DATA = {
            "male": {
                "oval": [
                    { name: "The Pompadour", description: "Classic height on top that highlights symmetrical features.", suitability: "Ideal for showing off oval bone structure.", searchKeyword: "classic pompadour man" },
                    { name: "The Undercut", description: "Keeps sides tight to emphasize face shape.", suitability: "Perfectly balanced for oval symmetry.", searchKeyword: "modern undercut man" },
                    { name: "Quiff", description: "Volume on top swept back for presence.", suitability: "Adds height without distorting shape.", searchKeyword: "textured quiff man" },
                    { name: "Crew Cut", description: "Short clean cut for a neat appearance.", suitability: "Highlights natural facial proportions.", searchKeyword: "neat crew cut man" },
                    { name: "Side Part", description: "Classic balanced style for formal or casual looks.", suitability: "Enhances facial symmetry.", searchKeyword: "professional side part man" }
                ],
                "square": [
                    { name: "Buzz Cut", description: "Minimalist and rugged, highlighting strong features.", suitability: "Leans into the sharpness of a square jaw.", searchKeyword: "rugged buzz cut man" },
                    { name: "Classic Side Part", description: "Structured look that softens forehead angles.", suitability: "Balances the strong square silhouette.", searchKeyword: "side part hairstyle man" },
                    { name: "Slick Back", description: "All hair styled backward to soften the jawline.", suitability: "Adds a touch of elegance to sharp features.", searchKeyword: "heavy slick back man" },
                    { name: "Ivy League", description: "Cleancut version of a crew cut with a part.", suitability: "Softens the overall boxy look.", searchKeyword: "ivy league haircut man" },
                    { name: "Textured Crop", description: "Forward fringe and textured layers.", suitability: "Breaks up the forehead's square lines.", searchKeyword: "textured crop fringe man" }
                ],
                "round": [
                    { name: "High Fade with Quiff", description: "Adds verticality and creates a longer face illusion.", suitability: "Perfect for adding necessary height.", searchKeyword: "high fade quiff man" },
                    { name: "Faux Hawk", description: "Creates a sharp point at the top to break circularity.", suitability: "Adds structure to soft round features.", searchKeyword: "modern faux hawk man" },
                    { name: "Pompadour Fade", description: "High volume on top with tight faded sides.", suitability: "Elongates the round silhouette.", searchKeyword: "pompadour fade man" },
                    { name: "Angular Fringe", description: "Swept to the side to create angles.", suitability: "Contrast with the circular face shape.", searchKeyword: "angular fringe man" },
                    { name: "Spiky Top", description: "Textured spikes that add vertical presence.", suitability: "Adds height and edge to round faces.", searchKeyword: "short spiky hair man" }
                ],
                "heart": [
                    { name: "Messy Fringe", description: "Covers the width of the forehead for balance.", suitability: "Decreases perceived width at the top.", searchKeyword: "messy fringe man" },
                    { name: "Mid-Length Scissor Cut", description: "Adds bulk around the ears and chin area.", suitability: "Adds weight to the narrow bottom of the face.", searchKeyword: "medium scissor cut man" },
                    { name: "Side Swept Part", description: "Bangs swept across the forehead.", suitability: "Balances the wide heart forehead.", searchKeyword: "side swept hairstyle man" },
                    { name: "Long Top Taper", description: "Volume on top with longer sides.", suitability: "Frames the heart shape beautifully.", searchKeyword: "long top taper man" },
                    { name: "Shaggy Layers", description: "Messy textured layers that add fullness.", suitability: "Fills in the area around the narrow chin.", searchKeyword: "shaggy layers man" }
                ],
                "diamond": [
                    { name: "Textured Crop", description: "Adds width to the forehead area.", suitability: "Softens the prominent cheekbones.", searchKeyword: "textured crop man" },
                    { name: "Swept Back", description: "Styled back to show off bone structure.", suitability: "Highlights cheekbones without over-widening.", searchKeyword: "swept back hairstyle man" },
                    { name: "Long Layers", description: "Adds volume around the narrow chin and forehead.", suitability: "Balances the diamond proportions.", searchKeyword: "long hair man layers" },
                    { name: "Fringe with Sides", description: "Adds weight to the temple area.", suitability: "Softens the wide cheekbone line.", searchKeyword: "fringe haircut man" },
                    { name: "Side Part Quiff", description: "Asymmetrical height that shifts focus.", suitability: "Breaks the width of the cheekbones.", searchKeyword: "side quiff man" }
                ]
            },
            "female": {
                "oval": [
                    { name: "Blunt Bob", description: "Hits just below the jaw to frame the face.", suitability: "Maintains the natural symmetric oval shape.", searchKeyword: "blunt bob woman" },
                    { name: "Long Layers", description: "Adds movement without distorting face shape.", suitability: "Enhances the versatile oval structure.", searchKeyword: "long layers woman" },
                    { name: "Curtain Bangs", description: "Soft parted fringe that frames the eyes.", suitability: "Perfectly complements oval proportions.", searchKeyword: "curtain bangs woman" },
                    { name: "Beach Waves", description: "Relaxed volume that adds soft texture.", suitability: "Shows off the balanced oval face.", searchKeyword: "beach waves woman" },
                    { name: "Sleek Ponytail", description: "Elegant pulled-back style.", suitability: "Highlights all oval facial features.", searchKeyword: "sleek ponytail woman" }
                ],
                "round": [
                    { name: "Long Layers", description: "Draws the eye downward to create length.", suitability: "Slims and elongates the round face.", searchKeyword: "long layers round face" },
                    { name: "Pixie Cut with Volume", description: "Height at the crown elongates the silhouette.", suitability: "Adds much-needed structure and height.", searchKeyword: "voluminous pixie cut" },
                    { name: "Asymmetrical Bob", description: "Defined angles that break circularity.", suitability: "Creates a longer-looking profile.", searchKeyword: "asymmetrical bob woman" },
                    { name: "High Ponytail", description: "Lifts the features and adds verticality.", suitability: "Great for elongating round proportions.", searchKeyword: "high ponytail woman" },
                    { name: "Side Part Waves", description: "Deep part that adds volume to one side.", suitability: "Breaks the symmetry of a round face.", searchKeyword: "side part waves woman" }
                ],
                "square": [
                    { name: "Layered Lob", description: "Long bob that breaks up the sharp jawline.", suitability: "Softens the strong square angles.", searchKeyword: "layered lob square face" },
                    { name: "Side-Swept Bangs", description: "Draws attention away from a boxy forehead.", suitability: "Adds softness to the sharp silhouette.", searchKeyword: "side swept bangs woman" },
                    { name: "Soft Curls", description: "Gentle volume that rounds off the features.", suitability: "Contrasts beautifully with square jawlines.", searchKeyword: "soft curly hair woman" },
                    { name: "Chin Length Bob", description: "Soft bob that curves inwards.", suitability: "Frames and softens the square jaw.", searchKeyword: "soft bob woman" },
                    { name: "Wispy Layers", description: "Feathered layers for a light, airy look.", suitability: "Reduces the boxiness of square shapes.", searchKeyword: "wispy layers woman" }
                ],
                "heart": [
                    { name: "The 'Lob'", description: "Ends at the shoulder to fill gap around the chin.", suitability: "Balances the wider heart forehead.", searchKeyword: "long bob heart face" },
                    { name: "Wispy Bangs", description: "Disguises the widest part of the forehead.", suitability: "Softens the transition to the narrow chin.", searchKeyword: "wispy bangs heart face" },
                    { name: "Side Part with Waves", description: "Adds bulk around the lower half of the face.", suitability: "Adds weight to the narrow jawline.", searchKeyword: "side part waves heart face" },
                    { name: "Chin Length Bob", description: "Adds immediate width where it is needed.", suitability: "Perfectly balances heart proportions.", searchKeyword: "chin length bob heart" },
                    { name: "Long Braids", description: "Vertical lines that balance the width.", suitability: "Elegant look for heart shaped faces.", searchKeyword: "long braids woman" }
                ],
                "diamond": [
                    { name: "Chin-Length Bob", description: "Adds necessary width at the narrow jawline.", suitability: "Balances the wide cheekbones.", searchKeyword: "chin length bob diamond face" },
                    { name: "Deep Side Part", description: "Breaks up the width of the cheekbones.", suitability: "Softens the diamond symmetry.", searchKeyword: "deep side part woman" },
                    { name: "Shaggy Layers", description: "Texture that adds width at the top and bottom.", suitability: "Softens prominent cheekbone points.", searchKeyword: "shaggy layers diamond face" },
                    { name: "Short Pixie with Bangs", description: "Brings focus to the forehead and eyes.", suitability: "Softens the sharpness of a diamond face.", searchKeyword: "pixie cut with bangs" },
                    { name: "Voluminous Waves", description: "Fullness that rounds out the diamond shape.", suitability: "Adds volume to narrow forehead and chin.", searchKeyword: "voluminous waves woman" }
                ]
            }
        };

        const g = gender.toLowerCase() === "female" ? "female" : "male";
        const fs = faceShape.toLowerCase();
        let hairstyles = FALLBACK_DATA[g]?.[fs] || FALLBACK_DATA[g]?.["oval"];
        
        return res.json({ success: true, hairstyles: hairstyles.slice(0, 5) });
    }
};

module.exports = { hairAnalysis };
