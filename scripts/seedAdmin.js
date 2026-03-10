/**
 * Seed Admin User
 * Run: node scripts/seedAdmin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

const seedAdmin = async () => {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@booksaloonz.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = 'Admin';

    try {
        const existing = await User.findOne({ email: adminEmail });
        if (existing) {
            console.log('⚠️  Admin already exists:', adminEmail);
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        await User.create({
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin'
        });

        console.log('✅ Admin user created successfully!');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
        console.log('   ⚠️  Change the password after first login!');
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    }

    process.exit(0);
};

seedAdmin();
