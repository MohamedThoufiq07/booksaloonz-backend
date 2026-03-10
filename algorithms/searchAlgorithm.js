/**
 * Search Algorithm — BERT-Inspired Keyword Matching with LTR Ranking
 * 
 * Purpose: Full search pipeline that combines semantic search (BERT-inspired)
 *          with Learning-to-Rank for result ordering.
 * 
 * Pipeline:
 *   1. BERT-inspired semantic search (synonym expansion, fuzzy matching)
 *   2. LTR ranking (multi-feature scoring)
 *   3. Final result formatting
 */

const bertSearch = require('./bertSearch');
const ltrRanking = require('./ltrRanking');

/**
 * Full Search Pipeline
 * 
 * @param {Array} items - Array of salon/product objects to search through
 * @param {string} query - User's search query
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum results to return
 * @param {string} options.sortBy - Override sort field
 * @param {number} options.maxBudget - User's budget preference
 * @returns {Array} Ranked search results
 */
const searchAlgorithm = (items, query, options = {}) => {
    if (!items || items.length === 0) return [];

    // If no query, return all items ranked by LTR
    if (!query || query.trim().length === 0) {
        return ltrRanking(items, {
            sortBy: options.sortBy,
            sortOrder: options.sortOrder
        });
    }

    console.log(`🔎 Search Pipeline: "${query}" across ${items.length} items`);

    // Step 1: BERT-inspired semantic search
    const searchResults = bertSearch(query, items, {
        minScore: 0.3,
        maxResults: options.limit || 50
    });

    // Step 2: LTR ranking on filtered results
    const rankedResults = ltrRanking(searchResults, {
        searchTerms: query,
        maxBudget: options.maxBudget,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder
    });

    // Step 3: Apply limit
    const limit = options.limit || 50;
    const finalResults = rankedResults.slice(0, limit);

    console.log(`   ✅ Returning ${finalResults.length} results`);

    return finalResults;
};

module.exports = searchAlgorithm;
