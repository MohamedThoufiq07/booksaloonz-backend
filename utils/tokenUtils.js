const jwt = require('jsonwebtoken');

/**
 * Generate Access and Refresh Tokens
 * @param {string} id - User ID
 * @param {string} role - User Role
 * @returns {object} { accessToken, refreshToken }
 */
const generateTokens = (id, role) => {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT Secrets (SECRET or REFRESH_SECRET) missing in Environment Variables.');
    }

    const accessToken = jwt.sign(
        { id, role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
        { id, role }, 
        process.env.JWT_REFRESH_SECRET, 
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

module.exports = { generateTokens };
