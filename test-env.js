require('dotenv').config();
console.log('--- ENV CHECK ---');
console.log('JWT_SECRET:', !!process.env.JWT_SECRET);
console.log('JWT_REFRESH_SECRET:', !!process.env.JWT_REFRESH_SECRET);
console.log('PORT:', process.env.PORT);
console.log('-----------------');
