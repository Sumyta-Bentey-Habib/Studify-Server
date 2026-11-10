const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { collections } = require('../config/db');
const { verifyFirebaseToken } = require('../middleware/auth');

const router = Router();

router.post('/', verifyFirebaseToken, async (req, res) => {
  const booking = req.body;

  if (!booking.sessionId) return res.status(400).send({ message: 'Missing sessionId' });

  booking.studentEmail = req.user.email;

  const existing = await collections.bookedSessions.findOne({
    sessionId: booking.sessionId,
    studentEmail: booking.studentEmail,
  });

  if (existing) return res.status(409).send({ message: 'Session already booked by this user' });

  booking.paid = false;
  booking.bookedAt = new Date();

  const result = await collections.bookedSessions.insertOne(booking);
  res.send(result);
});

router.get('/', verifyFirebaseToken, async (req, res) => {
  const bookings = await collections.bookedSessions.find({ studentEmail: req.user.email }).toArray();
  res.send(bookings);
});

router.patch('/:id/mark-paid', verifyFirebaseToken, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).send({ message: 'Invalid booking ID' });

  const result = await collections.bookedSessions.updateOne(
    { _id: new ObjectId(id) },
    { $set: { paid: true } }
  );

  if (result.matchedCount === 0) return res.status(404).send({ message: 'Booking not found' });
  res.send({ message: 'Booking marked as paid successfully' });
});

router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  const result = await collections.bookedSessions.deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).send({ message: 'Booked session not found' });
  res.send({ message: 'Booked session deleted successfully' });
});

module.exports = router;
