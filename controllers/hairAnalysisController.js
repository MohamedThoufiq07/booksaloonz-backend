const axios = require("axios");

// ─── API Keys ────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;

// ─── Hardcoded Fallback Database ─────────────────────────────
const FALLBACK_STYLES = {
    male: {
        oval: [
            { name: "Crew Cut", description: "A classic, clean-cut style that's trimmed close on the sides and slightly longer on top.", suitability: "Perfectly complements an oval face by maintaining balanced proportions." },
            { name: "Side Part", description: "A timeless gentleman's cut with a defined part and neatly combed sides.", suitability: "The structured lines highlight the natural symmetry of an oval face." },
            { name: "Quiff", description: "A voluminous, swept-back style with height at the front and tapered sides.", suitability: "Adds vertical dimension while keeping the oval face's harmony intact." },
            { name: "Textured Fringe", description: "A modern, layered fringe with tousled texture for a relaxed yet stylish look.", suitability: "Softens the forehead area and adds a contemporary edge to oval features." },
            { name: "Undercut", description: "Shaved or faded sides with a longer, styled top section for sharp contrast.", suitability: "Creates a bold, edgy look that works seamlessly with oval proportions." }
        ],
        round: [
            { name: "Pompadour", description: "A voluminous, retro-inspired style swept upward and back from the forehead.", suitability: "Adds vertical height to elongate a round face and create a leaner appearance." },
            { name: "Faux Hawk", description: "A toned-down mohawk with the centre section styled upward and sides tapered.", suitability: "The upward styling adds length and angular definition to a round face." },
            { name: "High Fade", description: "A sharp fade starting high on the sides with a styled top for maximum contrast.", suitability: "Reduces width at the sides, making a round face appear more structured." },
            { name: "Side Sweep", description: "Hair swept to one side with a natural, flowing movement and subtle layering.", suitability: "The diagonal line creates asymmetry that counterbalances round features." },
            { name: "Angular Fringe", description: "A sharp, asymmetric fringe cut at an angle across the forehead.", suitability: "Introduces angular lines that add definition and reduce facial roundness." }
        ],
        square: [
            { name: "Textured Crop", description: "A short, textured top with a clean fade on the sides for a rugged modern look.", suitability: "Softens the strong jawline of a square face with natural texture." },
            { name: "Slick Back", description: "Hair smoothed backward with a glossy finish for a sharp, refined style.", suitability: "Emphasises the strong bone structure while keeping the look polished." },
            { name: "Buzz Cut", description: "An ultra-short, uniform cut all over that's low-maintenance and bold.", suitability: "Highlights the masculine, angular features of a square face shape." },
            { name: "Messy Quiff", description: "A quiff with intentionally tousled, textured strands for a laid-back vibe.", suitability: "Adds casual softness to the angular lines of a square jawline." },
            { name: "Taper Fade", description: "A gradual fade from longer on top to shorter at the neckline with clean edges.", suitability: "Provides a balanced transition that complements strong square features." }
        ],
        heart: [
            { name: "Medium Length Layers", description: "Chin-length or longer layers that add body and movement around the ears.", suitability: "Adds width at the jawline to balance a wider forehead on a heart-shaped face." },
            { name: "Side Part with Volume", description: "A deep side part with volume on top and fuller sides for a balanced silhouette.", suitability: "Distributes visual weight evenly, reducing the forehead-to-chin contrast." },
            { name: "Fringe (Bangs)", description: "A soft fringe that falls across the forehead, partially covering it.", suitability: "Minimises the appearance of a wide forehead characteristic of heart shapes." },
            { name: "Textured Waves", description: "Natural or styled wavy texture that adds dimension and softness.", suitability: "Creates a relaxed, balanced frame around heart-shaped facial features." },
            { name: "Classic Taper", description: "A traditional cut that gradually shortens from top to sides with clean lines.", suitability: "Offers a clean, proportional look that harmonises heart-face angles." }
        ],
        diamond: [
            { name: "Curtain Hair", description: "Medium-length hair parted in the centre, framing both sides of the face.", suitability: "Adds width at the forehead and chin to balance prominent cheekbones." },
            { name: "Textured Fringe", description: "A choppy, layered fringe that adds volume and covers the narrow forehead.", suitability: "Widens the forehead visually while complementing diamond-shaped features." },
            { name: "Side Swept Bangs", description: "Bangs swept casually to one side for a soft, effortless look.", suitability: "Adds diagonal lines that soften angular cheekbones on diamond faces." },
            { name: "Layered Medium Cut", description: "A medium-length cut with layers that add volume around the face.", suitability: "Creates fullness at the forehead and jaw to balance narrow points." },
            { name: "Messy Spikes", description: "Short, spiked hair with a deliberately messy, textured finish.", suitability: "Adds width and volume on top to complement the narrow diamond face." }
        ],
        oblong: [
            { name: "Side Fringe", description: "A fringe swept to one side that adds horizontal lines across the forehead.", suitability: "Breaks the vertical length of an oblong face with horizontal coverage." },
            { name: "Layered Bob (Short)", description: "A short, layered cut that adds volume and width around the ears.", suitability: "Adds lateral fullness to counterbalance the elongated face shape." },
            { name: "Textured Crop", description: "A short, textured top with volume and movement for a casual style.", suitability: "Keeps height minimal while adding width, ideal for oblong proportions." },
            { name: "Wavy Medium Length", description: "Medium-length hair with natural or styled waves for added body.", suitability: "Waves add width and break up the long vertical lines of an oblong face." },
            { name: "Classic Side Part", description: "A neat side part with combed sides that adds horizontal structure.", suitability: "The parting line creates a horizontal break that shortens the face visually." }
        ]
    },
    female: {
        oval: [
            { name: "Beach Waves", description: "Soft, tousled waves that mimic a natural, sun-kissed, effortless look.", suitability: "Enhances the balanced proportions of an oval face with beautiful movement." },
            { name: "Layered Cut", description: "Multiple layers throughout the hair that add dimension, body and flow.", suitability: "Complements the oval shape by adding texture without altering proportions." },
            { name: "Bob", description: "A chin-length cut with clean lines and a polished, modern silhouette.", suitability: "Frames the face elegantly and accentuates oval features with precision." },
            { name: "Curtain Bangs", description: "Wispy, face-framing bangs parted in the centre like a curtain.", suitability: "Softly frames the forehead and cheekbones, enhancing oval symmetry." },
            { name: "Long Layers", description: "Long flowing hair with gradual layers for movement and dimension.", suitability: "Maintains the natural elegance of an oval face with cascading volume." }
        ],
        round: [
            { name: "High Ponytail", description: "Hair gathered high on the crown for a sleek, lifted look with elongating effect.", suitability: "Adds vertical height to elongate a round face and reduce width perception." },
            { name: "Long Layers", description: "Long flowing hair with face-framing layers that create vertical lines.", suitability: "The vertical flow draws the eye downward, slimming round features." },
            { name: "Side Part", description: "A deep side part that creates asymmetry and diagonal lines across the face.", suitability: "Breaks the circular symmetry of a round face with angular styling." },
            { name: "Voluminous Waves", description: "Big, bouncy waves with height and volume at the crown.", suitability: "Adds height and dimension, counterbalancing the width of a round face." },
            { name: "Angled Bob", description: "A bob cut at an angle — shorter at the back and longer at the front.", suitability: "Creates angular lines that add structure and definition to round features." }
        ],
        square: [
            { name: "Soft Waves", description: "Gentle, flowing waves that cascade with a soft, romantic texture.", suitability: "Softens the angular jawline and strong lines of a square face." },
            { name: "Side-Swept Bangs", description: "Bangs swept diagonally across the forehead for a flattering frame.", suitability: "Adds soft curves and diagonal lines to soften square features." },
            { name: "Long Layered Cut", description: "Long hair with strategic layers that add movement around the jaw area.", suitability: "Layers around the jaw soften strong angles of a square face shape." },
            { name: "Textured Lob", description: "A long bob with tousled, textured ends for an effortless chic look.", suitability: "The textured ends break up the strong lines of a square jawline." },
            { name: "Wispy Fringe", description: "A light, airy fringe with soft, feathered edges across the forehead.", suitability: "Adds softness to the forehead area and balances a strong square jaw." }
        ],
        heart: [
            { name: "Chin-Length Bob", description: "A bob cut precisely at chin level to add volume at the lower face.", suitability: "Adds width at the chin to balance the wider forehead of a heart face." },
            { name: "Side-Parted Waves", description: "Wavy hair with a deep side part that adds asymmetric volume.", suitability: "Distributes volume evenly and softens the pointed chin area." },
            { name: "Layered Lob", description: "A longer bob with layers that add body and movement throughout.", suitability: "Creates fullness around the jaw to balance narrower lower features." },
            { name: "Curtain Bangs", description: "Centre-parted bangs that drape along the temples and cheekbones.", suitability: "Narrows the appearance of a wide forehead on heart-shaped faces." },
            { name: "Textured Pixie", description: "A short pixie cut with textured, piece-y styling for a chic look.", suitability: "Draws attention upward while the texture softens heart-face angles." }
        ],
        diamond: [
            { name: "Side-Swept Layers", description: "Layered hair swept to one side with volume and face-framing movement.", suitability: "Adds width at the forehead and chin to balance prominent cheekbones." },
            { name: "Chin-Length Bob", description: "A bob ending at the chin with soft, rounded edges for a classic look.", suitability: "Adds fullness at the jawline to complement narrow chin areas." },
            { name: "Soft Curtain Bangs", description: "Gentle, flowing bangs parted at the centre with feathered tips.", suitability: "Adds width at the forehead while softening angular cheekbones." },
            { name: "Voluminous Curls", description: "Full, bouncy curls that add width and body throughout the hair.", suitability: "Creates balanced volume to fill out the narrow forehead and chin." },
            { name: "Long Wavy Layers", description: "Long hair with cascading waves and layers for a flowing silhouette.", suitability: "The waves add horizontal dimension to balance a diamond face shape." }
        ],
        oblong: [
            { name: "Full Bangs", description: "Straight-across bangs that cover the forehead for a bold, chic look.", suitability: "Shortens the appearance of an elongated face by covering the forehead." },
            { name: "Shoulder-Length Waves", description: "Medium waves that hit at the shoulders with a natural, bouncy body.", suitability: "Adds lateral width that counterbalances the long vertical of an oblong face." },
            { name: "Layered Bob", description: "A bob with added layers for volume, texture and interesting movement.", suitability: "Keeps length in check while adding width to balance oblong proportions." },
            { name: "Side-Parted Lob", description: "A long bob with a deep side part and flowing movement.", suitability: "The side parting adds a horizontal break while the lob controls length." },
            { name: "Voluminous Blowout", description: "A full, rounded blowout with lift and body from root to tip.", suitability: "Maximises width and volume to create a more rounded silhouette." }
        ]
    }
};

