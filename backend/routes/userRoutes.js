// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mongoose = require('mongoose');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware.js');

// Setup multer with memory storage for GridFS
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'profilePicture' || file.fieldname === 'coverPhoto') {
      // Only allow images for profile pictures and cover photos
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
        cb(null, true);
      } else {
        cb(new Error('Only PNG, JPG, and JPEG image formats are allowed for profile pictures'));
      }
    } else if (file.fieldname === 'document') {
      // Accept all file types for documents
      cb(null, true);
    } else {
      cb(new Error('Invalid file field'));
    }
  }
});

// Helper function to upload file to GridFS
const uploadToGridFS = async (file, userId, fieldName) => {
  const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
  
  const filename = `${fieldName}-${userId}-${Date.now()}-${file.originalname}`;
  
  const uploadStream = gfs.openUploadStream(filename, {
    metadata: {
      userId: userId,
      fieldName: fieldName,
      originalName: file.originalname,
      uploadDate: new Date()
    }
  });
  
  return new Promise((resolve, reject) => {
    uploadStream.on('finish', () => {
      resolve({
        id: uploadStream.id,
        filename: filename,
        originalname: file.originalname,
        contentType: file.mimetype,
        size: file.size
      });
    });
    
    uploadStream.on('error', (error) => {
      reject(error);
    });
    
    uploadStream.end(file.buffer);
  });
};

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
router.put('/', authMiddleware, async (req, res) => {
    const { name, headline, location, about } = req.body;
    try { const user = await User.findByIdAndUpdate(req.user.id, { $set: { name, headline, location, about } }, { new: true }).select('-password'); res.json(user); } catch (err) { res.status(500).send('Server Error'); }
});
router.put('/profile', authMiddleware, async (req, res) => {
    const { name, headline, location, about } = req.body;
    try { const user = await User.findByIdAndUpdate(req.user.id, { $set: { name, headline, location, about } }, { new: true }).select('-password'); res.json(user); } catch (err) { res.status(500).send('Server Error'); }
});
router.post('/picture', [authMiddleware, upload.single('profilePicture')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
        
        // Delete old profile picture if it exists
        const currentUser = await User.findById(req.user.id);
        if (currentUser.profilePicture && currentUser.profilePicture.fileId) {
            const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            try {
                await gfs.delete(currentUser.profilePicture.fileId);
            } catch (deleteError) {
                console.log('Error deleting old profile picture:', deleteError.message);
            }
        }
        
        // Upload new file to GridFS
        const fileData = await uploadToGridFS(req.file, req.user.id, 'profilePicture');
        
        const user = await User.findByIdAndUpdate(
            req.user.id, 
            { 
                profilePicture: {
                    fileId: fileData.id,
                    filename: fileData.filename
                }
            }, 
            { new: true }
        ).select('-password');
        
        res.json(user);
    } catch (err) { 
        console.error('Profile picture upload error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message }); 
    }
});

router.post('/profilePicture', [authMiddleware, upload.single('profilePicture')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
        
        // Delete old profile picture if it exists
        const currentUser = await User.findById(req.user.id);
        if (currentUser.profilePicture && currentUser.profilePicture.fileId) {
            const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            try {
                await gfs.delete(currentUser.profilePicture.fileId);
            } catch (deleteError) {
                console.log('Error deleting old profile picture:', deleteError.message);
            }
        }
        
        // Upload new file to GridFS
        const fileData = await uploadToGridFS(req.file, req.user.id, 'profilePicture');
        
        const user = await User.findByIdAndUpdate(
            req.user.id, 
            { 
                profilePicture: {
                    fileId: fileData.id,
                    filename: fileData.filename
                }
            }, 
            { new: true }
        ).select('-password');
        
        res.json(user);
    } catch (err) { 
        console.error('Profile picture upload error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message }); 
    }
});
router.post('/cover', [authMiddleware, upload.single('coverPhoto')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
        
        // Delete old cover photo if it exists
        const currentUser = await User.findById(req.user.id);
        if (currentUser.coverPhoto && currentUser.coverPhoto.fileId) {
            const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            try {
                await gfs.delete(currentUser.coverPhoto.fileId);
            } catch (deleteError) {
                console.log('Error deleting old cover photo:', deleteError.message);
            }
        }
        
        // Upload new file to GridFS
        const fileData = await uploadToGridFS(req.file, req.user.id, 'coverPhoto');
        
        const user = await User.findByIdAndUpdate(
            req.user.id, 
            { 
                coverPhoto: {
                    fileId: fileData.id,
                    filename: fileData.filename
                }
            }, 
            { new: true }
        ).select('-password');
        
        res.json(user);
    } catch (err) { 
        console.error('Cover photo upload error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message }); 
    }
});

