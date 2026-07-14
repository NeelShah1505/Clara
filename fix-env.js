const fs = require('fs');
let env = fs.readFileSync('.env.local', 'utf-8');
// It currently has \\n inside the FIREBASE_SERVICE_ACCOUNT_JSON. We need to replace \\n with \n
env = env.replace(/\\\\n/g, '\\n');
fs.writeFileSync('.env.local', env);
console.log("Fixed!");
