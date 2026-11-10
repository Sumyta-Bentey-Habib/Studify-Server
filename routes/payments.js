const { Router } = require('express');
const { ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { collections } = require('../config/db');
const { verifyFirebaseToken } = require('../middleware/auth');

const router = Router();

// Create a Stripe checkout session
router.post('/create-checkout-session', verifyFirebaseToken, async (req, res) => {
  const { title, amount, bookedSessionId } = req.body;

  if (!title || !amount || !bookedSessionId) {
    return res.status(400).json({ error: 'Missing title, amount or bookedSessionId' });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: title },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/cancel`,
    client_reference_id: bookedSessionId,
  });

  res.json({ url: session.url });
});

// Verify a Stripe payment session and mark booking as paid
router.get('/verify-payment-session', verifyFirebaseToken, async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ paid: false });

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === 'paid' && session.client_reference_id) {
    await collections.bookedSessions.updateOne(
      { _id: new ObjectId(session.client_reference_id) },
      { $set: { paid: true } }
    );
    return res.json({ paid: true });
  }

  return res.json({ paid: false });
});

module.exports = router;
