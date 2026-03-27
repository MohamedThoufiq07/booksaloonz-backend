const BASE_URL = 'http://localhost:5000/api';

async function testLogin() {
    console.log('--- TESTING SIGNUP AND LOGIN ---');
    const email = `test_${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`[1] Signing up: ${email} / ${password}`);
    const resS = await fetch(`${BASE_URL}/auth/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', email, password })
    });
    const sData = await resS.json();
    console.log('Signup Status:', resS.status, sData.success ? 'SUCCESS' : 'FAILED');

    if (!sData.success) return;

    console.log(`[2] Logging in: ${email} / ${password}`);
    const resL = await fetch(`${BASE_URL}/auth/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const lData = await resL.json();
    console.log('Login Status:', resL.status, lData.success ? 'SUCCESS' : 'FAILED');
    if (!lData.success) console.log('Error message:', lData.message);
}

testLogin();
