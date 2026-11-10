const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { collections } = require('../config/db');
const { verifyFirebaseToken } = require('../middleware/auth');

const router = Router();

router.post('/', verifyFirebaseToken, async (req, res) => {
  const result = await collections.sessions.insertOne(req.body);
  res.send(result);
});

router.get('/', async (req, res) => {
  const result = await collections.sessions.find().toArray();
  res.send(result);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).send({ message: 'Invalid session ID' });

  const session = await collections.sessions.findOne({ _id: new ObjectId(id) });
  if (!session) return res.status(404).send({ message: 'Session not found' });

  res.send(session);
});

router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  const result = await collections.sessions.deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).send({ message: 'Session not found' });
  res.send({ message: 'Session deleted successfully' });
});

module.exports = router;
