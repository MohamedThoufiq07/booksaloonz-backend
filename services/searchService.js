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
        { name: "Executive Contour", url: "https://images.unsplash.com/photo-1618077360395-f3068be8e001" },
        { name: "Messy Fringe", url: "https://images.unsplash.com/photo-1567894340348-70191b451a5d" }
    ],
    female: [
        { name: "Layered Long Waves", url: "https://images.unsplash.com/photo-1563721517731-7079b3a4d485" },
        { name: "Classic Bob", url: "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3" },
        { name: "Pixie Cut", url: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186" },
        { name: "Shoulder-Length Lob", url: "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6" },
        { name: "Balayage Curls", url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61" },
        { name: "Braided Crown", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330" },
        { name: "Straight Sleek", url: "https://images.unsplash.com/photo-1519699047748-de8e457a634e" },
        { name: "Curtain Bangs", url: "https://images.unsplash.com/photo-1493106819501-66d381c446a5" },
        { name: "Voluminous Curls", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb" }
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
