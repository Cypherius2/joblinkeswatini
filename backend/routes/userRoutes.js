// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware.js');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: (req) => `joblink/${req.user.id}`, public_id: (req, file) => `${file.fieldname}-${Date.now()}` },
});
const upload = multer({ storage: storage });

router.get('/me', authMiddleware, async (req, res) => {
  try { const user = await User.findById(req.user.id).select('-password'); res.json(user); } catch (err) { res.status(500).send('Server Error'); }
});
router.get('/', async (req, res) => {
    try { const users = await User.find().select('name headline profilePicture location'); res.json(users); } catch (err) { res.status(500).send('Server Error'); }
});
router.get('/:id', async (req, res) => {
    try { const user = await User.findById(req.params.id).select('-password -email -documents'); if (!user) { return res.status(404).json({ msg: 'Profile not found' }); } res.json(user); } catch (err) { res.status(500).send('Server Error'); }
});
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        let user = await User.findOne({ email }); if (user) { return res.status(400).json({ msg: 'User already exists' }); }
        user = new User({ name, email, password, role });
        const salt = await bcrypt.genSalt(10); user.password = await bcrypt.hash(password, salt);
        await user.save(); res.status(201).json({ msg: 'User registered' });
    } catch (err) { res.status(500).send('Server Error'); }
});
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }); if (!user) { return res.status(400).json({ msg: 'Invalid credentials' }); }
        const isMatch = await bcrypt.compare(password, user.password); if (!isMatch) { return res.status(400).json({ msg: 'Invalid credentials' }); }
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => { if (err) throw err; res.json({ token }); });
    } catch (err) { res.status(500).send('Server Error'); }
});
router.put('/profile', authMiddleware, async (req, res) => {
    const { name, headline, location, about } = req.body;
    try { const user = await User.findByIdAndUpdate(req.user.id, { $set: { name, headline, location, about } }, { new: true }).select('-password'); res.json(user); } catch (err) { res.status(500).send('Server Error'); }
});
router.post('/picture', [authMiddleware, upload.single('profilePicture')], async (req, res) => {
    try { if (!req.file) { return res.status(400).json({ msg: 'No file.' }); } const user = await User.findByIdAndUpdate(req.user.id, { profilePicture: req.file.path }, { new: true }).select('-password'); res.json(user); } catch (err) { res.status(500).send('Server Error'); }
});
router.post('/cover', [authMiddleware, upload.single('coverPhoto')], async (req, res) => {
    try { if (!req.file) { return res.status(400).json({ msg: 'No file.' }); } const user = await User.findByIdAndUpdate(req.user.id, { coverPhoto: req.file.path }, { new: true }).select('-password'); res.json(user); } catch (err) { res.status(500).send('Server Error'); }
});
router.post('/document', [authMiddleware, upload.single('document')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file.' }); }
        const user = await User.findById(req.user.id); if (!user.documents) user.documents = [];
        user.documents.unshift({ originalName: req.file.originalname, filePath: req.file.path });
        await user.save(); res.json(await User.findById(req.user.id).select('-password'));
    } catch (err) { res.status(500).send('Server Error'); }
});
router.delete('/document/:doc_id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const doc = user.documents.id(req.params.doc_id); if (!doc) return res.status(404).json({ msg: 'Document not found' });
        // Optional: Delete from Cloudinary if needed (more advanced)
        user.documents.pull({ _id: req.params.doc_id }); await user.save();
        res.json(await User.findById(req.user.id).select('-password'));
    } catch (err) { res.status(500).send('Server Error'); }
});
router.post('/experience', authMiddleware, async (req, res) => {
    try { const user = await User.findById(req.user.id); if (!user.experience) user.experience = []; user.experience.unshift({ ...req.body }); await user.save(); res.json(await User.findById(req.user.id).select('-password')); } catch (err) { res.status(500).send('Server Error'); }
});
router.post('/skills', authMiddleware, async (req, res) => {
    try { const user = await User.findById(req.user.id); if (!user.skills) user.skills = []; if (user.skills.find(s => s.name.toLowerCase() === req.body.name.toLowerCase())) { return res.status(400).json({ msg: 'Skill already exists' }); } user.skills.unshift({ name: req.body.name }); await user.save(); res.json(await User.findById(req.user.id).select('-password')); } catch (err) { res.status(500).send('Server Error'); }
});
// (Your delete routes for experience and skills are also here)
module.exports = router;