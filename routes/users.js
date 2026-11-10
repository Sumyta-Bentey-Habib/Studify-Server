const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { collections } = require('../config/db');
const { verifyFirebaseToken } = require('../middleware/auth');

const router = Router();

router.post('/', verifyFirebaseToken, async (req, res) => {
  const user = req.body;
  if (!user.name || !user.email) return res.status(400).send({ message: 'Missing name or email' });

  const existing = await collections.users.findOne({ email: user.email });
  if (existing) return res.status(409).send({ message: 'User already exists' });

  user.role = 'student'; // always default to student on creation
  user.createdAt = new Date();

  const result = await collections.users.insertOne(user);
  res.send(result);
});

router.get('/', verifyFirebaseToken, async (req, res) => {
  const users = await collections.users.find().toArray();
  res.send(users);
});

router.get('/:email', verifyFirebaseToken, async (req, res) => {
  const user = await collections.users.findOne({ email: req.params.email });
  if (!user) return res.status(404).send({ message: 'User not found' });
  res.send(user);
});

router.patch('/:id/role', verifyFirebaseToken, async (req, res) => {
  const { role } = req.body;
  if (!role) return res.status(400).send({ message: 'Missing role' });

  const result = await collections.users.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { role } }
  );

  if (result.matchedCount === 0) return res.status(404).send({ message: 'User not found' });
  res.send({ message: 'Role updated successfully' });
});

router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  const result = await collections.users.deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).send({ message: 'User not found' });
  res.send({ message: 'User deleted successfully' });
});

module.exports = router;
