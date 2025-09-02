const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware.js');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userUploadsPath = path.join('uploads', req.user.id);
    fs.mkdirSync(userUploadsPath, { recursive: true });
    cb(null, userUploadsPath);
  },
  filename: (req, file, cb) => {
    const fileName = Date.now() + '-' + file.originalname;
    cb(null, fileName);
  }
});
const upload = multer({ storage: storage });

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
  } catch (err) { res.status(500).send('Server Error'); }
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
  } catch (err) { res.status(500).send('Server Error'); }
});

router.put('/profile', authMiddleware, async (req, res) => {
  const { name, headline, location, about } = req.body;
  const profileFields = { name, headline, location, about };
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { $set: profileFields }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).send('Server Error'); }
});

router.post('/picture', [authMiddleware, upload.single('profilePicture')], async (req, res) => {
  try {
    if (!req.file) { return res.status(400).json({ msg: 'No file' }); }
    const user = await User.findByIdAndUpdate(req.user.id, { profilePicture: req.file.path }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).send('Server Error'); }
});

router.post('/cover', [authMiddleware, upload.single('coverPhoto')], async (req, res) => {
  try {
    if (!req.file) { return res.status(400).json({ msg: 'No file' }); }
    const user = await User.findByIdAndUpdate(req.user.id, { coverPhoto: req.file.path }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).send('Server Error'); }
});

router.post('/document', [authMiddleware, upload.single('document')], async (req, res) => {
  try {
    if (!req.file) { return res.status(400).json({ msg: 'No file' }); }
    const user = await User.findById(req.user.id);
    if (!user.documents) user.documents = [];
    user.documents.unshift({ originalName: req.file.originalname, filePath: req.file.path });
    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) { res.status(500).send('Server Error'); }
});

router.delete('/document/:doc_id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const doc = user.documents.id(req.params.doc_id);
    if (!doc) return res.status(404).json({ msg: 'Document not found' });
    if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    user.documents.pull({ _id: req.params.doc_id });
    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) { res.status(500).send('Server Error'); }
});

// ... (Experience and Skills routes are similar)

module.exports = router;