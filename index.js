require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Initialize App
const app = express();

// Connect to Database
connectDB();

// ===== Security Middleware =====
app.use(helmet({ crossOriginResourcePolicy: false }));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));

// Body Parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ===== API Routes =====
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/salons', require('./routes/salonRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/hairstyle', require('./routes/hairStyleRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Default Route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'BookSaloonz API v2.0 — Production Ready 🚀',
        docs: '/api'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// ===== Centralized Error Handler =====
app.use(errorHandler);

// ===== Server Listen =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
