require('dotenv').config({ path: '.env.local' });
try {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("Not set");
  const parsed = JSON.parse(json);
  console.log("Valid JSON. Keys:", Object.keys(parsed));
} catch (e) {
  console.error("Error:", e);
}
