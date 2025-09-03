const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection failed:', err));

app.use(cors());
app.use(express.json());


app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));


app.get('/api', (req, res) => res.send('JobLinkEswatini API is running.'));

module.exports = app;