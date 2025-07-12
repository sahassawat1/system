// backend-nodejs/config/firebaseAdmin.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// In production, you should use environment variables for the service account
try {
  const serviceAccount = require('./authapp-35455-firebase-adminsdk-fbsvc-606a7bd011.json');
  
  console.log('Firebase Admin SDK initialization...');
  console.log('Service account loaded:', {
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email ? '✅ Set' : '❌ Missing'
  });

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://your-project-id.firebaseio.com" // Replace with your Firebase project URL
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  console.error('Make sure the service account JSON file exists and is valid');
  throw error;
}

module.exports = admin;