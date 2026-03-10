/**
 * BERT-Inspired Semantic Search Algorithm
 * 
 * Purpose: Match user queries to salon services/names using weighted
 *          term-frequency scoring, synonym expansion, and fuzzy matching.
 * 
 * While a true BERT model requires heavy infrastructure, this implements
 * the *conceptual ideas* behind BERT search:
 *   1. Tokenization and normalization
 *   2. Synonym/ontology expansion (contextual understanding)
 *   3. Weighted multi-field matching (TF-IDF inspired)
 *   4. Fuzzy matching for typo tolerance (edit distance)
 *   5. Relevance scoring and ranking
 */

// Domain-specific synonym map — simulates BERT's contextual understanding
const SYNONYM_MAP = {
    'haircut': ['cut', 'trim', 'chop', 'snip', 'crop', 'shave', 'barber', 'styling'],
    'hair': ['hairstyle', 'locks', 'tresses', 'mane'],
    'color': ['colour', 'dye', 'tint', 'highlight', 'balayage', 'ombre', 'bleach'],
    'beard': ['facial hair', 'stubble', 'goatee', 'mustache', 'moustache'],
    'spa': ['massage', 'relaxation', 'therapy', 'treatment', 'wellness'],
    'facial': ['face', 'skin', 'skincare', 'cleanup', 'glow'],
    'bridal': ['bride', 'wedding', 'marriage', 'engagement', 'mehendi', 'mehndi'],
    'men': ['gents', 'male', 'boys', 'gentleman'],
    'women': ['ladies', 'female', 'girls', 'womens'],
    'premium': ['luxury', 'exclusive', 'vip', 'elite', 'deluxe', 'top'],
    'cheap': ['affordable', 'budget', 'low cost', 'discount', 'economical', 'value'],
    'near': ['nearby', 'close', 'closest', 'around', 'local', 'proximity'],
    'best': ['top', 'rated', 'popular', 'recommended', 'famous', 'great'],
    'style': ['fashion', 'trend', 'trendy', 'modern', 'look'],
    'straightening': ['keratin', 'rebonding', 'smoothening', 'smoothing'],
    'perm': ['curling', 'waves', 'wavy', 'curly'],
    'manicure': ['nails', 'nail art', 'pedicure', 'nail care'],
    'makeup': ['cosmetics', 'beauty', 'makeover', 'glam'],
};

// Field weight multipliers — higher weight for more relevant fields
const FIELD_WEIGHTS = {
    name: 3.0,
    category: 2.5,
    services: 2.0,
    address: 1.5,
    description: 1.0
};

/**
 * Calculate Levenshtein (edit) distance between two strings
 * Used for fuzzy matching / typo tolerance
 */
function editDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Check if two words are a fuzzy match (typo-tolerant)
 * Allows 1 edit for words 4-6 chars, 2 edits for words 7+ chars
 */
function isFuzzyMatch(word, target) {
    if (word === target) return true;
    if (word.length < 3 || target.length < 3) return word === target;

    const maxDistance = word.length <= 4 ? 1 : word.length <= 6 ? 1 : 2;
    return editDistance(word, target) <= maxDistance;
}

/**
 * Expand query terms using the synonym map
 * e.g., "haircut" → ["haircut", "cut", "trim", "chop", ...]
 */
function expandWithSynonyms(terms) {
    const expanded = new Set(terms);

    for (const term of terms) {
        // Check direct synonyms
        for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
            if (term === key || synonyms.includes(term)) {
                expanded.add(key);
                synonyms.forEach(s => expanded.add(s));
            }
        }
    }

    return Array.from(expanded);
}

/**
 * Tokenize and normalize text
 */
function tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter(t => t.length > 1);
}

/**
 * Calculate relevance score for how well a salon matches the query
 */
function calculateRelevanceScore(queryTerms, expandedTerms, salon) {
    let totalScore = 0;
    let matchedFields = 0;

    // Build searchable text for each field
    const fields = {
        name: salon.name || '',
        category: salon.category || '',
        services: Array.isArray(salon.services)
            ? salon.services.map(s => typeof s === 'string' ? s : s.name || '').join(' ')
            : '',
        address: salon.address || '',
        description: salon.description || ''
    };

    for (const [fieldName, fieldText] of Object.entries(fields)) {
        const fieldTokens = tokenize(fieldText);
        const weight = FIELD_WEIGHTS[fieldName] || 1.0;
        let fieldScore = 0;

        for (const queryTerm of expandedTerms) {
            for (const fieldToken of fieldTokens) {
                // Exact match
                if (fieldToken === queryTerm) {
                    fieldScore += 1.0 * weight;
                }
                // Partial/substring match
                else if (fieldToken.includes(queryTerm) || queryTerm.includes(fieldToken)) {
                    fieldScore += 0.6 * weight;
                }
                // Fuzzy match (typo tolerance)
                else if (isFuzzyMatch(queryTerm, fieldToken)) {
                    fieldScore += 0.4 * weight;
                }
            }
        }

        // Bonus for original (non-expanded) query terms matching
        for (const originalTerm of queryTerms) {
            if (fieldText.toLowerCase().includes(originalTerm)) {
                fieldScore += 1.5 * weight; // big bonus for exact phrase match
            }
        }

        if (fieldScore > 0) {
            matchedFields++;
            totalScore += fieldScore;
        }
    }

    // Bonus for matching multiple fields (cross-field relevance)
    if (matchedFields > 1) {
        totalScore *= (1 + matchedFields * 0.15);
    }

    // Boost by rating (quality signal)
    if (salon.rating) {
        totalScore *= (1 + (salon.rating / 10));
    }

    return Math.round(totalScore * 100) / 100;
}

/**
 * BERT-Inspired Search
 * 
 * @param {string} query - User search query
 * @param {Array} salonData - Array of salon objects
 * @param {Object} options - Optional configuration
 * @returns {Array} Ranked results with relevance scores
 */
const bertSearch = (query, salonData, options = {}) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        console.log('🔍 BERT Search: Empty query, returning all results');
        return salonData;
    }

    if (!Array.isArray(salonData) || salonData.length === 0) {
        return [];
    }

    const { minScore = 0.5, maxResults = 50 } = options;

    console.log(`🔍 BERT Search: Processing query "${query}"`);

    // Step 1: Tokenize query
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return salonData;

    // Step 2: Expand with synonyms
    const expandedTerms = expandWithSynonyms(queryTerms);
    console.log(`   Expanded terms: [${expandedTerms.join(', ')}]`);

    // Step 3: Score each salon
    const scoredResults = salonData.map(salon => ({
        ...salon,
        _relevanceScore: calculateRelevanceScore(queryTerms, expandedTerms, salon)
    }));

    // Step 4: Filter by minimum score and sort by relevance
    const filtered = scoredResults
        .filter(s => s._relevanceScore >= minScore)
        .sort((a, b) => b._relevanceScore - a._relevanceScore)
        .slice(0, maxResults);

    console.log(`   Found ${filtered.length} results (min score: ${minScore})`);

    return filtered;
};

module.exports = bertSearch;