// ─── Helper: Get Fallback Styles ─────────────────────────────
const getFallbackStyles = (gender, faceShape) => {
    const g = (gender || "male").toLowerCase();
    const genderKey = (g === "female" || g === "woman") ? "female" : "male";
    const shapeKey = (faceShape || "oval").toLowerCase();

    // Try exact match first, then fallback to "oval"
    const genderStyles = FALLBACK_STYLES[genderKey] || FALLBACK_STYLES.male;
    const styles = genderStyles[shapeKey] || genderStyles.oval;

    return styles;
};

// ─── Controller: POST /api/ai/hair-analysis ──────────────────
const hairAnalysis = async (req, res) => {
    const { gender, faceShape, hairType, hairDensity } = req.body;

    // Default values if missing
    const g = gender || "male";
    const fs = faceShape || "Oval";
    const ht = hairType || "Straight";
    const hd = hairDensity || "Medium";

    const prompt = `Suggest 5 hairstyles for a ${g} with ${fs} face, ${ht} hair, ${hd} density. Return ONLY a JSON array with fields: name, description, suitability`;

    let suggestions = null;

    // ── Try Gemini / Groq API ────────────────────────────────
    try {
        if (GEMINI_API_KEY) {
            let responseText = "";

            if (GEMINI_API_KEY.startsWith("AIzaSy")) {
                // Google Gemini
                const { GoogleGenerativeAI } = require("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(prompt);
                responseText = result.response.text();
            } else {
                // Groq fallback
                const response = await axios.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.7
                    },
                    {
                        headers: { Authorization: `Bearer ${GEMINI_API_KEY}` },
                        timeout: 10000
                    }
                );
                responseText = response.data.choices[0].message.content;
            }

            // Parse the JSON response
            const cleaned = responseText
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();
            const parsed = JSON.parse(cleaned);

            if (Array.isArray(parsed) && parsed.length >= 1) {
                suggestions = parsed.slice(0, 5).map((item) => ({
                    name: item.name || "Recommended Style",
                    description: item.description || "A style tailored for your features.",
                    suitability: item.suitability || "Matches your face shape and hair type."
                }));
                console.log("✅ Gemini/Groq returned", suggestions.length, "styles");
            }
        }
    } catch (err) {
        console.error("⚠️ AI API failed, using fallback:", err.message);
    }

    // ── Fallback if AI failed or returned nothing ────────────
    if (!suggestions || suggestions.length === 0) {
        console.log("🛠️ Using hardcoded fallback for", g, fs);
        suggestions = getFallbackStyles(g, fs);
    }

    // ── Ensure exactly 5 results ─────────────────────────────
    while (suggestions.length < 5) {
        suggestions.push({
            name: "Classic Style",
            description: "A timeless hairstyle that suits most face shapes and occasions.",
            suitability: "Versatile and universally flattering."
        });
    }
    suggestions = suggestions.slice(0, 5);

    // ── ALWAYS return success with 5 results ─────────────────
    return res.json({
        success: true,
        gender: g,
        faceShape: fs,
        hairType: ht,
        hairDensity: hd,
        suggestions
    });
};

module.exports = { hairAnalysis };
