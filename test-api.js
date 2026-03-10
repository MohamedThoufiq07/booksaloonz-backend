// const fetch = require('node-fetch'); // Native fetch in Node 18+

const BASE_URL = 'http://localhost:5000/api';
let userToken = '';
let partnerToken = '';
let salonId = '';
let productId = '';
let bookingId = '';

const color = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
};

const log = (msg, success) => {
    console.log(`${success ? color.green : color.red}${success ? '✓' : '✗'} ${msg}${color.reset}`);
};

async function runTests() {
    console.log('Starting API Tests...\n');

    // 1. User Signup
    try {
        const res = await fetch(`${BASE_URL}/auth/user/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email: `testuser_${Date.now()}@example.com`,
                password: 'password123'
            })
        });
        const data = await res.json();
        if (data.success) {
            userToken = data.token;
            log('User Signup Successful', true);
        } else {
            log('User Signup Failed: ' + data.message, false);
        }
    } catch (e) { log('User Signup Error: ' + e.message, false); }

    // 2. Partner Signup
    try {
        const res = await fetch(`${BASE_URL}/auth/partner/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ownerName: 'Test Partner',
                email: `partner_${Date.now()}@example.com`,
                password: 'password123',
                salonName: 'Test Salon',
                address: '123 Test St',
                startingPrice: 50
            })
        });
        const data = await res.json();
        if (data.success) {
            partnerToken = data.token;
            log('Partner Signup Successful', true);

            // Get salon ID
            if (data.user.salonName) {
                // Ideally the signup response should return the salon ID or we fetch it.
                // For now, let's search for it or fetch "me" to get details if needed, 
                // but the current auth response doesn't give salon ID directly.
                // Let's search for it.
                const searchRes = await fetch(`${BASE_URL}/salons/search?query=Test Salon`);
                const searchData = await searchRes.json();
                if (searchData.data && searchData.data.length > 0) {
                    salonId = searchData.data[0]._id;
                    log('Salon ID retrieved: ' + salonId, true);
                }
            }
        } else {
            log('Partner Signup Failed: ' + data.message, false);
        }
    } catch (e) { log('Partner Signup Error: ' + e.message, false); }

    // 3. Update Salon
    if (partnerToken && salonId) {
        try {
            const res = await fetch(`${BASE_URL}/salons/${salonId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': partnerToken
                },
                body: JSON.stringify({
                    name: 'Updated Test Salon',
                    rating: 4.5
                })
            });
            const data = await res.json();
            if (data.success && data.data.name === 'Updated Test Salon') {
                log('Update Salon Successful', true);
            } else {
                log('Update Salon Failed: ' + (data.message || 'Unknown'), false);
            }
        } catch (e) { log('Update Salon Error: ' + e.message, false); }
    }

    // 4. Add Product
    if (partnerToken) {
        try {
            const res = await fetch(`${BASE_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': partnerToken
                },
                body: JSON.stringify({
                    name: 'Test Product',
                    category: 'Hair',
                    price: 25
                })
            });
            const data = await res.json();
            if (data.success) {
                productId = data.data._id;
                log('Add Product Successful', true);
            } else {
                log('Add Product Failed: ' + data.message, false);
            }
        } catch (e) { log('Add Product Error: ' + e.message, false); }
    }

    // 5. Update Product
    if (partnerToken && productId) {
        try {
            const res = await fetch(`${BASE_URL}/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': partnerToken
                },
                body: JSON.stringify({
                    price: 30
                })
            });
            const data = await res.json();
            if (data.success && data.data.price === 30) {
                log('Update Product Successful', true);
            } else {
                log('Update Product Failed: ' + data.message, false);
            }
        } catch (e) { log('Update Product Error: ' + e.message, false); }
    }

    // 6. Create Booking
    if (userToken && salonId) {
        try {
            const res = await fetch(`${BASE_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': userToken
                },
                body: JSON.stringify({
                    salon: salonId,
                    service: 'Haircut',
                    price: 50,
                    date: '2023-12-25',
                    time: '10:00'
                })
            });
            const data = await res.json();
            if (data.success) {
                bookingId = data.data._id;
                log('Create Booking Successful', true);
            } else {
                log('Create Booking Failed: ' + data.message, false);
            }
        } catch (e) { log('Create Booking Error: ' + e.message, false); }
    }

    // 7. Cancel Booking
    if (userToken && bookingId) {
        try {
            const res = await fetch(`${BASE_URL}/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': userToken
                }
            });
            const data = await res.json();
            if (data.success) {
                log('Cancel Booking Successful', true);
            } else {
                log('Cancel Booking Failed: ' + data.message, false);
            }
        } catch (e) { log('Cancel Booking Error: ' + e.message, false); }
    }

    // 8. Delete Product
    if (partnerToken && productId) {
        try {
            const res = await fetch(`${BASE_URL}/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': partnerToken
                }
            });
            const data = await res.json();
            if (data.success) {
                log('Delete Product Successful', true);
            } else {
                log('Delete Product Failed: ' + data.message, false);
            }
        } catch (e) { log('Delete Product Error: ' + e.message, false); }
    }

    // 9. Delete Salon
    if (partnerToken && salonId) {
        try {
            const res = await fetch(`${BASE_URL}/salons/${salonId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': partnerToken
                }
            });
            const data = await res.json();
            if (data.success) {
                log('Delete Salon Successful', true);
            } else {
                log('Delete Salon Failed: ' + data.message, false);
            }
        } catch (e) { log('Delete Salon Error: ' + e.message, false); }
    }

    console.log('\nTest Sequence Completed.');
}

runTests();
