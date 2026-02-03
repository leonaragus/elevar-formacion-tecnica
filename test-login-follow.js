
async function run() {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const body = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="email"\r\n` +
    `\r\n` +
    `test@example.com\r\n` +
    `--${boundary}--\r\n`;

  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body,
      redirect: 'follow'
    });

    console.log('Final URL:', res.url);
    console.log('Status:', res.status);
    const text = await res.text();
    // console.log('Body Preview:', text.substring(0, 500)); 
    console.log('Contains "Mis Cursos":', text.includes('Mis Cursos'));
    console.log('Contains "Acceso alumnos":', text.includes('Acceso alumnos'));
  } catch (e) {
    console.error(e);
  }
}

run();
