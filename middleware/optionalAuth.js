const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    let token = req.header('x-auth-token') || (req.header('Authorization')?.startsWith('Bearer ') ? req.header('Authorization').split(' ')[1] : null);

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        req.user = null;
        next();
    }
};
