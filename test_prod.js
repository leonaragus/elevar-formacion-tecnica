
const https = require('https');

const options = {
  hostname: 'supabase-next14.vercel.app',
  path: '/api/admin/inscripciones',
  method: 'GET',
  headers: {
    'Cookie': 'prof_code_ok=1'
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
