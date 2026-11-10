const admin = require('firebase-admin');

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send({ message: 'Unauthorized: No token provided' });
  }

  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).send({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = { verifyFirebaseToken };
