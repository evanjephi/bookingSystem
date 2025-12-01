// Quick test script to check seed endpoint
// Run with: node test-seed.js

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/seed',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('Testing seed endpoint...');
console.log('Make sure your dev server is running on http://localhost:3000');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\nResponse:', JSON.stringify(json, null, 2));
      
      if (json.success) {
        console.log('\n✅ Seed successful!');
      } else {
        console.log('\n❌ Seed failed:', json.error);
        if (json.details) {
          console.log('Details:', json.details);
        }
      }
    } catch (e) {
      console.log('\nRaw response:', data);
      console.log('Error parsing JSON:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request failed:', error.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure your dev server is running: npm run dev');
  console.log('2. Check that the server is listening on port 3000');
  console.log('3. Verify your .env.local file has FIREBASE_SERVICE_ACCOUNT set');
});

req.end();


