// backend/routes/userRoutes.js -- FINAL, COMPLETE, AND CORRECTLY ORDERED

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware.js');

// --- ADVANCED MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userUploadsPath = path.join('uploads', req.user.id);
        if (!fs.existsSync(userUploadsPath)) {
            fs.mkdirSync(userUploadsPath, { recursive: true });
        }
        cb(null, userUploadsPath);
    },
    filename: function (req, file, cb) {
        const fileExt = path.extname(file.originalname);
        const fieldName = file.fieldname;
        // For documents, use the original name, for others use a standard name
        const fileName = (fieldName === 'document')
            ? Date.now() + '-' + file.originalname
            : `${fieldName}-${req.user.id}${fileExt}`;
        cb(null, fileName);
    }
});
const upload = multer({ storage: storage });


// --- USER PROFILE & NETWORKING ROUTES ---
// ORDER IS CRITICAL HERE: More specific GET routes MUST come before dynamic ones.

// @route   GET api/users/me (Get logged in user's private data)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) { return res.status(404).json({ msg: 'User not found' }); }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/users
// @desc    Get ALL user profiles for networking (Corrected)
// @access  Public
router.get('/', async (req, res) => {
    try {
        // The filter has been removed from User.find()
        const users = await User.find().select('name headline profilePicture location');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/users/:id (Get a user's public profile by ID - MUST BE LAST GET)
router.get('/:id', async (req, res) => {
    try {
        // Find the user and select only the fields that are safe for public view
        const user = await User.findById(req.params.id)
            .select('-password -email -documents -__v -updatedAt'); // Exclude all private fields

        if (!user) {
            return res.status(404).json({ msg: 'Profile not found' });
        }

        res.json(user);
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Profile not found' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- USER AUTHENTICATION & CREATION ---

// @route   POST api/users/register
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) { return res.status(400).json({ msg: 'User with this email already exists.' }); }
        user = new User({ name, email, password, role });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        res.status(201).json({ msg: 'User registered successfully!' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/users/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) { return res.status(400).json({ msg: 'Invalid credentials' }); }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ msg: 'Invalid credentials' }); }
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});


// --- PROFILE UPDATE & FILE UPLOAD ROUTES ---

// @route   PUT api/users/profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, headline, location, about } = req.body;
        const profileFields = { name, headline, location, about };
        const user = await User.findByIdAndUpdate(req.user.id, { $set: profileFields }, { new: true }).select('-password');
        res.json(user);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/users/picture
router.post('/picture', [authMiddleware, upload.single('profilePicture')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
        const user = await User.findByIdAndUpdate(req.user.id, { profilePicture: req.file.path }, { new: true }).select('-password');
        res.json(user);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/users/cover
router.post('/cover', [authMiddleware, upload.single('coverPhoto')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
        const user = await User.findByIdAndUpdate(req.user.id, { coverPhoto: req.file.path }, { new: true }).select('-password');
        res.json(user);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   POST api/users/document (CORRECTED)
router.post('/document', [authMiddleware, upload.single('document')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }

        const user = await User.findById(req.user.id);

        // --- THIS IS THE FIX ---
        // Ensure the documents array exists before we try to use it
        if (!user.documents) {
            user.documents = [];
        }
        // ---------------------

        const newDocument = {
            originalName: req.file.originalname,
            filePath: req.file.path
        };

        user.documents.unshift(newDocument);
        await user.save();

        const updatedUser = await User.findById(req.user.id).select('-password');
        res.json(updatedUser);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// @route   DELETE api/users/document/:doc_id
// @desc    Delete a document from a user's profile
// @access  Private
router.delete('/document/:doc_id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const docId = req.params.doc_id;

        // Find the specific document within the user's documents array
        const docToDelete = user.documents.id(docId);

        if (!docToDelete) {
            return res.status(404).json({ msg: 'Document not found' });
        }

        // --- FIX FOR THE FILE DELETION ERROR ---
        // 1. Construct the absolute path to the file
        const filePath = path.join(__dirname, '..', docToDelete.filePath);
        // 2. Check if the file exists before trying to delete it
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Use synchronous unlink for simplicity here
        }
        // ------------------------------------

        // --- FIX FOR THE '.remove is not a function' ERROR ---
        // Use the modern .pull() method to remove the sub-document from the array
        user.documents.pull({ _id: docId });
        // ----------------------------------------------------

        // Save the parent user document
        await user.save();

        const updatedUser = await User.findById(req.user.id).select('-password');
        res.json(updatedUser);
    } catch (err) {
        console.error('Error deleting document:', err.message);
        res.status(500).send('Server Error');
    }
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

router.delete('/experience/:exp_id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const removeIndex = user.experience.map(item => item.id).indexOf(req.params.exp_id);
        if (removeIndex === -1) { return res.status(404).json({ msg: 'Experience not found' }); }
        user.experience.splice(removeIndex, 1);
        await user.save();
        const updatedUser = await User.findById(req.user.id).select('-password');
        res.json(updatedUser);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.post('/skills', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.skills) { user.skills = []; }
        if (user.skills.find(skill => skill.name.toLowerCase() === req.body.name.toLowerCase())) {
            return res.status(400).json({ msg: 'Skill already exists' });
        }
        user.skills.unshift({ name: req.body.name });
        await user.save();
        const updatedUser = await User.findById(req.user.id).select('-password');
        res.json(updatedUser);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.delete('/skills/:skill_id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const removeIndex = user.skills.map(item => item.id).indexOf(req.params.skill_id);
        if (removeIndex === -1) { return res.status(404).json({ msg: 'Skill not found' }); }
        user.skills.splice(removeIndex, 1);
        await user.save();
        const updatedUser = await User.findById(req.user.id).select('-password');
        res.json(updatedUser);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;