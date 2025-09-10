// server.js -- FINAL CLEANED-UP VERSION

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// --- Environment Variable Validation ---
if (!process.env.MONGO_URI) {
    console.error('FATAL ERROR: MONGO_URI is not defined in .env file.');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in .env file.');
    process.exit(1);
}

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 3000;

/* --- Database Connection ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully.');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};
connectDB();
*/
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection failed:', err));

// --- Middlewares ---
// 1. Enable Cross-Origin Resource Sharing
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:8000', 'http://127.0.0.1:8000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};
app.use(cors());
// 2. Enable the express.json middleware to parse JSON bodies
app.use(express.json());
// 3. Add request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] "${req.method} ${req.url}" "${req.get('User-Agent') || 'Unknown'}"`);;
    next();
});
// 4. Make the 'uploads' folder public so files can be accessed
// Serve backend uploads (not used for GridFS, but kept for any legacy/static files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
//app.use('/public', express.static(path.join(__dirname, 'public'))); // Optional: Serve static files from 'public' folder
// 5. application routes will be added here

// --- API Routes ---
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/users', require('./routes/profileRoutes')); // Profile management routes
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/auth', require('./routes/googleAuth'));




// --- Root Route for testing if the server is up ---
app.get('/', (req, res) => {
    res.send('Welcome to the JobLinkEswatini API!');
});

// --- Test route to check API routes ---
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// --- Handle favicon requests ---
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// --- Error handling middleware ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] "${req.method} ${req.url}" Error (404): "Not found"`);
    res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.url} not found` });
});

app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Server Error:`, err.message);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});


// --- Start The Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
