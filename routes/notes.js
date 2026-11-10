const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { collections } = require('../config/db');
const { verifyFirebaseToken } = require('../middleware/auth');

const router = Router();

router.post('/', verifyFirebaseToken, async (req, res) => {
  const note = req.body;
  if (!note.title || !note.content) return res.status(400).send({ message: 'Missing required fields' });

  note.userEmail = req.user.email;
  note.createdAt = new Date();

  const result = await collections.notes.insertOne(note);
  res.send(result);
});

router.get('/', verifyFirebaseToken, async (req, res) => {
  const notes = await collections.notes.find({ userEmail: req.user.email }).toArray();
  res.send(notes);
});

router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).send({ message: 'Invalid note ID' });

  const result = await collections.notes.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) return res.status(404).send({ message: 'Note not found' });
  res.send({ message: 'Note deleted successfully' });
});

module.exports = router;
