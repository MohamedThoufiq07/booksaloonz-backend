/**
 * Learning-to-Rank (LTR) Algorithm
 * 
 * Purpose: Rank salon search results by computing a composite relevance 
 *          score using multiple ranking features, inspired by machine 
 *          learning ranking models (RankNet, LambdaMART).
 * 
 * Features used for ranking:
 *   1. Rating score (quality signal)
 *   2. Distance/proximity (if available)
 *   3. Price competitiveness (value signal)
 *   4. Popularity (number of bookings/reviews)
 *   5. Service match (how well salon services match query)
 *   6. Recency boost (recently active salons)
 *   7. Availability penalty (penalize fully booked salons)
 * 
 * The weights simulate a trained LTR model — in production, these would
 * be learned from user click/booking data.
 */

// Learned feature weights (normally trained via gradient descent)
const FEATURE_WEIGHTS = {
    rating: 0.28,
    proximity: 0.22,
    priceValue: 0.15,
    popularity: 0.15,
    serviceMatch: 0.10,
    recency: 0.05,
    availability: 0.05
};

/**
 * Normalize a value to 0-1 range using min-max scaling
 */
function minMaxNormalize(value, min, max) {
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculate rating feature score
 * Combines average rating with number of ratings (Bayesian average)
 */
function ratingScore(salon) {
    const rating = salon.rating || 0;
    const numReviews = salon.totalReviews || salon.reviewCount || 0;

    // Bayesian average: weight the rating by number of reviews
    // C = prior mean (3.0), m = minimum reviews threshold (5)
    const C = 3.0;
    const m = 5;
    const bayesianRating = ((numReviews * rating) + (m * C)) / (numReviews + m);

    return bayesianRating / 5.0; // normalize to 0-1
}

/**
 * Calculate proximity feature score
 * Closer salons score higher (inverse distance with decay)
 */
function proximityScore(salon, userPreferences) {
    const distance = salon.distance || salon.distanceKm || null;

    if (distance === null || distance === undefined) return 0.5; // neutral

    // Sigmoid decay: 0km → 1.0, 5km → ~0.5, 10km+ → ~0
    return 1 / (1 + Math.exp((distance - 5) / 2));
}

/**
 * Calculate price value score
 * Rewards competitive pricing relative to user's budget preference
 */
function priceValueScore(salon, userPreferences) {
    const price = salon.startingPrice || salon.price || 0;
    const maxBudget = userPreferences?.maxBudget || 2000;
    const minBudget = userPreferences?.minBudget || 0;

    if (price === 0) return 0.5; // unknown price

    // If under budget, higher is better (good value)
    if (price <= maxBudget) {
        // Prefer mid-range (not too cheap, not too expensive)
        const midPoint = (maxBudget + minBudget) / 2;
        const deviation = Math.abs(price - midPoint) / (maxBudget - minBudget + 1);
        return Math.max(0.3, 1 - deviation);
    }

    // Over budget — penalize
    return Math.max(0, 1 - ((price - maxBudget) / maxBudget));
}

/**
 * Calculate popularity score based on booking count and reviews
 */
function popularityScore(salon, allSalons) {
    const bookings = salon.totalBookings || salon.bookingCount || 0;
    const reviews = salon.totalReviews || salon.reviewCount || 0;

    // Combined popularity metric
    const popularity = bookings * 0.6 + reviews * 0.4;

    // Find max popularity for normalization
    const maxPopularity = Math.max(
        ...allSalons.map(s =>
            (s.totalBookings || s.bookingCount || 0) * 0.6 +
            (s.totalReviews || s.reviewCount || 0) * 0.4
        ),
        1
    );

    return minMaxNormalize(popularity, 0, maxPopularity);
}

/**
 * Calculate service match score
 * How well the salon's services match what the user is looking for
 */
function serviceMatchScore(salon, userPreferences) {
    if (!userPreferences?.searchTerms || !salon.services) return 0.5;

    const searchTerms = Array.isArray(userPreferences.searchTerms)
        ? userPreferences.searchTerms
        : userPreferences.searchTerms.toLowerCase().split(/\s+/);

    const salonServices = Array.isArray(salon.services)
        ? salon.services.map(s => (typeof s === 'string' ? s : s.name || '').toLowerCase())
        : [];

    if (salonServices.length === 0) return 0.3;

    let matches = 0;
    for (const term of searchTerms) {
        if (salonServices.some(s => s.includes(term) || term.includes(s))) {
            matches++;
        }
    }

    return matches / searchTerms.length;
}

/**
 * Calculate recency score
 * Boost salons that have been recently active/updated
 */
function recencyScore(salon) {
    const lastActive = salon.lastActive || salon.updatedAt || salon.createdAt;
    if (!lastActive) return 0.5;

    const daysSinceActive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: active today = 1.0, 30 days ago = ~0.37, 90 days = ~0.05
    return Math.exp(-daysSinceActive / 30);
}

/**
 * Calculate availability score
 * Penalize salons with limited availability
 */
function availabilityScore(salon) {
    if (salon.isFullyBooked) return 0.0;

    const availableSlots = salon.availableSlots || salon.slotsAvailable;
    if (availableSlots === undefined) return 0.7; // assume mostly available

    // More available slots = higher score
    return Math.min(1, availableSlots / 10);
}

/**
 * Learning-to-Rank: Score and rank salon search results
 * 
 * @param {Array} searchResults - Array of salon objects from search
 * @param {Object} userPreferences - User preferences for personalization
 * @param {number} userPreferences.maxBudget - Maximum budget
 * @param {string} userPreferences.searchTerms - What the user searched for
 * @param {string} userPreferences.sortBy - Override sort field
 * @returns {Array} Ranked results with LTR scores
 */
const ltrRanking = (searchResults, userPreferences = {}) => {
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
        return [];
    }

    console.log(`📊 LTR Ranking: Scoring ${searchResults.length} results...`);

    // If user explicitly wants a specific sort, respect that
    if (userPreferences.sortBy) {
        const sortField = userPreferences.sortBy;
        const sortOrder = userPreferences.sortOrder === 'asc' ? 1 : -1;

        return [...searchResults].sort((a, b) => {
            const aVal = a[sortField] || 0;
            const bVal = b[sortField] || 0;
            return (aVal - bVal) * sortOrder;
        });
    }

    // Calculate LTR score for each salon
    const scoredResults = searchResults.map(salon => {
        const features = {
            rating: ratingScore(salon),
            proximity: proximityScore(salon, userPreferences),
            priceValue: priceValueScore(salon, userPreferences),
            popularity: popularityScore(salon, searchResults),
            serviceMatch: serviceMatchScore(salon, userPreferences),
            recency: recencyScore(salon),
            availability: availabilityScore(salon)
        };

        // Weighted linear combination (simulates trained model output)
        let ltrScore = 0;
        for (const [feature, weight] of Object.entries(FEATURE_WEIGHTS)) {
            ltrScore += features[feature] * weight;
        }

        return {
            ...salon,
            _ltrScore: Math.round(ltrScore * 1000) / 1000,
            _features: features
        };
    });

    // Sort by LTR score descending
    scoredResults.sort((a, b) => b._ltrScore - a._ltrScore);

    console.log(`   ✅ Top result: "${scoredResults[0]?.name}" (LTR Score: ${scoredResults[0]?._ltrScore})`);

    return scoredResults;
};

module.exports = ltrRanking;
