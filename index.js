require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASSWORD}@cluster0.uteipwi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//  Collections
let sessionsCollection;
let materialsCollection;
let bookedSessionsCollection;
let studentMaterialsCollection;
let notesCollection;
let usersCollection;
let upgradeRequestsCollection;

async function run() {
  try {
    await client.connect();
    const db = client.db("studify");
    sessionsCollection = db.collection("sessions");
    materialsCollection = db.collection("materials");
    bookedSessionsCollection = db.collection("bookedSessions");
    studentMaterialsCollection = db.collection("studentMaterials");
    notesCollection = db.collection("notes");
    usersCollection = db.collection("users");
    upgradeRequestsCollection = db.collection("upgradeRequests");

    //  Sessions
    app.post('/sessions', async (req, res) => {
      const session = req.body;
      const result = await sessionsCollection.insertOne(session);
      res.send(result);
    });

    app.get('/sessions', async (req, res) => {
      const result = await sessionsCollection.find().toArray();
      res.send(result);
    });

    // Materials
    app.post('/materials', async (req, res) => {
      const material = req.body;
      const result = await materialsCollection.insertOne(material);
      res.send(result);
    });

    app.get('/materials', async (req, res) => {
      const materials = await materialsCollection.find().toArray();
      res.send(materials);
    });

    //  Booked Sessions
    app.post('/booked-sessions', async (req, res) => {
      const bookedSession = req.body;
      const result = await bookedSessionsCollection.insertOne(bookedSession);
      res.send(result);
    });

    app.get('/booked-sessions', async (req, res) => {
      const bookedSessions = await bookedSessionsCollection.find().toArray();
      res.send(bookedSessions);
    });

    // Student Materials
    app.post('/student-materials', async (req, res) => {
      const material = req.body;
      material.createdAt = new Date();
      const result = await studentMaterialsCollection.insertOne(material);
      res.send(result);
    });

    app.get('/student-materials', async (req, res) => {
      const { userEmail } = req.query;
      if (!userEmail) return res.status(400).send({ message: "Missing userEmail" });
      const materials = await studentMaterialsCollection.find({ userEmail }).toArray();
      res.send(materials);
    });

    //  Notes
    app.post('/notes', async (req, res) => {
      const note = req.body;
      if (!note.userEmail || !note.title || !note.content) {
        return res.status(400).send({ message: "Missing required fields" });
      }
      note.createdAt = new Date();
      const result = await notesCollection.insertOne(note);
      res.send(result);
    });

    app.get('/notes', async (req, res) => {
      const { userEmail } = req.query;
      if (!userEmail) return res.status(400).send({ message: "Missing userEmail" });
      const notes = await notesCollection.find({ userEmail }).toArray();
      res.send(notes);
    });

    //  Users
    app.post('/users', async (req, res) => {
      const user = req.body;

      if (
        !user.name || 
        !user.email || 
        user.name.trim().length === 0 || 
        user.name.trim().toUpperCase() === "N/A"
      ) {
        return res.status(400).send({ message: "Missing or invalid name or email" });
      }

      user.role = user.role || "student";
      user.createdAt = new Date();

      const existing = await usersCollection.findOne({ email: user.email });
      if (existing) return res.status(409).send({ message: "User already exists" });

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // all users
    app.get('/users', async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (err) {
        res.status(500).send({ message: 'Error fetching users', error: err.message });
      }
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).send({ message: "User not found" });
      res.send(user);
    });

    app.patch('/users/:id/role', async (req, res) => {
      const userId = req.params.id;
      const { role } = req.body;
      if (!role) return res.status(400).send({ message: "Missing role" });
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role } }
      );
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "User not found" });
      }
      res.send({ message: "Role updated successfully" });
    });

    //  Upgrade Request - student sends request
    app.post('/upgrade-request', async (req, res) => {
      const { userEmail, message } = req.body;
      if (!userEmail) return res.status(400).json({ message: "Missing userEmail" });

      const user = await usersCollection.findOne({ email: userEmail });
      if (!user) return res.status(404).json({ message: "User not found" });

      const existing = await upgradeRequestsCollection.findOne({
        userId: user._id.toString(),
        status: "pending"
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

    //  Admin - Get all upgrade requests
    app.get('/admin/upgrade-requests', async (req, res) => {
      const requests = await upgradeRequestsCollection.find().toArray();
      res.send(requests);
    });

    // Admin - Approve request by ID
    app.post('/admin/upgrade-requests/:id/approve', async (req, res) => {
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
    // Admin - Reject request by ID
app.post('/admin/upgrade-requests/:id/reject', async (req, res) => {
  const requestId = req.params.id;

  const request = await upgradeRequestsCollection.findOne({ _id: new ObjectId(requestId) });
  if (!request) return res.status(404).json({ message: "Upgrade request not found" });

  await upgradeRequestsCollection.updateOne(
    { _id: new ObjectId(requestId) },
    { $set: { status: "rejected" } }
  );

  res.send({ message: "Request rejected." });
});

app.get('/sessions/:id', async (req, res) => {
  const id = req.params.id;  
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid session ID" });
  }

  try {
    const session = await sessionsCollection.findOne({ _id: new ObjectId(id) });
    console.log("Session found:", session);

    if (!session) {
      return res.status(404).send({ message: "Session not found" });
    }

    res.send(session);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch session", error: error.message });
  }
});
// all delete items works
// DELETE a material by ID
    //  admin delete button
app.delete('/materials/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await materialsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Material not found" });
    }
    res.send({ message: "Material deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: "Failed to delete material", error: error.message });
  }
});
// DELETE a session by ID
app.delete('/sessions/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await sessionsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Session not found" });
    }
    res.send({ message: "Session deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: "Failed to delete session", error: error.message });
  }
});
// DELETE a user by ID
app.delete('/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "User not found" });
    }

    res.send({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).send({ message: "Failed to delete user", error: err.message });
  }
});
// DELETE booked session by ID
app.delete('/booked-sessions/:id', async (req, res) => {
  const id = req.params.id;
  const result = await bookedSessionsCollection.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return res.status(404).send({ message: "Booked session not found" });
  }
  res.send({ message: "Booked session deleted successfully" });
});
// DELETE material by ID
app.delete('/materials/:id', async (req, res) => {
  const id = req.params.id;
  const result = await materialsCollection.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return res.status(404).send({ message: "Material not found" });
  }
  res.send({ message: "Material deleted successfully" });
});

// DELETE /notes/:id
app.delete('/notes/:id', async (req, res) => {
  const noteId = req.params.id;

  if (!ObjectId.isValid(noteId)) {
    return res.status(400).json({ message: 'Invalid note ID' });
  }
  try {
    const result = await notesCollection.deleteOne({ _id: new ObjectId(noteId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ message: 'Failed to delete note' });
  }
});
 await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB");
  } finally {
    // Don't close the client
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Studify server running!');
});

app.listen(port, () => {
  console.log(`✅ Server listening on port ${port}`);
});
