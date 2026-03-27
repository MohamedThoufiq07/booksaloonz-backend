const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:\\Users\\DELL\\Desktop\\New folder (2)\\final year project\\booksaloonz backend\\.env' });

console.log('Testing connection to:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('SUCCESS: MongoDB Atlas Connected!');
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILURE: Connection failed!');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        if (err.message.includes('querySrv')) {
            console.error('NOTE: This is usually a DNS SRV resolution failure.');
        }
        process.exit(1);
    });
