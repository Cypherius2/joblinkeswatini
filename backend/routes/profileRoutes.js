const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Configure GridFS for file uploads
let gfsBucket;
mongoose.connection.once('open', () => {
    gfsBucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads'
    });
});

// Configure multer for file handling
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Prepare profile picture URL if exists
        if (user.profilePicture) {
            user.profilePicture = {
                filename: user.profilePicture,
                url: `/api/files/${user.profilePicture}`
            };
        }
        
        // Prepare cover photo URL if exists
        if (user.coverPhoto) {
            user.coverPhoto = {
                filename: user.coverPhoto,
                url: `/api/files/${user.coverPhoto}`
            };
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/profile/:userId
// @desc    Get user profile by ID (public view)
// @access  Private
router.get('/profile/:userId', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password -email -phoneNumber -dateOfBirth');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check profile visibility
        if (user.profileVisibility === 'private' && user._id.toString() !== req.userId) {
            return res.status(403).json({ message: 'Profile is private' });
        }
        
        // Increment profile views if viewing someone else's profile
        if (user._id.toString() !== req.userId) {
            await User.findByIdAndUpdate(req.params.userId, 
                { $inc: { profileViews: 1 } }
            );
        }
        
        // Prepare media URLs
        if (user.profilePicture) {
            user.profilePicture = {
                filename: user.profilePicture,
                url: `/api/files/${user.profilePicture}`
            };
        }
        
        if (user.coverPhoto) {
            user.coverPhoto = {
                filename: user.coverPhoto,
                url: `/api/files/${user.coverPhoto}`
            };
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const {
            name,
            headline,
            bio,
            location,
            currentPosition,
            industry,
            website,
            phoneNumber,
            socialLinks,
            companyName,
            companySize,
            companyDescription,
            foundedYear,
            profileVisibility,
            emailNotifications,
            profileSearchable
        } = req.body;

        const updateFields = {};
        
        // Basic profile fields
        if (name) updateFields.name = name;
        if (headline) updateFields.headline = headline;
        if (bio) updateFields.bio = bio;
        if (location) updateFields.location = location;
        if (currentPosition) updateFields.currentPosition = currentPosition;
        if (industry) updateFields.industry = industry;
        if (website) updateFields.website = website;
        if (phoneNumber) updateFields.phoneNumber = phoneNumber;
        
        // Social links
        if (socialLinks) updateFields.socialLinks = socialLinks;
        
        // Company fields (for company accounts)
        if (companyName) updateFields.companyName = companyName;
        if (companySize) updateFields.companySize = companySize;
        if (companyDescription) updateFields.companyDescription = companyDescription;
        if (foundedYear) updateFields.foundedYear = foundedYear;
        
        // Settings
        if (profileVisibility) updateFields.profileVisibility = profileVisibility;
        if (emailNotifications !== undefined) updateFields.emailNotifications = emailNotifications;
        if (profileSearchable !== undefined) updateFields.profileSearchable = profileSearchable;
        
        // Update last profile update timestamp
        updateFields.lastProfileUpdate = new Date();

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/profile/picture
// @desc    Upload profile picture
// @access  Private
router.post('/profile/picture', authMiddleware, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Delete existing profile picture if exists
        const user = await User.findById(req.userId);
        if (user.profilePicture) {
            try {
                await gfsBucket.delete(new mongoose.Types.ObjectId(user.profilePicture));
            } catch (deleteError) {
                console.warn('Could not delete old profile picture:', deleteError);
            }
        }

        // Create GridFS upload stream
        const filename = `profile_${req.userId}_${Date.now()}_${req.file.originalname}`;
        const uploadStream = gfsBucket.openUploadStream(filename, {
            contentType: req.file.mimetype,
            metadata: {
                userId: req.userId,
                type: 'profilePicture',
                uploadDate: new Date()
            }
        });

        // Upload file
        uploadStream.end(req.file.buffer);

        uploadStream.on('finish', async () => {
            try {
                // Update user with new profile picture filename
                await User.findByIdAndUpdate(req.userId, {
                    profilePicture: uploadStream.id.toString(),
                    lastProfileUpdate: new Date()
                });

                res.json({
                    message: 'Profile picture uploaded successfully',
                    filename: uploadStream.id.toString(),
                    url: `/api/files/${uploadStream.id.toString()}`
                });
            } catch (updateError) {
                console.error('Error updating user profile picture:', updateError);
                res.status(500).json({ message: 'Failed to update profile picture' });
            }
        });

        uploadStream.on('error', (error) => {
            console.error('Error uploading profile picture:', error);
            res.status(500).json({ message: 'Failed to upload profile picture' });
        });

    } catch (error) {
        console.error('Error in profile picture upload:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/profile/cover
// @desc    Upload cover photo
// @access  Private
router.post('/profile/cover', authMiddleware, upload.single('coverPhoto'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Delete existing cover photo if exists
        const user = await User.findById(req.userId);
        if (user.coverPhoto) {
            try {
                await gfsBucket.delete(new mongoose.Types.ObjectId(user.coverPhoto));
            } catch (deleteError) {
                console.warn('Could not delete old cover photo:', deleteError);
            }
        }

        // Create GridFS upload stream
        const filename = `cover_${req.userId}_${Date.now()}_${req.file.originalname}`;
        const uploadStream = gfsBucket.openUploadStream(filename, {
            contentType: req.file.mimetype,
            metadata: {
                userId: req.userId,
                type: 'coverPhoto',
                uploadDate: new Date()
            }
        });

        // Upload file
        uploadStream.end(req.file.buffer);

        uploadStream.on('finish', async () => {
            try {
                // Update user with new cover photo filename
                await User.findByIdAndUpdate(req.userId, {
                    coverPhoto: uploadStream.id.toString(),
                    lastProfileUpdate: new Date()
                });

                res.json({
                    message: 'Cover photo uploaded successfully',
                    filename: uploadStream.id.toString(),
                    url: `/api/files/${uploadStream.id.toString()}`
                });
            } catch (updateError) {
                console.error('Error updating user cover photo:', updateError);
                res.status(500).json({ message: 'Failed to update cover photo' });
            }
        });

        uploadStream.on('error', (error) => {
            console.error('Error uploading cover photo:', error);
            res.status(500).json({ message: 'Failed to upload cover photo' });
        });

    } catch (error) {
        console.error('Error in cover photo upload:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/profile/experience
// @desc    Add work experience
// @access  Private
router.post('/profile/experience', authMiddleware, async (req, res) => {
    try {
        const { title, company, location, startDate, endDate, current, description, employmentType } = req.body;

        if (!title || !company || !startDate) {
            return res.status(400).json({ message: 'Title, company, and start date are required' });
        }

        const newExperience = {
            title,
            company,
            location,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            current: current || false,
            description,
            employmentType
        };

        const user = await User.findByIdAndUpdate(
            req.userId,
            { 
                $push: { experience: newExperience },
                $set: { lastProfileUpdate: new Date() }
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Experience added successfully', experience: user.experience });
    } catch (error) {
        console.error('Error adding experience:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/users/profile/experience/:experienceId
// @desc    Update work experience
// @access  Private
router.put('/profile/experience/:experienceId', authMiddleware, async (req, res) => {
    try {
        const { title, company, location, startDate, endDate, current, description, employmentType } = req.body;

        const updateFields = {};
        if (title) updateFields['experience.$.title'] = title;
        if (company) updateFields['experience.$.company'] = company;
        if (location) updateFields['experience.$.location'] = location;
        if (startDate) updateFields['experience.$.startDate'] = new Date(startDate);
        if (endDate) updateFields['experience.$.endDate'] = new Date(endDate);
        if (current !== undefined) updateFields['experience.$.current'] = current;
        if (description) updateFields['experience.$.description'] = description;
        if (employmentType) updateFields['experience.$.employmentType'] = employmentType;
        
        updateFields.lastProfileUpdate = new Date();

        const user = await User.findOneAndUpdate(
            { _id: req.userId, 'experience._id': req.params.experienceId },
            { $set: updateFields },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Experience not found' });
        }

        res.json({ message: 'Experience updated successfully', experience: user.experience });
    } catch (error) {
        console.error('Error updating experience:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/users/profile/experience/:experienceId
// @desc    Delete work experience
// @access  Private
router.delete('/profile/experience/:experienceId', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.userId,
            { 
                $pull: { experience: { _id: req.params.experienceId } },
                $set: { lastProfileUpdate: new Date() }
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Experience deleted successfully', experience: user.experience });
    } catch (error) {
        console.error('Error deleting experience:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/profile/education
// @desc    Add education
// @access  Private
router.post('/profile/education', authMiddleware, async (req, res) => {
    try {
        const { school, degree, fieldOfStudy, startDate, endDate, current, description, grade } = req.body;

        if (!school || !degree || !startDate) {
            return res.status(400).json({ message: 'School, degree, and start date are required' });
        }

        const newEducation = {
            school,
            degree,
            fieldOfStudy,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            current: current || false,
            description,
            grade
        };

        const user = await User.findByIdAndUpdate(
            req.userId,
            { 
                $push: { education: newEducation },
                $set: { lastProfileUpdate: new Date() }
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Education added successfully', education: user.education });
    } catch (error) {
        console.error('Error adding education:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/profile/skills
// @desc    Add skill
// @access  Private
router.post('/profile/skills', authMiddleware, async (req, res) => {
    try {
        const { name, level } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Skill name is required' });
        }

        // Check if skill already exists
        const user = await User.findById(req.userId);
        const existingSkill = user.skills.find(skill => skill.name.toLowerCase() === name.toLowerCase());
        
        if (existingSkill) {
            return res.status(400).json({ message: 'Skill already exists' });
        }

        const newSkill = {
            name,
            level: level || 'intermediate',
            endorsements: 0
        };

        const updatedUser = await User.findByIdAndUpdate(
            req.userId,
            { 
                $push: { skills: newSkill },
                $set: { lastProfileUpdate: new Date() }
            },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Skill added successfully', skills: updatedUser.skills });
    } catch (error) {
        console.error('Error adding skill:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/users/profile/skills/:skillId
// @desc    Delete skill
// @access  Private
router.delete('/profile/skills/:skillId', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.userId,
            { 
                $pull: { skills: { _id: req.params.skillId } },
                $set: { lastProfileUpdate: new Date() }
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Skill deleted successfully', skills: user.skills });
    } catch (error) {
        console.error('Error deleting skill:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/analytics
// @desc    Get user profile analytics
// @access  Private
router.get('/analytics', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('profileViews searchAppearances');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            profileViews: user.profileViews || 0,
            searchAppearances: user.searchAppearances || 0
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/profile-completion
// @desc    Get profile completion percentage and suggestions
// @access  Private
router.get('/profile-completion', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate completion percentage
        let completed = 0;
        const total = 10; // Total number of profile sections
        const suggestions = [];

        // Check each profile section
        if (user.profilePicture) {
            completed++;
        } else {
            suggestions.push('Add a professional profile picture');
        }

        if (user.headline) {
            completed++;
        } else {
            suggestions.push('Write a compelling headline');
        }

        if (user.bio && user.bio.length > 20) {
            completed++;
        } else {
            suggestions.push('Add a detailed bio about yourself');
        }

        if (user.location) {
            completed++;
        } else {
            suggestions.push('Add your location');
        }

        if (user.currentPosition) {
            completed++;
        } else {
            suggestions.push('Add your current position');
        }

        if (user.experience && user.experience.length > 0) {
            completed++;
        } else {
            suggestions.push('Add your work experience');
        }

        if (user.education && user.education.length > 0) {
            completed++;
        } else {
            suggestions.push('Add your education background');
        }

        if (user.skills && user.skills.length >= 3) {
            completed++;
        } else {
            suggestions.push('Add at least 3 skills');
        }

        if (user.industry) {
            completed++;
        } else {
            suggestions.push('Specify your industry');
        }

        if (user.socialLinks && (user.socialLinks.linkedin || user.socialLinks.github)) {
            completed++;
        } else {
            suggestions.push('Add social media links');
        }

        const percentage = Math.round((completed / total) * 100);
        
        // Determine profile strength
        let strength = 'Beginner';
        let strengthColor = '#f39c12';
        
        if (percentage >= 80) {
            strength = 'All-Star';
            strengthColor = '#27ae60';
        } else if (percentage >= 60) {
            strength = 'Intermediate';
            strengthColor = '#3498db';
        } else if (percentage >= 40) {
            strength = 'Intermediate';
            strengthColor = '#e67e22';
        }

        res.json({
            percentage,
            completed,
            total,
            strength,
            strengthColor,
            suggestions: suggestions.slice(0, 5) // Limit to top 5 suggestions
        });
    } catch (error) {
        console.error('Error calculating profile completion:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/search
// @desc    Search users by name, headline, or skills
// @access  Private
router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const skip = (page - 1) * limit;
        
        // Build search query
        const searchQuery = {
            profileSearchable: true,
            profileVisibility: { $in: ['public', 'connections'] },
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { headline: { $regex: q, $options: 'i' } },
                { currentPosition: { $regex: q, $options: 'i' } },
                { 'skills.name': { $regex: q, $options: 'i' } }
            ]
        };

        const users = await User.find(searchQuery)
            .select('name headline currentPosition location profilePicture')
            .limit(limit * 1)
            .skip(skip)
            .sort({ lastProfileUpdate: -1 });

        // Increment search appearances for found users
        const userIds = users.map(user => user._id);
        await User.updateMany(
            { _id: { $in: userIds } },
            { $inc: { searchAppearances: 1 } }
        );

        const total = await User.countDocuments(searchQuery);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
