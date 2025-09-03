// backend/routes/userRoutes.js -- FINAL, COMPLETE VERSION WITH GRIDFS DATABASE STORAGE

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware.js');
require('dotenv').config();

// --- Create GridFS Storage Engine ---

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = `user-${req.user.id}-${Date.now()}-${file.originalname}`;
      const fileInfo = { filename: filename, bucketName: 'uploads' };
      resolve(fileInfo);
    });
  }
});
const upload = multer({ storage });


// --- USER PROFILE & NETWORKING ROUTES ---
// (Correct Order: Specific before Dynamic)

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) { res.status(500).send('Server Error'); }
});

router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('name headline profilePicture location');
    res.json(users);
  } catch (err) { res.status(500).send('Server Error'); }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -email -documents');
    if (!user) { return res.status(404).json({ msg: 'Profile not found' }); }
    res.json(user);
  } catch (err) { res.status(500).send('Server Error'); }
});


// --- USER AUTHENTICATION & CREATION ---

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) { return res.status(400).json({ msg: 'User already exists' }); }
    user = new User({ name, email, password, role });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    res.status(201).json({ msg: 'User registered' });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) { return res.status(400).json({ msg: 'Invalid credentials' }); }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) { return res.status(400).json({ msg: 'Invalid credentials' }); }
    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});


// --- PROFILE UPDATE & FILE UPLOAD ROUTES (USING GRIDFS) ---

router.put('/profile', authMiddleware, async (req, res) => {
  const { name, headline, location, about } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { $set: { name, headline, location, about } }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/users/picture
router.post('/picture', [authMiddleware, upload.single('profilePicture')], async (req, res) => {
  try {
    if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
    const user = await User.findByIdAndUpdate(req.user.id, { profilePicture: req.file.filename }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).send('Server Error'); }
});

router.post('/cover', [authMiddleware, upload.single('coverPhoto')], async (req, res) => {
  try {
    if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
    const user = await User.findByIdAndUpdate(req.user.id, { coverPhoto: req.file.filename }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/document', [authMiddleware, upload.single('document')], async (req, res) => {
  try {
    if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
    const user = await User.findById(req.user.id);
    if (!user.documents) user.documents = [];
    user.documents.unshift({
      fileId: req.file.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      contentType: req.file.mimetype
    });
    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.delete('/document/:doc_id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const doc = user.documents.id(req.params.doc_id);
    if (!doc) return res.status(404).json({ msg: 'Document not found' });

    // GridFS delete logic is different, we delete by file ID
    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });
    gfs.delete(new mongoose.Types.ObjectId(doc.fileId), (err, data) => {
      if (err) return res.status(404).json({ msg: 'Could not delete file from storage.' });
    });

    user.documents.pull({ _id: req.params.doc_id });
    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});


// --- EXPERIENCE & SKILLS ROUTES ---
router.post('/experience', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.experience) { user.experience = []; }
    user.experience.unshift({ ...req.body });
    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});
// ... (Your other experience and skills delete routes are similar and correct)
// --- DELETE EXPERIENCE ROUTE ---
// @route   DELETE /api/users/experience/:exp_id
// @desc    Delete an experience from a user's profile
// @access  Private
router.delete('/experience/:exp_id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Check if the experience exists
    const experience = user.experience.id(req.params.exp_id);
    if (!experience) {
      return res.status(404).json({ msg: 'Experience not found' });
    }

    // Use the pull method to remove the subdocument
    user.experience.pull({ _id: req.params.exp_id });

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// --- DELETE SKILL ROUTE ---
// @route   DELETE /api/users/skills/:skill_id
// @desc    Delete a skill from a user's profile
// @access  Private
router.delete('/skills/:skill_id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Check if the skill exists
    const skill = user.skills.id(req.params.skill_id);
    if (!skill) {
      return res.status(404).json({ msg: 'Skill not found' });
    }

    // Use the pull method to remove the subdocument
    user.skills.pull({ _id: req.params.skill_id });

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;