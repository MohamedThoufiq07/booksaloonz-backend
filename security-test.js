// Use native fetch (Node 18+)
const BASE_URL = 'http://localhost:5000/api';

async function securityAudit() {
    console.log('--- STARTING COMPREHENSIVE SECURITY AUDIT ---');

    console.log('\n[1] Creating User A and User B...');
    let tokenA, tokenB, bookingIdA;

    try {
        const resA = await fetch(`${BASE_URL}/auth/user/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'User A', email: `usera_${Date.now()}@test.com`, password: 'password123' })
        });
        tokenA = (await resA.json()).token;

        const resB = await fetch(`${BASE_URL}/auth/user/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'User B', email: `userb_${Date.now()}@test.com`, password: 'password123' })
        });
        tokenB = (await resB.json()).token;

        // Need a salon to book
        const salonRes = await fetch(`${BASE_URL}/salons/search?query=`);
        const salons = (await salonRes.json()).data;
        if (!salons || salons.length === 0) throw new Error('No salons found');
        const salonId = salons[0]._id;

        console.log(`[2] User A creating a booking for salon ${salonId}...`);
        const bookRes = await fetch(`${BASE_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': tokenA },
            body: JSON.stringify({ salonId, service: 'Haircut', price: 100, date: '2026-12-25', time: '10:00' })
        });
        const bookData = await bookRes.json();
        bookingIdA = bookData.booking._id;
        console.log(`Booking ID A: ${bookingIdA}`);

        console.log(`\n[3] IDOR TEST: User B trying to cancel User A's booking...`);
        const hackRes = await fetch(`${BASE_URL}/bookings/${bookingIdA}/cancel`, {
            method: 'PUT',
            headers: { 'x-auth-token': tokenB }
        });
        const hackData = await hackRes.json();
        if (hackRes.status === 403) {
            console.log('✅ PASS: IDOR Cancel Blocked (403)');
        } else {
            console.log('❌ FAIL: User B was able to modify/cancel User A\'s booking! Status: ' + hackRes.status);
        }

        console.log(`\n[4] IDOR TEST: User B trying to view User A's confidential booking details (if any endpoint existed)...`);
        // Currently we only have "my bookings" which filters by session, which is safe.

        console.log(`\n[5] SENSITIVE DATA LEAK: Checking /auth/me for passwords...`);
        const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: { 'x-auth-token': tokenA } });
        const meData = await meRes.json();
        if (meData.user.password || meData.user.refreshToken) {
            console.log('❌ FAIL: Sensitive data (password/hash) leaked in /me!');
        } else {
            console.log('✅ PASS: No passwords/hashes leaked in /me');
        }

    } catch (e) { console.log('Audit Error: ' + e.message); }

    console.log('\n--- SECURITY AUDIT COMPLETE ---');
}

securityAudit();
