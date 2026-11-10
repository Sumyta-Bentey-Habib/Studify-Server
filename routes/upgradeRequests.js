const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { collections } = require('../config/db');
const { verifyFirebaseToken } = require('../middleware/auth');

const router = Router();

// Student: submit an upgrade request
router.post('/', verifyFirebaseToken, async (req, res) => {
  const userEmail = req.user.email;

  const user = await collections.users.findOne({ email: userEmail });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const existing = await collections.upgradeRequests.findOne({
    userId: user._id.toString(),
    status: 'pending',
  });

  if (existing) return res.status(400).json({ message: 'Upgrade request already pending' });

  const newRequest = {
    userId: user._id.toString(),
    message: req.body.message || 'No message provided',
    status: 'pending',
    createdAt: new Date(),
  };

  await collections.upgradeRequests.insertOne(newRequest);
  res.status(201).json({ message: 'Upgrade request submitted', request: newRequest });
});

// Admin: list all upgrade requests
router.get('/', verifyFirebaseToken, async (req, res) => {
  const requests = await collections.upgradeRequests.find().toArray();
  res.send(requests);
});

// Admin: approve an upgrade request
router.post('/:id/approve', verifyFirebaseToken, async (req, res) => {
  const request = await collections.upgradeRequests.findOne({ _id: new ObjectId(req.params.id) });
  if (!request) return res.status(404).json({ message: 'Upgrade request not found' });

  await collections.upgradeRequests.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: 'approved' } }
  );

  await collections.users.updateOne(
    { _id: new ObjectId(request.userId) },
    { $set: { role: 'mentor' } }
  );

  res.send({ message: 'Request approved & user upgraded to mentor.' });
});

// Admin: reject an upgrade request
router.post('/:id/reject', verifyFirebaseToken, async (req, res) => {
  const request = await collections.upgradeRequests.findOne({ _id: new ObjectId(req.params.id) });
  if (!request) return res.status(404).json({ message: 'Upgrade request not found' });

  await collections.upgradeRequests.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: 'rejected' } }
  );

  res.send({ message: 'Request rejected.' });
});

module.exports = router;
