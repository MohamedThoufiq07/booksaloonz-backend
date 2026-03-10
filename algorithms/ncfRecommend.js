/**
 * NCF (Neural Collaborative Filtering) Inspired Recommendation Algorithm
 * 
 * Purpose: Recommend salons based on user interaction history and 
 *          collaborative signals from similar users.
 * 
 * Concept (simplified NCF):
 *   1. Build a user-item interaction matrix from bookings/ratings
 *   2. Find similar users using cosine similarity
 *   3. Aggregate preferences of similar users
 *   4. Score unvisited items for the target user
 *   5. Combine with content-based features for hybrid recommendations
 * 
 * This implements a lightweight version suitable for a MERN stack app,
 * mimicking the behavior of a neural collaborative filtering model.
 */

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build a user-item interaction matrix
 * Each entry represents interaction strength (0 = none, 1-5 = rating/booking)
 * 
 * @param {Array} interactions - Array of { userId, salonId, rating?, bookingCount? }
 * @param {Array} allUserIds - All unique user IDs
 * @param {Array} allSalonIds - All unique salon IDs
 * @returns {Object} Matrix indexed by userId → {salonId: score}
 */
function buildInteractionMatrix(interactions, allUserIds, allSalonIds) {
    const matrix = {};

    // Initialize empty matrix
    for (const userId of allUserIds) {
        matrix[userId] = {};
        for (const salonId of allSalonIds) {
            matrix[userId][salonId] = 0;
        }
    }

    // Fill with interaction data
    for (const interaction of interactions) {
        const uid = interaction.userId?.toString();
        const sid = interaction.salonId?.toString();

        if (uid && sid && matrix[uid]) {
            // Combine rating and booking signals
            const ratingSignal = interaction.rating || 0;
            const bookingSignal = interaction.bookingCount ? Math.min(interaction.bookingCount, 5) : 0;

            // Weighted combination
            matrix[uid][sid] = Math.max(
                ratingSignal * 0.7 + bookingSignal * 0.3,
                matrix[uid][sid]
            );
        }
    }

    return matrix;
}

/**
 * Find K most similar users to the target user
 */
function findSimilarUsers(targetUserId, interactionMatrix, allSalonIds, k = 10) {
    const targetVector = allSalonIds.map(sid => interactionMatrix[targetUserId]?.[sid] || 0);

    const similarities = [];
    for (const [userId, interactions] of Object.entries(interactionMatrix)) {
        if (userId === targetUserId) continue;

        const userVector = allSalonIds.map(sid => interactions[sid] || 0);
        const similarity = cosineSimilarity(targetVector, userVector);

        if (similarity > 0) {
            similarities.push({ userId, similarity });
        }
    }

    // Sort by similarity descending and take top K
    return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k);
}

/**
 * Generate collaborative filtering scores for unvisited salons
 */
function collaborativeScore(targetUserId, interactionMatrix, similarUsers, allSalonIds) {
    const scores = {};
    const targetInteractions = interactionMatrix[targetUserId] || {};

    for (const salonId of allSalonIds) {
        // Skip salons the user has already visited/rated highly
        if (targetInteractions[salonId] >= 4) continue;

        let weightedSum = 0;
        let similaritySum = 0;

        for (const { userId, similarity } of similarUsers) {
            const userRating = interactionMatrix[userId]?.[salonId] || 0;
            if (userRating > 0) {
                weightedSum += similarity * userRating;
                similaritySum += similarity;
            }
        }

        // Predicted score = weighted average of similar users' ratings
        scores[salonId] = similaritySum > 0
            ? weightedSum / similaritySum
            : 0;
    }

    return scores;
}

/**
 * Content-based scoring (fallback when collaborative data is sparse)
 * Uses salon attributes to compute similarity to user preferences
 */
