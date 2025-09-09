// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');

// Debug middleware for document uploads
const debugUploadMiddleware = (req, res, next) => {
    console.log('=== Upload Request Debug ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Headers:', req.headers);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('============================');
    next();
};

// Setup multer with memory storage for GridFS
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter - fieldname:', file.fieldname, 'mimetype:', file.mimetype);
    
    if (file.fieldname === 'profilePicture' || file.fieldname === 'coverPhoto') {
      // Only allow images for profile pictures and cover photos
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
        cb(null, true);
      } else {
        cb(new Error('Only PNG, JPG, and JPEG image formats are allowed for profile pictures'));
      }
    } else if (file.fieldname === 'document' || file.fieldname === 'documents') {
      // Accept all file types for documents
      console.log('Document file accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('Invalid file field:', file.fieldname);
      cb(new Error('Invalid file field: ' + file.fieldname));
    }
  }
});

// Helper function to upload file to GridFS
const uploadToGridFS = async (file, userId, fieldName) => {
  const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
  
const filename = `${fieldName}-${userId}-${Date.now()}${path.extname(file.originalname)}`;
  
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
});

router.post('/profilePicture', [debugUploadMiddleware, authMiddleware, upload.single('profilePicture')], async (req, res) => {
    try {
        console.log('=== Profile Picture Upload Debug ===');
        console.log('User ID from token:', req.user?.id);
        console.log('File received:', req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            fieldname: req.file.fieldname
        } : 'No file');
        console.log('MongoDB connection state:', mongoose.connection.readyState);
        console.log('MongoDB connection name:', mongoose.connection.name);
        
        if (!req.file) { 
            console.log('No file uploaded');
            return res.status(400).json({ msg: 'No file uploaded.' }); 
        }
        
        // Validate file
        if (!req.file.originalname || !req.file.mimetype || !req.file.size) {
            console.log('Invalid file data received');
            return res.status(400).json({ msg: 'Invalid file data.' });
        }
        
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            console.log('Database not connected. State:', mongoose.connection.readyState);
            return res.status(500).json({ msg: 'Database connection error' });
        }
        
        // Find current user
        console.log('Finding current user...');
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            console.log('User not found:', req.user.id);
            return res.status(404).json({ msg: 'User not found' });
        }
        console.log('Current user found:', currentUser.name);
        
        // Delete old profile picture if it exists
        if (currentUser.profilePicture) {
            console.log('Deleting old profile picture:', currentUser.profilePicture);
            const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            try {
                // Find the file by filename and delete it
                const files = await gfs.find({ filename: currentUser.profilePicture }).toArray();
                if (files.length > 0) {
                    await gfs.delete(files[0]._id);
                    console.log('Old profile picture deleted successfully');
                }
            } catch (deleteError) {
                console.log('Error deleting old profile picture (non-fatal):', deleteError.message);
            }
        }
        
        // Upload new file to GridFS
        console.log('Uploading new file to GridFS...');
        const fileData = await uploadToGridFS(req.file, req.user.id, 'profilePicture');
        console.log('File uploaded to GridFS successfully:', fileData);
        
        // Update user with new profile picture
        console.log('Updating user profile picture...');
        const user = await User.findByIdAndUpdate(
            req.user.id, 
            { 
                profilePicture: fileData.filename  // Store just the filename
            }, 
            { new: true }
        ).select('-password');
        
        console.log('User updated successfully');
        console.log('===================================');
        res.json(user);
    } catch (err) { 
        console.error('Profile picture upload error:', err);
        console.error('Error stack:', err.stack);
        console.error('Error name:', err.name);
        console.error('Error code:', err.code);
        
        // Provide more specific error responses
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Validation Error', error: err.message });
        }
        if (err.name === 'MongoError' || err.name === 'MongoServerError') {
            return res.status(500).json({ msg: 'Database Error', error: err.message });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ msg: 'File too large', error: err.message });
        }
        
        res.status(500).json({ msg: 'Server Error', error: err.message, errorType: err.name }); 
    }
});
});

