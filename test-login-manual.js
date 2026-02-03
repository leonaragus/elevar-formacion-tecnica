
const http = require('http');
const querystring = require('querystring');

const postData = querystring.stringify({
  email: 'test@example.com'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded', // FormData suele enviarse como multipart, pero el body parser de Next lo maneja o necesitamos simular multipart.
    // Espera, req.formData() espera multipart/form-data.
    // Voy a usar un boundary simple.
  }
};

// Mejor uso fetch nativo de Node 18+ si está disponible, o construyo el body manualmente.
// Como estoy en Node, voy a usar un script más moderno si es posible, o simplemente usar curl en powershell.

// Voy a usar un script simple con fetch (Node 18+ lo tiene global).
async function run() {
  const FormData = require('form-data'); // Podría no estar instalado.
  
  // Voy a construir el body raw multipart manualmente para no depender de librerías.
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const body = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="email"\r\n` +
    `\r\n` +
    `test@example.com\r\n` +
    `--${boundary}--\r\n`;

  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: body,
    redirect: 'manual' // Importante para ver el 307
  });

  console.log('Status:', res.status);
  console.log('Location:', res.headers.get('location'));
  console.log('Set-Cookie:', res.headers.get('set-cookie'));
}

run().catch(console.error);
