const mongoose = require('mongoose');
require('dotenv').config();
const Salon = require('./models/Salon');
const SalonOwner = require('./models/SalonOwner');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        await Salon.deleteMany({});
        await SalonOwner.deleteMany({});
        console.log('Cleared existing data');

        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const owner = await SalonOwner.create({
            ownerName: 'Admin Owner',
            salonName: 'Elite Salons Group',
            email: 'owner@example.com',
            password: hashedPassword,
            phone: '1234567890'
        });
        console.log('Created Salon Owner');

        const salons = [
            {
                name: 'Elite Grooming Studio',
                address: 'Palayamkottai, Tirunelveli',
                startingPrice: 200, // Matching UI amount ₹300 for some service
                rating: 4.8,
                category: 'men',
                isApproved: true,
                owner: owner._id,
                img: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
                location: { type: 'Point', coordinates: [77.7289, 8.7139] },
                services: [
                    { name: 'Regular Haircut', price: 300, duration: 30 },
                    { name: 'Premium Styling', price: 500, duration: 45 }
                ],
                openingHours: { open: '09:00', close: '21:00' }
            },
            {
                name: 'Grace & Glamour',
                address: 'Vannarpettai, Tirunelveli',
                startingPrice: 499,
                rating: 4.9,
                category: 'women',
                isApproved: true,
                owner: owner._id,
                img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
                location: { type: 'Point', coordinates: [77.7126, 8.7285] },
                services: [
                    { name: 'Bridal Makeup', price: 2000, duration: 120 },
                    { name: 'Facial', price: 500, duration: 60 }
                ],
                openingHours: { open: '10:00', close: '20:00' }
            }
        ];
        
        const created = await Salon.insertMany(salons);
        console.log(`Successfully seeded ${created.length} real salons!`);
        
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
