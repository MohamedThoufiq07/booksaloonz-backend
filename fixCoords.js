const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI);

const Salon = require("./models/Salon");

const tirunelveliCoords = [
    { lat: 8.7139, lng: 77.6695 },
    { lat: 8.7200, lng: 77.6800 },
    { lat: 8.7050, lng: 77.6750 },
    { lat: 8.7300, lng: 77.6900 },
    { lat: 8.6900, lng: 77.6600 },
    { lat: 8.7400, lng: 77.7100 },
    { lat: 8.7000, lng: 77.6550 },
    { lat: 8.7150, lng: 77.6850 },
    { lat: 8.7250, lng: 77.7000 },
    { lat: 8.7100, lng: 77.6700 },
];

const fix = async () => {
    const salons = await Salon.find();
    for (let i = 0; i < salons.length; i++) {
        const c = tirunelveliCoords[i] || tirunelveliCoords[0];
        await Salon.findByIdAndUpdate(salons[i]._id, {
            location: {
                type: "Point",
                coordinates: [c.lng, c.lat]
            }
        });
        console.log(`✅ Updated: ${salons[i].name} → [${c.lng}, ${c.lat}]`);
    }
    console.log("🎉 All salons updated with Tirunelveli coordinates!");
    process.exit(0);
};

fix();