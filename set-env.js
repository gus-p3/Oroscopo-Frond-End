const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'environments', 'environment.prod.ts');
const targetDevPath = path.join(__dirname, 'src', 'environments', 'environment.ts');

// Leer variable de entorno de Railway (apiUrl o API_URL)
const apiUrl = process.env.apiUrl || process.env.API_URL || 'http://localhost:3000/api';

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
console.log(`[SetEnv] Archivos de entorno generados dinámicamente con apiUrl: ${apiUrl}`);
