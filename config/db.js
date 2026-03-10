const mongoose = require('mongoose');

const connectDB = async (retryCount = 10) => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error(`MongoDB connection error: ${err.message}`);

        if (retryCount > 0) {
            console.log(`Retrying MongoDB connection... (${retryCount} attempts remaining)`);
            setTimeout(() => connectDB(retryCount - 1), 5000);
        } else {
            console.error('All MongoDB connection attempts failed. Exiting...');
            process.exit(1);
        }
    }
};

module.exports = connectDB;
