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

let sessionsCollection;
let materialsCollection;
let bookedSessionsCollection;
let studentMaterialsCollection;
let notesCollection;
let usersCollection;

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

    // ----- Sessions -----
    app.post('/sessions', async (req, res) => {
      const session = req.body;
      const result = await sessionsCollection.insertOne(session);
      res.send(result);
    });

    app.get('/sessions', async (req, res) => {
      const result = await sessionsCollection.find().toArray();
      res.send(result);
    });

    // ----- Materials -----
    app.post('/materials', async (req, res) => {
      const material = req.body;
      const result = await materialsCollection.insertOne(material);
      res.send(result);
    });

    app.get('/materials', async (req, res) => {
      try {
        const viewMaterials = await materialsCollection.find().toArray();
        res.send(viewMaterials);
      } catch (error) {
        console.error("Failed to get all materials", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // ----- Booked Sessions -----
    app.post('/booked-sessions', async (req, res) => {
      const bookedSession = req.body;
      const result = await bookedSessionsCollection.insertOne(bookedSession);
      res.send(result);
    });

    app.get('/booked-sessions', async (req, res) => {
      try {
        const bookedSessions = await bookedSessionsCollection.find().toArray();
        res.send(bookedSessions);
      } catch (error) {
        console.error("Failed to get booked sessions:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // ----- Student Materials -----
    app.post('/student-materials', async (req, res) => {
      const material = req.body;
      material.createdAt = new Date();
      try {
        const result = await studentMaterialsCollection.insertOne(material);
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to add student material" });
      }
    });

    app.get('/student-materials', async (req, res) => {
      const { userEmail } = req.query;
      if (!userEmail) return res.status(400).send({ message: "Missing userEmail" });
      try {
        const materials = await studentMaterialsCollection.find({ userEmail }).toArray();
        res.send(materials);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to get student materials" });
      }
    });

    // ----- Notes -----
    app.post('/notes', async (req, res) => {
      const note = req.body;
      if (!note.userEmail || !note.title || !note.content) {
        return res.status(400).send({ message: "Missing required fields" });
      }
      note.createdAt = note.createdAt || new Date();
      try {
        const result = await notesCollection.insertOne(note);
        res.send(result);
      } catch (err) {
        console.error("Failed to create note:", err);
        res.status(500).send({ message: "Failed to create note" });
      }
    });

    app.get('/notes', async (req, res) => {
      const { userEmail } = req.query;
      if (!userEmail) return res.status(400).send({ message: "Missing userEmail" });
      try {
        const notes = await notesCollection.find({ userEmail }).toArray();
        res.send(notes);
      } catch (err) {
        console.error("Failed to fetch notes:", err);
        res.status(500).send({ message: "Failed to fetch notes" });
      }
    });

    // ----- Users -----
    // Create user with optional role (default "student")
    app.post('/users', async (req, res) => {
      const user = req.body;
      if (!user.name || !user.email) {
        return res.status(400).send({ message: "Missing name or email" });
      }

      user.role = user.role || "student"; 
      user.createdAt = new Date();

      try {
        const existingUser = await usersCollection.findOne({ email: user.email });
        if (existingUser) {
          return res.status(409).send({ message: "User already exists" });
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (err) {
        console.error("Failed to create user:", err);
        res.status(500).send({ message: "Failed to create user" });
      }
    });

    // Get all users
    app.get('/users', async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (err) {
        console.error("Failed to get users:", err);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Get single user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      try {
        const user = await usersCollection.findOne({ email });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        res.send(user);
      } catch (err) {
        console.error("Failed to get user:", err);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Update user role by id
    app.patch('/users/:id/role', async (req, res) => {
      const userId = req.params.id;
      const { role } = req.body;
      if (!role) {
        return res.status(400).send({ message: "Missing role in request body" });
      }
      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { role } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }
        res.send({ message: "Role updated successfully" });
      } catch (err) {
        console.error("Failed to update user role:", err);
        res.status(500).send({ message: "Failed to update user role" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } finally {
    // Connection stays open
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Studify running...');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
