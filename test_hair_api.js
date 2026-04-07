const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testHairTracker() {
    try {
        const formData = new FormData();
        // create a dummy buffer as a file
        formData.append('image', Buffer.alloc(100), { filename: 'test.jpg', contentType: 'image/jpeg' });
        formData.append('gender', 'male');
        formData.append('faceShape', 'Oval');

        console.log("Calling /api/hairtracker/analyze-hair...");
        const res = await axios.post('http://localhost:5000/api/hairtracker/analyze-hair', formData, {
            headers: formData.getHeaders()
        });

        console.log("Response:", JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

testHairTracker();
