import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const env = process.env;

const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);

async function run() {
  try {
    console.log("Minting custom token...");
    const customToken = await auth.createCustomToken("test-uid-123");
    
    console.log("Exchanging for ID token...");
    const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    });
    
    if (!res.ok) {
      console.log("Failed to exchange token:", await res.text());
      return;
    }
    const data = await res.json();
    const idToken = data.idToken;
    
    console.log("Creating session cookie...");
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: 60 * 60 * 1000 * 24 * 5 });
    console.log("Session cookie created successfully! Length:", sessionCookie.length);
  } catch (err) {
    console.error("ERROR CREATING SESSION COOKIE:");
    console.error(err);
  }
}

run();