router.post('/coverPhoto', [authMiddleware, upload.single('coverPhoto')], async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ msg: 'No file uploaded.' }); }
        
        // Delete old cover photo if it exists
        const currentUser = await User.findById(req.user.id);
        if (currentUser.coverPhoto) {
            const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            try {
                // Find the file by filename and delete it
                const files = await gfs.find({ filename: currentUser.coverPhoto }).toArray();
                if (files.length > 0) {
                    await gfs.delete(files[0]._id);
                }
            } catch (deleteError) {
                console.log('Error deleting old cover photo:', deleteError.message);
            }
        }
        
        // Upload new file to GridFS
        const fileData = await uploadToGridFS(req.file, req.user.id, 'coverPhoto');
        
        const user = await User.findByIdAndUpdate(
            req.user.id, 
            { 
                coverPhoto: fileData.filename
            }, 
            { new: true }
        ).select('-password');
        
        res.json(user);
    } catch (err) { 
        console.error('Cover photo upload error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message }); 
    }
});
        console.log('Document upload request received');
        console.log('File:', req.file);
        console.log('Body:', req.body);
        
        if (!req.file) { 
            console.log('No file in request');
            return res.status(400).json({ msg: 'No file uploaded.' }); 
        }
        
        // Validate file data
        if (!req.file.originalname || !req.file.mimetype || !req.file.size) {
            console.log('Invalid file data:', req.file);
            return res.status(400).json({ msg: 'Invalid file data received.' });
        }
        
        // Upload file to GridFS
        const fileData = await uploadToGridFS(req.file, req.user.id, 'document');
        console.log('File uploaded to GridFS:', fileData);
        
        const user = await User.findById(req.user.id);
        if (!user.documents) user.documents = [];
        
        // Create document object with required fields (matching MongoDB validation)
        const documentData = {
            filePath: fileData.filename,     // Store GridFS filename as filePath
            originalName: fileData.originalname
            // dateUploaded will be set automatically by schema default
        };
        
        console.log('Document data to save:', documentData);
        
        // Validate document data before saving
        if (!documentData.filePath || !documentData.originalName) {
            console.log('Missing required document fields:', documentData);
            return res.status(400).json({ msg: 'Missing required document fields.' });
        }
        
        user.documents.unshift(documentData);
        
        await user.save();
        console.log('Document saved successfully');
        
        res.json(await User.findById(req.user.id).select('-password'));
    } catch (err) { 
        console.error('Document upload error:', err);
        console.error('Error stack:', err.stack);
        
        // Handle specific mongoose validation errors
        if (err.name === 'ValidationError') {
            console.log('Validation Error Details:', JSON.stringify(err.errors, null, 2));
            const errorMessages = Object.keys(err.errors).map(key => {
                return `${key}: ${err.errors[key].message}`;
            });
            return res.status(400).json({ 
                msg: 'Document validation failed', 
                errors: errorMessages,
                details: err.errors
            });
        }
        
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});
// Route for multiple document uploads
router.post('/documents/multiple', [authMiddleware, upload.array('documents', 10)], async (req, res) => {
    try {
        console.log('Multiple documents upload request received');
        console.log('Files:', req.files);
        console.log('Body:', req.body);
        
        if (!req.files || req.files.length === 0) { 
            console.log('No files in request');
            return res.status(400).json({ msg: 'No files uploaded.' }); 
        }
        
        const user = await User.findById(req.user.id);
        if (!user.documents) user.documents = [];
        
        const uploadedDocuments = [];
        
        // Process each file
        for (const file of req.files) {
            // Validate file data
            if (!file.originalname || !file.mimetype || !file.size) {
                console.log('Invalid file data:', file);
                continue; // Skip invalid files
            }
            
            try {
                // Upload file to GridFS
                const fileData = await uploadToGridFS(file, req.user.id, 'document');
                console.log('File uploaded to GridFS:', fileData);
                
                // Create document object with required fields (matching MongoDB validation)
                const documentData = {
                    filePath: fileData.filename,
                    originalName: fileData.originalname
                };
                
                // Validate document data before saving
                if (documentData.filePath && documentData.originalName) {
                    user.documents.unshift(documentData);
                    uploadedDocuments.push(documentData);
                }
            } catch (fileError) {
                console.error('Error uploading file:', file.originalname, fileError);
            }
        }
        
        await user.save();
        console.log(`${uploadedDocuments.length} documents saved successfully`);
        
        res.json({
            message: `${uploadedDocuments.length} documents uploaded successfully`,
            uploadedDocuments,
            user: await User.findById(req.user.id).select('-password')
        });
    } catch (err) { 
        console.error('Multiple documents upload error:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

router.delete('/documents/:doc_id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const doc = user.documents.id(req.params.doc_id);
        
        if (!doc) return res.status(404).json({ msg: 'Document not found' });
        
        // Delete file from GridFS
        if (doc.filePath) {
            const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            try {
                // Find the file by filename and delete it
                const files = await gfs.find({ filename: doc.filePath }).toArray();
                if (files.length > 0) {
                    await gfs.delete(files[0]._id);
                }
            } catch (deleteError) {
                console.log('Error deleting GridFS file:', deleteError.message);
            }
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