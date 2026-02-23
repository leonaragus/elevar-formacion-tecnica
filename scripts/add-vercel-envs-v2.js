const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Read .env.local
const envPath = path.join(process.cwd(), '.env.local');
console.log('Reading from:', envPath);
if (!fs.existsSync(envPath)) {
    console.error('No se encontró .env.local');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
        const parts = line.split('=');
        const key = parts[0];
        const value = parts.slice(1).join('=');
        return { key, value };
    });

console.log(`Encontradas ${envVars.length} variables.`);

async function addEnv(key, value) {
    return new Promise((resolve, reject) => {
        console.log(`Adding ${key}...`);
        
        // Check if exists first (optional, but 'vercel env add' might prompt if exists)
        // Actually, 'vercel env add' asks for value interactively if not piped.
        // We will pipe the value to stdin.
        
        const child = spawn('cmd.exe', ['/c', 'npx', 'vercel', 'env', 'add', key, 'production'], {
            stdio: ['pipe', 'inherit', 'inherit'], // Pipe stdin, inherit stdout/stderr
            shell: true
        });

        // Write value to stdin
        child.stdin.write(value);
        child.stdin.end();

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${key} added/updated.`);
                resolve();
            } else {
                console.log(`⚠️ ${key} process exited with code ${code}. It might already exist.`);
                // We resolve anyway to continue
                resolve();
            }
        });

        child.on('error', (err) => {
            console.error(`❌ Error adding ${key}:`, err);
            resolve(); // Continue
        });
    });
}

async function run() {
    for (const { key, value } of envVars) {
        // Skip comments or empty
        if (!key) continue;
        
        await addEnv(key, value);
        // Small delay to be safe
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log('All done.');
}

run();
