/**
 * Recommendation Algorithm — NCF-Inspired Service/Salon Suggestion
 * 
 * Purpose: Recommend salons or products to users based on collaborative 
 *          filtering and content-based signals.
 * 
 * This serves as the high-level entry point that wraps the NCF engine 
 * with a simpler interface for controller use.
 * 
 * Modes:
 *   1. Personalized: When user data is available (NCF hybrid)
 *   2. Popular: When no user data — fallback to top-rated/popular items
 */

const ncfRecommend = require('./ncfRecommend');

/**
 * Generate Recommendations
 * 
 * @param {Array} items - All available items (salons or products)
 * @param {Object} options - Configuration
 * @param {number} options.limit - Max recommendations (default: 6)
 * @param {string} options.userId - User ID for personalized recs
 * @param {Array} options.interactions - User interaction data
 * @param {Object} options.userPreferences - User preference profile
 * @returns {Array} Recommended items, sorted by relevance
 */
const recommendationAlgorithm = (items, options = {}) => {
    const {
        limit = 6,
        userId = null,
        interactions = [],
        userPreferences = {}
    } = options;

    if (!items || items.length === 0) return [];

    // Mode 1: Personalized recommendations (NCF)
    if (userId && interactions.length > 0) {
        console.log(`💡 Recommendation: Personalized mode for User ${userId}`);

        return ncfRecommend(userId, {
            interactions,
            salons: items,
            userPreferences
        }, {
            limit,
            kNeighbors: Math.min(10, Math.floor(interactions.length / 2)),
            hybridWeight: 0.6
        });
    }

    // Mode 2: Popularity-based fallback
    console.log('💡 Recommendation: Popularity-based mode (no user data)');

    // Composite popularity score
    const scored = items.map(item => {
        const rating = item.rating || 0;
        const reviews = item.totalReviews || item.reviewCount || 0;
        const bookings = item.totalBookings || item.bookingCount || 0;

        // Wilson score lower bound (for rating confidence)
        const z = 1.96; // 95% confidence
        const n = reviews || 1;
        const phat = rating / 5;
        const wilsonScore = (phat + z * z / (2 * n) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n)) / (1 + z * z / n);

        // Combined popularity metric
        const popularityScore = wilsonScore * 0.5 +
            Math.min(1, bookings / 50) * 0.3 +
            Math.min(1, reviews / 20) * 0.2;

        return {
            ...item,
            _recScore: Math.round(Math.max(0, popularityScore) * 1000) / 1000
        };
    });

    return scored
        .sort((a, b) => b._recScore - a._recScore)
        .slice(0, limit);
};

module.exports = recommendationAlgorithm;
