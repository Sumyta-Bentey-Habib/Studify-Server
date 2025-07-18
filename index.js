require('dotenv').config();
const express = require('express')

const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASSWORD}@cluster0.uteipwi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
let sessionsCollection;
let materialsCollection;
let bookedSessionsCollection;
let studentMaterialsCollection;
let notesCollection;
let usersCollection;


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
     const db = client.db("studify");
    sessionsCollection = db.collection("sessions");
    materialsCollection = db.collection("materials");
    bookedSessionsCollection = db.collection("bookedSessions");
    studentMaterialsCollection = db.collection("studentMaterials");
     notesCollection = db.collection("notes"); 
     usersCollection = db.collection("users");

    // Create Session
  app.post('/sessions', async (req, res) => {
  const session = req.body;
  const result = await sessionsCollection.insertOne(session);
  res.send(result);
  });


// Get Sessions
app.get('/sessions', async (req, res) => {
  const result = await sessionsCollection.find().toArray();
  res.send(result);
});


// Upload Materials
app.post('/materials', async (req, res) => {
  const material = req.body;
  const result = await materialsCollection.insertOne(material);
  res.send(result);
});

 // Book a Session
    app.post('/booked-sessions', async (req, res) => {
      const bookedSession = req.body;
      const result = await bookedSessionsCollection.insertOne(bookedSession);
      res.send(result);
 });


// booked sessions
app.get('/booked-sessions', async (req, res) => {
  try {
    const bookedSessions = await bookedSessionsCollection.find().toArray();
    res.send(bookedSessions);
  } catch (error) {
    console.error("Failed to get booked sessions:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});
// get materials
app.get('/materials', async (req, res) => {
  try {
    const viewMaterials = await materialsCollection.find().toArray();
    res.send(viewMaterials);
  } catch (error) {
    console.error("Failed to get all materials", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

// Save a material for a student
app.post('/student-materials', async (req, res) => {
  const material = req.body; // expects studentId and material details
  material.createdAt = new Date();
  try {
    const result = await studentMaterialsCollection.insertOne(material);
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to add student material" });
  }
});


// get student wish materials
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
  // Create note endpoint
    app.post('/notes', async (req, res) => {
      const note = req.body;

      // Validation
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

    // Optionally: Get notes for a user
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

   // POST new user
app.post('/users', async (req, res) => {
  const user = req.body;
  if (!user.name || !user.email) {
    return res.status(400).send({ message: "Missing name or email" });
  }

  user.role = "student"; 
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

// GET all users
app.get('/users', async (req, res) => {
  try {
    const users = await usersCollection.find().toArray();
    res.send(users);
  } catch (err) {
    console.error("Failed to get users:", err);
    res.status(500).send({ message: "Internal Server Error" });
  }
});





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Studify')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