function contentBasedScore(salon, userPreferences) {
    let score = 0;
    let factors = 0;

    // Rating alignment
    if (salon.rating) {
        score += (salon.rating / 5) * 0.3;
        factors++;
    }

    // Price alignment
    if (salon.startingPrice && userPreferences?.avgSpend) {
        const priceDiff = Math.abs(salon.startingPrice - userPreferences.avgSpend);
        score += Math.max(0, 1 - priceDiff / 1000) * 0.25;
        factors++;
    }

    // Category/service alignment
    if (userPreferences?.preferredCategories && salon.category) {
        const categoryMatch = userPreferences.preferredCategories
            .some(cat => salon.category.toLowerCase().includes(cat.toLowerCase()));
        if (categoryMatch) {
            score += 0.25;
            factors++;
        }
    }

    // Location preference
    if (userPreferences?.preferredLocation && salon.address) {
        if (salon.address.toLowerCase().includes(userPreferences.preferredLocation.toLowerCase())) {
            score += 0.2;
            factors++;
        }
    }

    return factors > 0 ? score : 0.3; // default neutral score
}

/**
 * NCF Recommendation Engine
 * 
 * @param {string} userId - Target user ID
 * @param {Object} data - Data context
 * @param {Array} data.interactions - User-salon interaction history [{userId, salonId, rating, bookingCount}]
 * @param {Array} data.salons - All available salons
 * @param {Object} data.userPreferences - Target user's preferences (optional)
 * @param {Object} options - Configuration
 * @param {number} options.limit - Max recommendations to return (default: 6)
 * @param {number} options.kNeighbors - Number of similar users (default: 10)
 * @param {number} options.hybridWeight - Weight for collaborative vs content (0-1, default: 0.6)
 * @returns {Array} Recommended salons with scores
 */
const ncfRecommend = (userId, data = {}, options = {}) => {
    const {
        interactions = [],
        salons = [],
        userPreferences = {}
    } = data;

    const {
        limit = 6,
        kNeighbors = 10,
        hybridWeight = 0.6 // 0.6 collaborative, 0.4 content-based
    } = options;

    if (!userId || salons.length === 0) {
        console.log('⚠️ NCF Recommend: Missing userId or salons');
        return [];
    }

    console.log(`🤖 NCF Recommend: Generating recommendations for User ${userId}...`);

    const allUserIds = [...new Set(interactions.map(i => i.userId?.toString()).filter(Boolean))];
    const allSalonIds = salons.map(s => (s._id || s.id)?.toString()).filter(Boolean);

    // Ensure target user is in the list
    if (!allUserIds.includes(userId.toString())) {
        allUserIds.push(userId.toString());
    }

    let cfScores = {};

    if (interactions.length > 0 && allUserIds.length > 1) {
        // Build interaction matrix
        const matrix = buildInteractionMatrix(interactions, allUserIds, allSalonIds);

        // Find similar users
        const similarUsers = findSimilarUsers(userId.toString(), matrix, allSalonIds, kNeighbors);
        console.log(`   Found ${similarUsers.length} similar users`);

        // Generate collaborative scores
        cfScores = collaborativeScore(userId.toString(), matrix, similarUsers, allSalonIds);
    } else {
        console.log('   Insufficient interaction data — using content-based fallback');
    }

    // Hybrid scoring: combine collaborative + content-based
    const recommendations = salons.map(salon => {
        const salonId = (salon._id || salon.id)?.toString();

        const cfScore = cfScores[salonId] || 0;
        const cbScore = contentBasedScore(salon, userPreferences);

        // Weighted hybrid score
        const hasCollaborativeData = cfScore > 0;
        const finalScore = hasCollaborativeData
            ? (cfScore / 5) * hybridWeight + cbScore * (1 - hybridWeight)
            : cbScore; // pure content-based when no collaborative data

        return {
            ...salon,
            _ncfScore: Math.round(finalScore * 1000) / 1000,
            _cfScore: Math.round((cfScore / 5) * 1000) / 1000,
            _cbScore: Math.round(cbScore * 1000) / 1000,
            _method: hasCollaborativeData ? 'hybrid' : 'content-based'
        };
    });

    // Sort by NCF score and return top results
    recommendations.sort((a, b) => b._ncfScore - a._ncfScore);

    const topResults = recommendations.slice(0, limit);
    console.log(`   ✅ Top recommendation: "${topResults[0]?.name}" (Score: ${topResults[0]?._ncfScore})`);

    return topResults;
};

module.exports = ncfRecommend;
