require('dotenv').config();

// Firebase must be initialized before any other firebase-admin imports
require('./config/firebase');

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const sessionsRouter        = require('./routes/sessions');
const materialsRouter       = require('./routes/materials');
const bookedSessionsRouter  = require('./routes/bookedSessions');
const studentMaterialsRouter = require('./routes/studentMaterials');
const notesRouter           = require('./routes/notes');
const usersRouter           = require('./routes/users');
const upgradeRequestsRouter = require('./routes/upgradeRequests');
const paymentsRouter        = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

//  Routes
app.get('/', (req, res) => {
  res.send('✅ Studify server is running!');
});

app.use('/sessions',          sessionsRouter);
app.use('/materials',         materialsRouter);
app.use('/booked-sessions',   bookedSessionsRouter);
app.use('/student-materials', studentMaterialsRouter);
app.use('/notes',             notesRouter);
app.use('/users',             usersRouter);
app.use('/upgrade-request',   upgradeRequestsRouter);
app.use('/admin/upgrade-requests', upgradeRequestsRouter);
app.use('/',                  paymentsRouter);

// Bootstrap
async function bootstrap() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✅ Server listening on port ${PORT}`);
  });
}

bootstrap().catch(console.error);
