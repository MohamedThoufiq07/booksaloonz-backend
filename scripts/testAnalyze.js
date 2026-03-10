/**
 * Quick test for the hairstyle analyze endpoint
 * Downloads a sample face image and sends it to the API
 */
const http = require('http');
const https = require('https');
const FormData = require('form-data') || null;

// Download a small test face image
function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const go = (u) => {
            const mod = u.startsWith('https') ? https : http;
            mod.get(u, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) return go(res.headers.location);
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            }).on('error', reject);
        };
        go(url);
    });
}

async function test() {
    console.log('Downloading test face image...');
    // Use a small face image from picsum
    const imgBuf = await downloadImage('https://thispersondoesnotexist.com');
    console.log('Image downloaded:', imgBuf.length, 'bytes');

    // Manual multipart form construction (no external deps needed)
    const boundary = '----TestBoundary' + Date.now();
    const fieldName = 'faceImage';
    const fileName = 'test-face.jpg';

    const header = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n` +
        `Content-Type: image/jpeg\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, imgBuf, footer]);

    const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/hairstyle/analyze',
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
        }
    };

    console.log('Sending to /api/hairstyle/analyze...');
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            try {
                const json = JSON.parse(data);
                console.log('Response:', JSON.stringify(json, null, 2));
            } catch (e) {
                console.log('Raw response:', data.substring(0, 500));
            }
        });
    });
    req.on('error', (e) => console.error('Request error:', e.message));
    req.write(body);
    req.end();
}

test().catch(e => console.error('Test failed:', e.message));
