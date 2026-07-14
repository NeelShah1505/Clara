import fs from 'fs';

const raw = fs.readFileSync('.env.local', 'utf-8');
const lines = raw.split('\n');

let cleaned = [];
for (let line of lines) {
  // Remove the bad raw JSON block from lines 20-31
  if (line.trim().startsWith('"type":') ||
      line.trim().startsWith('"project_id":') ||
      line.trim().startsWith('"private_key_id":') ||
      line.trim().startsWith('"private_key":') ||
      line.trim().startsWith('"client_email":') ||
      line.trim().startsWith('"client_id":') ||
      line.trim().startsWith('"auth_uri":') ||
      line.trim().startsWith('"token_uri":') ||
      line.trim().startsWith('"auth_provider_x509_cert_url":') ||
      line.trim().startsWith('"client_x509_cert_url":') ||
      line.trim().startsWith('"universe_domain":') ||
      line.trim() === '}' || line.trim() === '{') {
    continue;
  }
  
  if (line.startsWith('FIREBASE_SERVICE_ACCOUNT_JSON=')) {
    // Re-format the bad escaped string to a properly single-quoted JSON string
    let badJsonStr = line.substring('FIREBASE_SERVICE_ACCOUNT_JSON='.length);
    if (badJsonStr.startsWith('"') && badJsonStr.endsWith('"')) {
      badJsonStr = badJsonStr.substring(1, badJsonStr.length - 1);
    }
    // Replace \" with "
    let goodJsonStr = badJsonStr.replace(/\\"/g, '"');
    
    // We should write it out properly escaped
    cleaned.push(`FIREBASE_SERVICE_ACCOUNT_JSON='${goodJsonStr}'`);
  } else {
    cleaned.push(line);
  }
}

fs.writeFileSync('.env.local', cleaned.join('\n'));
console.log("Fixed .env.local!");
