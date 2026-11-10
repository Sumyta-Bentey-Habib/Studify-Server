const { Router } = require('express');
const { collections } = require('../config/db');
const { verifyFirebaseToken } = require('../middleware/auth');

const router = Router();

router.post('/', verifyFirebaseToken, async (req, res) => {
  const material = req.body;
  material.userEmail = req.user.email;
  material.createdAt = new Date();
  const result = await collections.studentMaterials.insertOne(material);
  res.send(result);
});

router.get('/', verifyFirebaseToken, async (req, res) => {
  const materials = await collections.studentMaterials.find({ userEmail: req.user.email }).toArray();
  res.send(materials);
});

module.exports = router;
