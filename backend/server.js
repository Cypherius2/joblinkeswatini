// server.js -- FINAL, GRIDFS-READY VERSION
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const connectDB = require('./config/db'); // <-- Import our new DB connection

// Connect to the database BEFORE we do anything else
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// --- API Routes ---
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/files', require('./routes/fileRoutes')); // <-- The route to view files
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

app.get('/api', (req, res) => res.send('API is running.'));

module.exports = app;