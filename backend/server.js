// server.js -- FINAL CLEANED-UP VERSION

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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

// --- Database Connection ---
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

// --- Middlewares ---
// 1. Enable Cross-Origin Resource Sharing
app.use(cors());
// 2. Enable the express.json middleware to parse JSON bodies
app.use(express.json());
// 3. Make the 'uploads' folder public so files can be accessed
app.use('/uploads', express.static('uploads'));
// 4. application routes will be added here 
app.use('/api/applications', require('./routes/applicationRoutes'));
//message routes
app.use('/api/messages', require('./routes/messageRoutes'));


// --- API Routes ---
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// --- Root Route for testing if the server is up ---
app.get('/', (req, res) => {
  res.send('Welcome to the JobLinkEswatini API!');
});


// --- Start The Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});