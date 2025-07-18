require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// ✅ Decode the service key from Base64 in env
const decodedKey = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decodedKey);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ✅ JWT verification middleware stays the same
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized: No token provided' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).send({ message: 'Unauthorized: Invalid token' });
  }
};

// MongoDB setup
const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASSWORD}@cluster0.uteipwi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let sessionsCollection;
let materialsCollection;
let bookedSessionsCollection;
let studentMaterialsCollection;
let notesCollection;
let usersCollection;
let upgradeRequestsCollection;

async function run() {
  try {
    //await client.connect();
    const db = client.db("studify");
    sessionsCollection = db.collection("sessions");
    materialsCollection = db.collection("materials");
    bookedSessionsCollection = db.collection("bookedSessions");
    studentMaterialsCollection = db.collection("studentMaterials");
    notesCollection = db.collection("notes");
    usersCollection = db.collection("users");
    upgradeRequestsCollection = db.collection("upgradeRequests");

    // Sessions
    app.post('/sessions', verifyFirebaseToken, async (req, res) => {
      const session = req.body;
      const result = await sessionsCollection.insertOne(session);
      res.send(result);
    });

    app.get('/sessions', async (req, res) => {
      const result = await sessionsCollection.find().toArray();
      res.send(result);
    });

    app.get('/sessions/:id', async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid session ID" });
      const session = await sessionsCollection.findOne({ _id: new ObjectId(id) });
      if (!session) return res.status(404).send({ message: "Session not found" });
      res.send(session);
    });

    // Materials
    app.post('/materials', verifyFirebaseToken, async (req, res) => {
      const material = req.body;
      const result = await materialsCollection.insertOne(material);
      res.send(result);
    });

    app.get('/materials', async (req, res) => {
      const materials = await materialsCollection.find().toArray();
      res.send(materials);
    });

    // Booked Sessions
    app.post('/booked-sessions', verifyFirebaseToken, async (req, res) => {
      const bookedSession = req.body;
      if (!bookedSession.sessionId) return res.status(400).send({ message: "Missing sessionId" });

      // Use email from verified token
      bookedSession.studentEmail = req.user.email;

      const existingBooking = await bookedSessionsCollection.findOne({
        sessionId: bookedSession.sessionId,
        studentEmail: bookedSession.studentEmail,
      });

      if (existingBooking) return res.status(409).send({ message: "Session already booked by this user" });

      bookedSession.paid = false;
      bookedSession.bookedAt = new Date();

      const result = await bookedSessionsCollection.insertOne(bookedSession);
      res.send(result);
    });

    app.get('/booked-sessions', verifyFirebaseToken, async (req, res) => {
      const bookings = await bookedSessionsCollection.find({ studentEmail: req.user.email }).toArray();
      res.send(bookings);
    });

    app.patch('/booked-sessions/:id/mark-paid', verifyFirebaseToken, async (req, res) => {
      const bookingId = req.params.id;
      if (!ObjectId.isValid(bookingId)) return res.status(400).send({ message: "Invalid booking ID" });

      const result = await bookedSessionsCollection.updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: { paid: true } }
      );

      if (result.matchedCount === 0) return res.status(404).send({ message: "Booking not found" });

      res.send({ message: "Booking marked as paid successfully" });
    });

    // Student Materials
    app.post('/student-materials', verifyFirebaseToken, async (req, res) => {
      const material = req.body;
      material.userEmail = req.user.email;
      material.createdAt = new Date();
      const result = await studentMaterialsCollection.insertOne(material);
      res.send(result);
    });

    app.get('/student-materials', verifyFirebaseToken, async (req, res) => {
      const materials = await studentMaterialsCollection.find({ userEmail: req.user.email }).toArray();
      res.send(materials);
    });

    // Notes
    app.post('/notes', verifyFirebaseToken, async (req, res) => {
      const note = req.body;
      if (!note.title || !note.content) return res.status(400).send({ message: "Missing required fields" });
      note.userEmail = req.user.email;
      note.createdAt = new Date();
      const result = await notesCollection.insertOne(note);
      res.send(result);
    });

    app.get('/notes', verifyFirebaseToken, async (req, res) => {
      const notes = await notesCollection.find({ userEmail: req.user.email }).toArray();
      res.send(notes);
    });

    // Users - FORCE role to 'student'
    app.post('/users', verifyFirebaseToken, async (req, res) => {
      const user = req.body;
      if (!user.name || !user.email) return res.status(400).send({ message: "Missing name or email" });

      user.role = "student"; // force role here
      user.createdAt = new Date();

      const existing = await usersCollection.findOne({ email: user.email });
      if (existing) return res.status(409).send({ message: "User already exists" });

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users', verifyFirebaseToken, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    app.get('/users/:email', verifyFirebaseToken, async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).send({ message: "User not found" });
      res.send(user);
    });

    app.patch('/users/:id/role', verifyFirebaseToken, async (req, res) => {
      const userId = req.params.id;
      const { role } = req.body;
      if (!role) return res.status(400).send({ message: "Missing role" });

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role } }
      );

      if (result.matchedCount === 0) return res.status(404).send({ message: "User not found" });

      res.send({ message: "Role updated successfully" });
    });

    // Upgrade Requests
    app.post('/upgrade-request', verifyFirebaseToken, async (req, res) => {
      const message = req.body.message;
      const userEmail = req.user.email;

      const user = await usersCollection.findOne({ email: userEmail });
      if (!user) return res.status(404).json({ message: "User not found" });

      const existing = await upgradeRequestsCollection.findOne({
        userId: user._id.toString(),
        status: "pending",
      });

      if (existing) return res.status(400).json({ message: "Upgrade request already pending" });

      const newRequest = {
        userId: user._id.toString(),
        message: message || "No message provided",
        status: "pending",
        createdAt: new Date(),
      };

      await upgradeRequestsCollection.insertOne(newRequest);
      res.status(201).json({ message: "Upgrade request submitted", request: newRequest });
    });

    app.get('/admin/upgrade-requests', verifyFirebaseToken, async (req, res) => {
      const requests = await upgradeRequestsCollection.find().toArray();
      res.send(requests);
    });

    app.post('/admin/upgrade-requests/:id/approve', verifyFirebaseToken, async (req, res) => {
      const requestId = req.params.id;
      const request = await upgradeRequestsCollection.findOne({ _id: new ObjectId(requestId) });
      if (!request) return res.status(404).json({ message: "Upgrade request not found" });

      await upgradeRequestsCollection.updateOne(
        { _id: new ObjectId(requestId) },
        { $set: { status: "approved" } }
      );

      await usersCollection.updateOne(
        { _id: new ObjectId(request.userId) },
        { $set: { role: "mentor" } }
      );

      res.send({ message: "Request approved & user upgraded to mentor." });
    });

    app.post('/admin/upgrade-requests/:id/reject', verifyFirebaseToken, async (req, res) => {
      const requestId = req.params.id;
      const request = await upgradeRequestsCollection.findOne({ _id: new ObjectId(requestId) });
      if (!request) return res.status(404).json({ message: "Upgrade request not found" });

      await upgradeRequestsCollection.updateOne(
        { _id: new ObjectId(requestId) },
        { $set: { status: "rejected" } }
      );

      res.send({ message: "Request rejected." });
    });

    // Delete routes
    app.delete('/materials/:id', verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const result = await materialsCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) return res.status(404).send({ message: "Material not found" });
      res.send({ message: "Material deleted successfully" });
    });

    app.delete('/sessions/:id', verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const result = await sessionsCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) return res.status(404).send({ message: "Session not found" });
      res.send({ message: "Session deleted successfully" });
    });

    app.delete('/users/:id', verifyFirebaseToken, async (req, res) => {
      const userId = req.params.id;
      const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });
      if (result.deletedCount === 0) return res.status(404).send({ message: "User not found" });
      res.send({ message: "User deleted successfully" });
    });

    app.delete('/booked-sessions/:id', verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const result = await bookedSessionsCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) return res.status(404).send({ message: "Booked session not found" });
      res.send({ message: "Booked session deleted successfully" });
    });

    app.delete('/notes/:id', verifyFirebaseToken, async (req, res) => {
      const noteId = req.params.id;
      if (!ObjectId.isValid(noteId)) return res.status(400).send({ message: 'Invalid note ID' });
      const result = await notesCollection.deleteOne({ _id: new ObjectId(noteId) });
      if (result.deletedCount === 0) return res.status(404).send({ message: 'Note not found' });
      res.send({ message: 'Note deleted successfully' });
    });

    // Stripe checkout session creation
    app.post('/create-checkout-session', verifyFirebaseToken, async (req, res) => {
      const { sessionId, title, amount, bookedSessionId } = req.body;
      if (!title || !amount || !bookedSessionId) return res.status(400).json({ error: "Missing title, amount or bookedSessionId" });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: title },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/cancel`,
        client_reference_id: bookedSessionId,
      });

      res.json({ url: session.url });
    });

    app.get('/verify-payment-session', verifyFirebaseToken, async (req, res) => {
      const { sessionId } = req.query;
      if (!sessionId) return res.status(400).json({ paid: false });

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid" && session.client_reference_id) {
        await bookedSessionsCollection.updateOne(
          { _id: new ObjectId(session.client_reference_id) },
          { $set: { paid: true } }
        );
        return res.json({ paid: true });
      } else {
        return res.json({ paid: false });
      }
    });

   
  } finally {
    // Keep connection alive
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('✅ Studify server running with Firebase JWT auth and default student role!');
});

app.listen(port, () => {
  console.log(`✅ Server listening on port ${port}`);
});
