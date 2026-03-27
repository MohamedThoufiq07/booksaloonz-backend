// Validation Testing
const BASE_URL = 'http://localhost:5000/api';

async function validationAudit() {
    console.log('--- STARTING VALIDATION AUDIT ---');

    console.log('\n[1] TEST: Empty signup body');
    const res1 = await fetch(`${BASE_URL}/auth/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    const data1 = await res1.json();
    if (res1.status === 400) {
        console.log('✅ PASS: Empty body rejected with 400');
        console.log('Error message: ' + data1.message);
    } else {
        console.log('❌ FAIL: Status: ' + res1.status);
    }

    console.log('\n[2] TEST: Invalid email format');
    const res2 = await fetch(`${BASE_URL}/auth/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Invalid Email', email: 'not-an-email', password: 'password123' })
    });
    const data2 = await res2.json();
    if (res2.status === 400 && data2.message.includes('email')) {
        console.log('✅ PASS: Invalid email rejected');
    } else {
        console.log('❌ FAIL: Status: ' + res2.status + ', Message: ' + data2.message);
    }

    console.log('\n[3] TEST: Short password');
    const res3 = await fetch(`${BASE_URL}/auth/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Short Password', email: `test_${Date.now()}@test.com`, password: '123' })
    });
    const data3 = await res3.json();
    if (res3.status === 400 && data3.message.includes('at least 6 characters')) {
        console.log('✅ PASS: Short password rejected');
    } else {
        console.log('❌ FAIL: Status: ' + res3.status + ', Message: ' + data3.message);
    }

    console.log('\n--- VALIDATION AUDIT COMPLETE ---');
}

validationAudit();
