const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'environments', 'environment.prod.ts');
const targetDevPath = path.join(__dirname, 'src', 'environments', 'environment.ts');

// Leer variable de entorno de Railway
let apiUrl = process.env.apiUrl || process.env.API_URL || 'http://localhost:3000/api';

// 1. Limpiar comillas iniciales o finales (por si se configuraron con comillas en el panel de Railway)
apiUrl = apiUrl.replace(/^['"]|['"]$/g, '').trim();

// 2. Asegurar que empiece con http:// o https://
if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
  apiUrl = 'https://' + apiUrl;
}

// 3. Asegurar que termine en /api (ya que el backend tiene todas sus rutas bajo /api/...)
if (!apiUrl.endsWith('/api') && !apiUrl.endsWith('/api/')) {
  apiUrl = apiUrl.endsWith('/') ? apiUrl + 'api' : apiUrl + '/api';
}

const envConfigFile = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}'
};
`;

const devEnvConfigFile = `export const environment = {
  production: false,
  apiUrl: '${apiUrl}'
};
`;

// Asegurar que exista la carpeta src/environments
const envDir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(envDir)){
    fs.mkdirSync(envDir, { recursive: true });
}

fs.writeFileSync(targetPath, envConfigFile);
fs.writeFileSync(targetDevPath, devEnvConfigFile);
console.log(`[SetEnv] Archivos de entorno generados exitosamente con la URL: ${apiUrl}`);
