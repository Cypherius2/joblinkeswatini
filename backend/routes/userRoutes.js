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

// Get comprehensive profile data for viewing
router.get('/profile/:id', authMiddleware, async (req, res) => {
    try {
        // Select all fields except password, but include documents for owner
        const isOwner = req.user.id === req.params.id;
        const selectFields = isOwner ? '-password' : '-password -documents';
        
        const user = await User.findById(req.params.id).select(selectFields);
        if (!user) {
            return res.status(404).json({ msg: 'Profile not found' });
        }
        
        // Prepare comprehensive profile data
        const profileData = {
            ...user.toObject(),
            // Analytics data
            profileViews: user.profileViews || 0,
            searchAppearances: user.searchAppearances || 0,
            postViews: user.postViews || 0,
            connections: user.connections || [],
            
            // Ensure all profile fields are included
            bio: user.bio || '',
            about: user.bio || '', // Alias for backward compatibility
            headline: user.headline || (user.role === 'company' ? 'Company' : 'Job Seeker'),
            location: user.location || 'Eswatini',
            
            // Company-specific fields
            companyName: user.companyName || user.name,
            companyDescription: user.companyDescription || '',
            companySize: user.companySize || '',
            foundedYear: user.foundedYear || null,
            industry: user.industry || '',
            website: user.website || '',
            phoneNumber: user.phoneNumber || '',
            
            // Social links
            socialLinks: user.socialLinks || {},
            
            // Profile arrays
            experience: user.experience || [],
            education: user.education || [],
            skills: user.skills || [],
            documents: isOwner ? (user.documents || []) : [], // Only include documents for owner
            
            // Profile settings
            profileVisibility: user.profileVisibility || 'public',
            
            // Recent activity
            lastProfileUpdate: user.lastProfileUpdate || user.updatedAt
        };
        
        res.json(profileData);
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).send('Server Error');
    }
});

// Update profile views
router.post('/profile/:id/view', authMiddleware, async (req, res) => {
    try {
        const profileUserId = req.params.id;
        const viewerId = req.user.id;
        
        // Don't count views from the profile owner
        if (profileUserId === viewerId) {
            return res.json({ msg: 'Own profile view not counted' });
        }
        
        // Increment profile views count
        await User.findByIdAndUpdate(
            profileUserId,
            { 
                $inc: { profileViews: 1 },
                $addToSet: { 
                    recentViewers: {
                        userId: viewerId,
                        viewedAt: new Date()
                    }
                }
            }
        );
        
        res.json({ msg: 'Profile view recorded' });
    } catch (err) {
        console.error('Error recording profile view:', err);
        res.status(500).send('Server Error');
    }
});

// Get user analytics data
router.get('/analytics', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('profileViews searchAppearances connections recentViewers');
        
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        // Calculate analytics for the past 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Count recent views (mock data for now)
        const recentViews = user.recentViewers ? 
            user.recentViewers.filter(viewer => viewer.viewedAt > thirtyDaysAgo).length : 0;
        
        const analyticsData = {
            profileViews: recentViews || user.profileViews || 0,
            searchAppearances: user.searchAppearances || Math.floor(Math.random() * 20),
            newConnections: user.connections ? 
                user.connections.filter(conn => conn.connectedAt && conn.connectedAt > thirtyDaysAgo).length : 0
        };
        
        res.json(analyticsData);
    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).send('Server Error');
    }
});

// Get suggested connections
router.get('/suggested-connections', authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id).select('connections industry location');
        
        if (!currentUser) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        // Get IDs of existing connections
        const connectedUserIds = currentUser.connections ? 
            currentUser.connections.map(conn => conn.userId || conn) : [];
        
        // Add current user ID to exclude from suggestions
        connectedUserIds.push(currentUser._id);
        
        // Find users with similar interests/location (basic algorithm)
        const suggestedUsers = await User.find({
            _id: { $nin: connectedUserIds },
            $or: [
                { industry: currentUser.industry },
                { location: currentUser.location },
                { role: currentUser.role }
            ]
        })
        .select('name headline profilePicture location industry')
        .limit(5);
        
        res.json(suggestedUsers);
    } catch (err) {
        console.error('Error fetching suggested connections:', err);
        res.status(500).send('Server Error');
    }
});

