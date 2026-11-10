const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { collections } = require('../config/db');
const { verifyFirebaseToken } = require('../middleware/auth');

const router = Router();

router.post('/', verifyFirebaseToken, async (req, res) => {
  const result = await collections.materials.insertOne(req.body);
  res.send(result);
});

router.get('/', async (req, res) => {
  const materials = await collections.materials.find().toArray();
  res.send(materials);
});

router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  const result = await collections.materials.deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).send({ message: 'Material not found' });
  res.send({ message: 'Material deleted successfully' });
});

module.exports = router;
