const { initializeApp, cert } = require('firebase-admin/app');

const decodedKey = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decodedKey);

initializeApp({
  credential: cert(serviceAccount),
});