// Document upload endpoint
router.post('/documents', authMiddleware, debugUploadMiddleware, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        // Upload file to GridFS
        const fileData = await uploadToGridFS(req.file, req.user.id, 'document');
        
        // Update user's documents array
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        const documentInfo = {
            _id: fileData.id,
            title: req.body.title || req.file.originalname,
            description: req.body.description || '',
            filename: fileData.filename,
            originalname: fileData.originalname,
            mimetype: fileData.contentType,
            size: fileData.size,
            type: req.body.type || 'Document',
            uploadDate: new Date()
        };
        
        user.documents = user.documents || [];
        user.documents.push(documentInfo);
        await user.save();
        
        res.json({
            msg: 'Document uploaded successfully',
            document: documentInfo
        });
    } catch (err) {
        console.error('Error uploading document:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// Delete document endpoint
router.delete('/documents/:documentId', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        // Find document in user's documents array
        const documentIndex = user.documents.findIndex(doc => doc._id.toString() === req.params.documentId);
        
        if (documentIndex === -1) {
            return res.status(404).json({ msg: 'Document not found' });
        }
        
        const document = user.documents[documentIndex];
        
        // Delete file from GridFS
        try {
            const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            await gfs.delete(document._id);
        } catch (deleteError) {
            console.warn('Could not delete file from GridFS:', deleteError);
        }
        
        // Remove document from user's array
        user.documents.splice(documentIndex, 1);
        await user.save();
        
        res.json({ msg: 'Document deleted successfully' });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        let user = await User.findOne({ email }); 
        if (user) { 
            return res.status(400).json({ msg: 'User already exists' }); 
        }
        
        user = new User({ name, email, password, role });
        const salt = await bcrypt.genSalt(10); 
        user.password = await bcrypt.hash(password, salt);
        await user.save(); 
        
        // Generate JWT token for immediate login after registration
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) {
                console.error('JWT sign error:', err);
                return res.status(201).json({ msg: 'User registered successfully' });
            }
            
            // Return token and user data (excluding password) for immediate login
            res.status(201).json({ 
                msg: 'User registered successfully',
                token,
                user: {
                    _id: user._id,
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    headline: user.headline,
                    location: user.location,
                    profilePicture: user.profilePicture,
                    coverPhoto: user.coverPhoto,
                    about: user.about
                }
            });
        });
    } catch (err) { 
        console.error('Registration error:', err);
        res.status(500).send('Server Error'); 
    }
});
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }); 
        if (!user) { 
            return res.status(400).json({ msg: 'Invalid credentials' }); 
        }
        
        const isMatch = await bcrypt.compare(password, user.password); 
        if (!isMatch) { 
            return res.status(400).json({ msg: 'Invalid credentials' }); 
        }
        
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => { 
            if (err) throw err; 
            
            // Return token and user data (excluding password)
            res.json({ 
                token,
                user: {
                    _id: user._id,
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    headline: user.headline,
                    location: user.location,
                    profilePicture: user.profilePicture,
                    coverPhoto: user.coverPhoto,
                    about: user.about
                }
            }); 
        });
    } catch (err) { 
        console.error('Login error:', err);
        res.status(500).send('Server Error'); 
    }
});
router.put('/', authMiddleware, async (req, res) => {
    const { name, headline, location, about } = req.body;
    try { const user = await User.findByIdAndUpdate(req.user.id, { $set: { name, headline, location, about } }, { new: true }).select('-password'); res.json(user); } catch (err) { res.status(500).send('Server Error'); }
});
router.put('/profile', authMiddleware, async (req, res) => {
<<<<<<< HEAD
    const { name, headline, location, about, bio } = req.body;
    const updateFields = {};
    
    if (name !== undefined) updateFields.name = name;
    if (headline !== undefined) updateFields.headline = headline;
    if (location !== undefined) updateFields.location = location;
    if (about !== undefined) updateFields.bio = about; // Map 'about' to 'bio' field
    if (bio !== undefined) updateFields.bio = bio;
    
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id, 
            { $set: updateFields }, 
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json(user);
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).send('Server Error');
    }
});

// Update company information
router.put('/profile/company', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        if (user.role !== 'company') {
            return res.status(403).json({ msg: 'Only companies can update company information' });
        }
        
        const {
            companyDescription,
            industry,
            companySize,
            foundedYear,
            website,
            phoneNumber,
            socialLinks
        } = req.body;
        
        const updateFields = {};
        
        if (companyDescription !== undefined) updateFields.companyDescription = companyDescription;
        if (industry !== undefined) updateFields.industry = industry;
        if (companySize !== undefined) updateFields.companySize = companySize;
        if (foundedYear !== undefined) updateFields.foundedYear = foundedYear;
        if (website !== undefined) updateFields.website = website;
        if (phoneNumber !== undefined) updateFields.phoneNumber = phoneNumber;
        if (socialLinks !== undefined) updateFields.socialLinks = socialLinks;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json(updatedUser);
    } catch (err) {
        console.error('Company profile update error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
=======
    const { name, headline, location, about } = req.body;
    try { const user = await User.findByIdAndUpdate(req.user.id, { $set: { name, headline, location, about } }, { new: true }).select('-password'); res.json(user); } catch (err) { res.status(500).send('Server Error'); }
});
>>>>>>> 0f9492498fef7e783687cc119c04fb17bb3ac79c
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
<<<<<<< HEAD
=======
});
>>>>>>> 0f9492498fef7e783687cc119c04fb17bb3ac79c

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
<<<<<<< HEAD

router.post('/document', [authMiddleware, upload.single('document')], async (req, res) => {
    try {
=======
>>>>>>> 0f9492498fef7e783687cc119c04fb17bb3ac79c
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