const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASSWORD}@cluster0.uteipwi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

const collections = {};

async function connectDB() {
  if (db) return collections;
  db = client.db('studify');

  collections.sessions          = db.collection('sessions');
  collections.materials         = db.collection('materials');
  collections.bookedSessions    = db.collection('bookedSessions');
  collections.studentMaterials  = db.collection('studentMaterials');
  collections.notes             = db.collection('notes');
  collections.users             = db.collection('users');
  collections.upgradeRequests   = db.collection('upgradeRequests');

  return collections;
}

module.exports = { connectDB, collections };
