const axios = require('axios');

// Hardcoded backup image IDs by category as requested
const BACKUP_IMAGES = {
    "male": {
        "oval": [1681010, 2269872, 1300402, 842811, 1043474],
        "round": [220453, 1681010, 614810, 1043474, 2379005],
        "square": [842811, 1300402, 1681010, 220453, 614810],
        "heart": [2379005, 1043474, 842811, 614810, 220453],
        "oblong": [1300402, 2269872, 2379005, 1681010, 614810],
        "diamond": [1300402, 2269872, 2379005, 1681010, 614810] // Diamond uses Oblong fallback
    },
    "female": {
        "oval": [774909, 1382731, 415829, 1239291, 1065084],
        "round": [1239291, 774909, 1065084, 415829, 1382731],
        "square": [415829, 1065084, 1239291, 1382731, 774909],
        "heart": [1382731, 415829, 774909, 1065084, 1239291],
        "oblong": [1065084, 1239291, 1382731, 774909, 415829],
        "diamond": [1065084, 1239291, 1382731, 774909, 415829] // Diamond uses Oblong fallback
    }
};

const getFallbackImage = (gender, faceShape, index) => {
    const g = gender.toLowerCase() === 'female' ? 'female' : 'male';
    const fs = faceShape.toLowerCase();
    const ids = BACKUP_IMAGES[g][fs] || BACKUP_IMAGES[g]['oval'];
    const id = ids[index % ids.length];
    return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=400&h=400&fit=crop`;
};

const fetchHairstyleImage = async (searchQuery) => {
    if (!process.env.PEXELS_API_KEY) return null;
    
    try {
        const response = await axios.get('https://api.pexels.com/v1/search', {
            headers: { Authorization: process.env.PEXELS_API_KEY },
            params: {
                query: searchQuery,
                per_page: 5,
                orientation: 'portrait'
            }
        });

        const photos = response.data.photos;
        if (photos && photos.length > 0) {
            // Pick random from top 5 to avoid same image
            const random = photos[Math.floor(Math.random() * photos.length)];
            return random.src.medium;
        }
    } catch (error) {
        console.error("Pexels API Error:", error.message);
    }
    return null;
};

/**
 * @desc    Suggest 5 hairstyles based on gender, face shape, hair type, and density
 * @route   POST /api/ai/hair-analysis
 * @access  Public
 */
const hairAnalysis = async (req, res) => {
    const { gender, faceShape, hairType, hairDensity } = req.body;

    if (!gender || !faceShape || !hairType || !hairDensity) {
        return res.status(400).json({ success: false, message: "All fields required" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Prompt for Gemini
    const prompt = `Suggest 5 specific and trending hairstyles for a ${gender} with ${faceShape} face shape, ${hairType} hair type, and ${hairDensity} hair density. 
    Main objective for this face shape: ${
        faceShape.toLowerCase() === 'oval' ? 'Maintain balance and don\'t hide features' :
        faceShape.toLowerCase() === 'square' ? 'Soften the sharp jawline with layers or volume' :
        faceShape.toLowerCase() === 'round' ? 'Add height and length to the face' :
        faceShape.toLowerCase() === 'heart' ? 'Balance the narrow chin by adding width at the bottom' :
        'Soften cheekbones and add width to forehead/jaw'
    }.
    Return ONLY a valid JSON array with no extra text. Each item must have exactly these fields: name, description, suitability, searchKeyword`;

    let suggestions = [];

    try {
        if (GEMINI_API_KEY) {
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
            suggestions = JSON.parse(cleaned);
        } else {
            throw new Error("Gemini API key missing");
        }
    } catch (error) {
        console.error("⚠️ AI Generation Failed, using internal fallback logic:", error.message);
        
        // Manual Fallback Data (Internal logic cached suggestions)
        const INTERNAL_FALLBACK = {
            "male": {
                "oval": [
                    { name: "Pompadour Fade", description: "Classic volume on top with short sides.", suitability: "Highlights balanced oval features.", searchKeyword: "male pompadour hairstyle" },
                    { name: "Undercut Quiff", description: "Modern swept back style.", suitability: "Adds height without hiding shape.", searchKeyword: "male undercut quiff" },
                    { name: "Side Part", description: "Traditional neat look for all occasions.", suitability: "Emphasizes symmetry.", searchKeyword: "male side part haircut" },
                    { name: "Textured Crop", description: "Short, easy to manage with forward texture.", suitability: "Keeps the face clear.", searchKeyword: "male textured crop" },
                    { name: "Beach Waves", description: "Longer textured look.", suitability: "Natural flow for oval faces.", searchKeyword: "male beach waves hair" }
                ],
                "square": [
                    { name: "Buzz Cut", description: "Ultra short to highlight strong jaw.", suitability: "Matches masculine square structure.", searchKeyword: "male buzz cut" },
                    { name: "Classic Side Part", description: "Softens corners of the forehead.", suitability: "Balances sharp jawline.", searchKeyword: "male side part square face" },
                    { name: "Slick Back", description: "Swept back to avoid boxy look.", suitability: "Elegance for sharp features.", searchKeyword: "male slick back hair" },
                    { name: "Ivy League", description: "Professional version of crew cut.", suitability: "Softens square dimensions.", searchKeyword: "male ivy league cut" },
                    { name: "Crew Cut", description: "Simple, clean and effective.", suitability: "Highlights natural face corners.", searchKeyword: "male crew cut" }
                ],
                "round": [
                    { name: "High Fade Quiff", description: "Vertical volume to lengthen the face.", suitability: "Adds height to circular shape.", searchKeyword: "male high quiff" },
                    { name: "Faux Hawk", description: "Pointed top texture.", suitability: "Breaks circularity.", searchKeyword: "male faux hawk" },
                    { name: "Angular Fringe", description: "Side swept hair to create edges.", suitability: "Contrast for soft round features.", searchKeyword: "male angular fringe" },
                    { name: "Pompadour", description: "Iconic height and presence.", suitability: "Elongates the face profile.", searchKeyword: "male pompadour" },
                    { name: "Spiky Top", description: "Messy spikes for vertical illusion.", suitability: "Adds structure.", searchKeyword: "male short spiky hair" }
                ],
                "heart": [
                    { name: "Messy Fringe", description: "Soft layers covering the forehead.", suitability: "Balances wider top of the face.", searchKeyword: "male messy fringe" },
                    { name: "Long Scissor Cut", description: "Natural length around the ears.", suitability: "Adds width to narrow chin.", searchKeyword: "male long scissor cut" },
                    { name: "Curly Taper", description: "Tight sides with curly volume.", suitability: "Focuses on hair texture.", searchKeyword: "male curly taper" },
                    { name: "Shaggy Layers", description: "Messy volume at the bottom.", suitability: "Fills area around chin.", searchKeyword: "male shaggy hair" },
                    { name: "Side Swept", description: "Classic asymmetrical flow.", suitability: "Softens wide forehead.", searchKeyword: "male side swept hair" }
                ],
                "oblong": [
                    { name: "Side Part Lob", description: "Longer hair on sides to add width.", suitability: "Counters face length.", searchKeyword: "male side part long" },
                    { name: "Brushed Up", description: "Volume that stays close to the crown.", suitability: "Doesn't add too much height.", searchKeyword: "male brushed up hairstyle" },
                    { name: "Fringe Cut", description: "Covers forehead to shorten appearance.", suitability: "Ideal for long faces.", searchKeyword: "male fringe haircut" },
                    { name: "Man Bun", description: "Gathered hair that creates width.", suitability: "Balances long profile.", searchKeyword: "male man bun" },
                    { name: "Tapered Waves", description: "Sides with natural texture.", suitability: "Adds necessary width.", searchKeyword: "male tapered waves" }
                ]
            },
            "female": {
                "oval": [
                    { name: "Blunt Bob", description: "Sharp cut at the jawline.", suitability: "Complements symmetrical oval face.", searchKeyword: "female blunt bob" },
                    { name: "Long Layers", description: "Flowing movement and volume.", suitability: "Classic versatile look.", searchKeyword: "female long layers" },
                    { name: "Curtain Bangs", description: "Seventies inspired frame for the eyes.", suitability: "Perfect for oval balance.", searchKeyword: "female curtain bangs" },
                    { name: "Sleek Straight", description: "Minimalist and elegant.", suitability: "Shows off facial structure.", searchKeyword: "female sleek straight hair" },
                    { name: "Beach Waves", description: "Casual textured volume.", suitability: "Enhances natural features.", searchKeyword: "female beach waves" }
                ],
                "round": [
                    { name: "Long Layers", description: "Layers starting at the jaw.", suitability: "Elongates the face profile.", searchKeyword: "female long layers round face" },
                    { name: "Pixie Cut", description: "Volume on top with short sides.", suitability: "Adds height and structure.", searchKeyword: "female voluminous pixie" },
                    { name: "Asymmetrical Bob", description: "Diagonal lines across the face.", suitability: "Breaks the circularity.", searchKeyword: "female asymmetrical bob" },
                    { name: "High Ponytail", description: "Lifts the eyes and face.", suitability: "Creates vertical length.", searchKeyword: "female high ponytail" },
                    { name: "Side Part Waves", description: "Volume on one side only.", suitability: "Creates necessary angles.", searchKeyword: "female side part waves" }
                ],
                "square": [
                    { name: "Layered Lob", description: "Long bob with soft edges.", suitability: "Softens sharp jawline.", searchKeyword: "female layered lob" },
                    { name: "Side Swept Bangs", description: "Bangs that flow diagonally.", suitability: "Hides boxy forehead corners.", searchKeyword: "female side swept bangs" },
                    { name: "Soft Curls", description: "Gentle curls with volume.", suitability: "Contrast for strong features.", searchKeyword: "female soft curls" },
                    { name: "Face Framing Layers", description: "Hair that curves inward at chin.", suitability: "Softens the square silhouette.", searchKeyword: "female face framing layers" },
                    { name: "Wispy Bangs", description: "Light and airy fringe.", suitability: "Adds softness to sharp face.", searchKeyword: "female wispy bangs" }
                ],
                "heart": [
                    { name: "Shoulder Lob", description: "Volume around the collarbones.", suitability: "Adds width to narrow jaw.", searchKeyword: "female shoulder length lob" },
                    { name: "Bangs with Layers", description: "Soft fringe and movement.", suitability: "Minimizes wide forehead.", searchKeyword: "female bangs layers" },
                    { name: "Side Part Bob", description: "Asymmetrical volume.", suitability: "Balances heart shape.", searchKeyword: "female side part bob" },
                    { name: "Wavy Shag", description: "Texture everywhere.", suitability: "Fills space around the chin.", searchKeyword: "female wavy shag" },
                    { name: "Long Pixie", description: "Tucked behind ears.", suitability: "Frames eyes and cheekbones.", searchKeyword: "female long pixie" }
                ],
                "oblong": [
                    { name: "Chin Length Bob", description: "Horizontal volume at jaw level.", suitability: "Adds width to long faces.", searchKeyword: "female chin length bob" },
                    { name: "Volume Waves", description: "Big curls that go outwards.", suitability: "Great for adding width.", searchKeyword: "female voluminous waves" },
                    { name: "Straight Bangs", description: "Direct cut across forehead.", suitability: "Shortens face length perception.", searchKeyword: "female straight bangs" },
                    { name: "Side Part Lob", description: "Swept to one side.", suitability: "Adds width profile.", searchKeyword: "female side part lob" },
                    { name: "Short Shag", description: "Messy texture on sides.", suitability: "Balances long face.", searchKeyword: "female short shaggy hair" }
                ]
            }
        };

        const g = gender.toLowerCase() === "female" ? "female" : "male";
        const fs = faceShape.toLowerCase();
        suggestions = INTERNAL_FALLBACK[g]?.[fs] || INTERNAL_FALLBACK[g]?.["oval"];
    }

    // Now fetch images for each suggestion
    const hairstylesWithImages = await Promise.all(
        suggestions.slice(0, 5).map(async (style, index) => {
            // Add small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, index * 200));
            
            let imageUrl = await fetchHairstyleImage(style.searchKeyword);
            
            // If Pexels fails or key missing, use fallback ID
            if (!imageUrl) {
                imageUrl = getFallbackImage(gender, faceShape, index);
            }
            
            return { ...style, image: imageUrl };
        })
    );

    return res.json({ success: true, hairstyles: hairstylesWithImages });
};

module.exports = { hairAnalysis };
