// backend/models/User.js -- CORRECTED VERSION

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Document Schema for files stored in GridFS (matching MongoDB validation)
const DocumentSchema = new Schema({
    filePath: { type: String, required: true }, // This will store the GridFS filename
    originalName: { type: String, required: true },
    dateUploaded: { type: Date, default: Date.now }
});

const ExperienceSchema = new Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    startDate: { type: Date, required: true }, // Changed from 'from' to 'startDate'
    endDate: { type: Date }, // Changed from 'to' to 'endDate'
    current: { type: Boolean, default: false },
    description: { type: String },
    employmentType: { type: String, enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'] }
});

const EducationSchema = new Schema({
    school: { type: String, required: true },
    degree: { type: String, required: true },
    fieldOfStudy: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String },
    grade: { type: String }
});

const SkillsSchema = new Schema({
    name: { type: String, required: true },
    endorsements: { type: Number, default: 0 },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'intermediate' }
});
// -----------------------------------------

// --- The Main User Schema (now uses the schemas defined above) ---
const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['seeker', 'company'],
        default: 'seeker',
    },
    // Profile Fields
    headline: { type: String, default: 'Job Seeker' || 'Company' },
    bio: { type: String }, // Changed from 'about' to 'bio' for consistency
    location: { type: String, default: 'Eswatini' },
    currentPosition: { type: String },
    industry: { type: String },
    website: { type: String },
    phoneNumber: { type: String },
    dateOfBirth: { type: Date },
    
    // Social Media Links
    socialLinks: {
        linkedin: { type: String },
        twitter: { type: String },
        facebook: { type: String },
        instagram: { type: String },
        github: { type: String }
    },
    
    // Profile Media
    profilePicture: { type: String }, // GridFS filename
    coverPhoto: { type: String }, // GridFS filename
    
    // Company-specific fields
    companyName: { type: String }, // For company accounts
    companySize: { type: String, enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] },
    companyDescription: { type: String },
    foundedYear: { type: Number },
    
    // Profile Settings
    profileVisibility: { type: String, enum: ['public', 'connections', 'private'], default: 'public' },
    emailNotifications: { type: Boolean, default: true },
    profileSearchable: { type: Boolean, default: true },
    
    // Profile Analytics
    profileViews: { type: Number, default: 0 },
    searchAppearances: { type: Number, default: 0 },
    postViews: { type: Number, default: 0 },
    lastProfileUpdate: { type: Date, default: Date.now },
    
    // Profile viewing tracking
    recentViewers: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now }
    }],
    
    // Connections
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    connectionRequests: [{
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: { type: String },
        sentAt: { type: Date, default: Date.now }
    }],
    
    // Array fields
    experience: {
        type: [ExperienceSchema],
        default: []
    },
    education: {
        type: [EducationSchema],
        default: []
    },
    skills: {
        type: [SkillsSchema],
        default: []
    },
    documents: {
        type: [DocumentSchema],
        default: []
    }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
module.exports = User;