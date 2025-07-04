#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const canisterIdsPath = path.join(__dirname, '../.dfx/local/canister_ids.json');
const envPath = path.join(__dirname, 'src/frontend/.env');

try {
  const canisterIds = JSON.parse(fs.readFileSync(canisterIdsPath, 'utf8'));
  
  let envContent = '# Canister IDs for local development\n';
  
  for (const [name, ids] of Object.entries(canisterIds)) {
    if (ids.local && !name.startsWith('__')) {
      const envName = name.toUpperCase();
      envContent += `VITE_CANISTER_ID_${envName}=${ids.local}\n`;
    }
  }
  
  envContent += 'VITE_DFX_NETWORK=local\n';
  
  fs.writeFileSync(envPath, envContent);
  console.log('Generated .env file with canister IDs');
  console.log(envContent);
} catch (error) {
  console.error('Error generating .env file:', error);
  process.exit(1);
}