router.post('/coverPhoto', [authMiddleware, upload.single('coverPhoto')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
        
        // Delete old cover photo if it exists
        const currentUser = await User.findById(req.user.id);
        if (currentUser.coverPhoto && currentUser.coverPhoto.fileId) {
            const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            try {
                await gfs.delete(currentUser.coverPhoto.fileId);
            } catch (deleteError) {
                console.log('Error deleting old cover photo:', deleteError.message);
            }
        }
        
        // Upload new file to GridFS
        const fileData = await uploadToGridFS(req.file, req.user.id, 'coverPhoto');
        
        const user = await User.findByIdAndUpdate(
            req.user.id, 
            { 
                coverPhoto: {
                    fileId: fileData.id,
                    filename: fileData.filename
                }
            }, 
            { new: true }
        ).select('-password');
        
        res.json(user);
    } catch (err) { 
        console.error('Cover photo upload error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message }); 
    }
});
router.post('/document', [authMiddleware, upload.single('document')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
        
        // Upload file to GridFS
        const fileData = await uploadToGridFS(req.file, req.user.id, 'document');
        
        const user = await User.findById(req.user.id);
        if (!user.documents) user.documents = [];
        
        user.documents.unshift({ 
            fileId: fileData.id,
            filename: fileData.filename,
            originalName: fileData.originalname,
            contentType: fileData.contentType,
            fileSize: fileData.size
        });
        
        await user.save();
        res.json(await User.findById(req.user.id).select('-password'));
    } catch (err) { 
        console.error('Document upload error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

router.post('/documents', [authMiddleware, upload.single('document')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
        
        // Upload file to GridFS
        const fileData = await uploadToGridFS(req.file, req.user.id, 'document');
        
        const user = await User.findById(req.user.id);
        if (!user.documents) user.documents = [];
        
        user.documents.unshift({ 
            fileId: fileData.id,
            filename: fileData.filename,
            originalName: fileData.originalname,
            contentType: fileData.contentType,
            fileSize: fileData.size
        });
        
        await user.save();
        res.json(await User.findById(req.user.id).select('-password'));
    } catch (err) { 
        console.error('Document upload error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});
router.delete('/document/:doc_id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const doc = user.documents.id(req.params.doc_id);
        
        if (!doc) return res.status(404).json({ msg: 'Document not found' });
        
        // Delete file from GridFS
        if (doc.fileId) {
            const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            await gfs.delete(doc.fileId);
        }
        
        user.documents.pull({ _id: req.params.doc_id });
        await user.save();
        res.json(await User.findById(req.user.id).select('-password'));
    } catch (err) { 
        console.error('Document delete error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

router.delete('/documents/:doc_id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const doc = user.documents.id(req.params.doc_id);
        
        if (!doc) return res.status(404).json({ msg: 'Document not found' });
        
        // Delete file from GridFS
        if (doc.fileId) {
            const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            await gfs.delete(doc.fileId);
        }
        
        user.documents.pull({ _id: req.params.doc_id });
        await user.save();
        res.json(await User.findById(req.user.id).select('-password'));
    } catch (err) { 
        console.error('Document delete error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});
router.post('/experience', authMiddleware, async (req, res) => {
    try { const user = await User.findById(req.user.id); if (!user.experience) user.experience = []; user.experience.unshift({ ...req.body }); await user.save(); res.json(await User.findById(req.user.id).select('-password')); } catch (err) { res.status(500).send('Server Error'); }
});
router.post('/skills', authMiddleware, async (req, res) => {
    try { const user = await User.findById(req.user.id); if (!user.skills) user.skills = []; if (user.skills.find(s => s.name.toLowerCase() === req.body.name.toLowerCase())) { return res.status(400).json({ msg: 'Skill already exists' }); } user.skills.unshift({ name: req.body.name }); await user.save(); res.json(await User.findById(req.user.id).select('-password')); } catch (err) { res.status(500).send('Server Error'); }
});
// (Your delete routes for experience and skills are also here)
module.exports = router;