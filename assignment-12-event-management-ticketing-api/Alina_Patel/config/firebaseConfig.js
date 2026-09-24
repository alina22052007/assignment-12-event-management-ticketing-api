const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let serviceAccount = null;

// Option 1: Load from FIREBASE_SERVICE_ACCOUNT_JSON env variable (Production / Render)
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
    if (raw.startsWith('{')) {
      serviceAccount = JSON.parse(raw);
    } else {
      // Decode Base64 if provided in encoded format
      const decoded = Buffer.from(raw, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
    }
  } catch (err) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON environment variable:', err.message);
  }
}

// Option 2: Fallback to local serviceAccountKey.json file (Local Development)
if (!serviceAccount) {
  const customPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const defaultPath = path.join(__dirname, '..', 'serviceAccountKey.json');
  const targetPath = customPath ? path.resolve(customPath) : defaultPath;

  if (fs.existsSync(targetPath)) {
    try {
      serviceAccount = require(targetPath);
      console.log(`📁 Loaded Firebase credentials from local file: ${targetPath}`);
    } catch (err) {
      console.error(`❌ Failed to load credentials from ${targetPath}:`, err.message);
    }
  }
}

// Initialize Firebase Admin App
const existingApps = typeof admin.getApps === 'function' ? admin.getApps() : (admin.apps || []);

if (!existingApps.length) {
  if (serviceAccount) {
    // Format private key if needed (fix escaped newlines)
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    try {
      const certCredential = typeof admin.cert === 'function' 
        ? admin.cert(serviceAccount) 
        : (admin.credential && admin.credential.cert ? admin.credential.cert(serviceAccount) : serviceAccount);

      admin.initializeApp({
        credential: certCredential
      });
      console.log('✅ Firebase Admin SDK initialized successfully.');
    } catch (err) {
      console.error('❌ Error initializing Firebase Admin with serviceAccount:', err.message);
    }
  } else {
    // Default app credential fallback or warn if unconfigured
    try {
      admin.initializeApp();
      console.log('⚠️ Firebase Admin initialized with default application credentials.');
    } catch (err) {
      console.warn('⚠️ Firebase credentials not configured yet. Please supply FIREBASE_SERVICE_ACCOUNT_JSON in .env or provide serviceAccountKey.json.');
    }
  }
}

let db;
try {
  db = typeof getFirestore === 'function' ? getFirestore() : admin.firestore();
  if (db && typeof db.settings === 'function') {
    db.settings({ ignoreUndefinedProperties: true });
  }
} catch (err) {
  console.warn('⚠️ Firestore instance initialization pending valid credentials:', err.message);
}

module.exports = { admin, db };
