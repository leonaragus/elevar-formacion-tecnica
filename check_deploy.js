
const https = require('https');

const url = 'https://supabase-next14.vercel.app/admin/cursos';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    if (data.includes('Admin Build')) {
      console.log('FOUND: Admin Build string is present.');
      const match = data.match(/Admin Build: ([^<]+)/);
      console.log('Timestamp:', match ? match[1] : 'unknown');
    } else {
      console.log('NOT FOUND: Admin Build string is missing.');
    }
    
    if (data.includes('Diagnóstico')) {
        console.log('FOUND: Diagnóstico button is present.');
    } else {
        console.log('NOT FOUND: Diagnóstico button is missing.');
    }
  });
}).on('error', (e) => {
  console.error(e);
});
