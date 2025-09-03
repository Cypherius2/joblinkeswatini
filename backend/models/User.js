// backend/models/User.js -- CORRECTED VERSION

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// NEW Sub-document Schema for documents stored in GridFS
const DocumentSchema = new Schema({
    fileId: { type: Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    contentType: { type: String, required: true },
    dateUploaded: { type: Date, default: Date.now }
});

const ExperienceSchema = new Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    from: { type: Date, required: true },
    to: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String }
});

const SkillsSchema = new Schema({
    name: { type: String, required: true }
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
    location: { type: String, default: 'Eswatini' },
    profilePicture: { type: String},
    coverPhoto: { type: String},
    about: { type: String },
    // Array fields
    experience: {
        type: [ExperienceSchema],
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