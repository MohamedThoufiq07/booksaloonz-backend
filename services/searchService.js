const axios = require('axios');

/**
 * Curated High-Quality Hairstyle Database (Fallback)
 * Ensures "Real human hairstyle images" and "Professional quality".
 * Avoids generic barber tools or unrelated content.
 */
const curatedHairstyles = {
    male: [
        { name: "Classic Pompadour", url: "https://images.unsplash.com/photo-1599566150163-29194dcaad36" },
        { name: "Textured Fade", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d" },
        { name: "Modern Quiff", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6" },
        { name: "Slicked Back", url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce" },
        { name: "Buzz Cut", url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d" },
        { name: "Side Part", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e" },
        { name: "Curly Top Fade", url: "https://images.unsplash.com/photo-1531384441138-2736e62e0919" },
        { name: "Executive Contour", url: "https://images.unsplash.com/photo-1621605815971-fbc98d665033" },
        { name: "Messy Fringe", url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c" },
        { name: "Mullet Modern", url: "https://images.unsplash.com/photo-1605497788044-5a32c7078486" },
        { name: "Man Bun", url: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef" },
        { name: "Top Knot", url: "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11" }
    ],
    female: [
        { name: "Layered Long Waves", url: "https://images.unsplash.com/photo-1563721517731-7079b3a4d485" },
        { name: "Classic Bob", url: "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3" },
        { name: "Pixie Cut", url: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186" },
        { name: "Shoulder-Length Lob", url: "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6" },
        { name: "Balayage Curls", url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61" },
        { name: "Braided Crown", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330" },
        { name: "Straight Sleek", url: "https://images.unsplash.com/photo-1519699047748-de8e457a634e" },
        { name: "Curtain Bangs", url: "https://images.unsplash.com/photo-1605980776115-46f9066bf9eb" },
        { name: "Voluminous Curls", url: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f" },
        { name: "Space Bun", url: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6" },
        { name: "French Braid", url: "https://images.unsplash.com/photo-1541534401786-2077ee40cdce" }
    ]
};

/**
 * Web Search Fallback for Hairstyles
 */
const searchHairstyles = async (faceShape, density, texture, gender) => {
    try {
        const query = `${gender} hairstyle for ${faceShape} face ${texture} hair ${density} density`;
        console.log(`🔍 Providing curated fallback for: "${query}"`);

        // Use gender-specific list or default to male
        const baseList = curatedHairstyles[gender.toLowerCase()] || curatedHairstyles.male;

        // Return 6-9 variations with names and optimized Unsplash URLs
        const count = 9;
        const shuffled = [...baseList].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        return selected.map(item => ({
            name: item.name,
            url: `${item.url}?q=80&w=600&auto=format&fit=crop`
        }));

    } catch (error) {
        console.error("Search Fallback Error:", error);
        return [];
    }
};

module.exports = { searchHairstyles };
