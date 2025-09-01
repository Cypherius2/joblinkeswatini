// backend/models/Application.js -- UPGRADED VERSION
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ApplicationSchema = new Schema({
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    applicant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['pending', 'viewed', 'successful', 'unsuccessful'],
        default: 'pending'
    },
    // --- NEW FIELDS ---
    coverLetter: {
        type: String
    },
    attachedDocuments: [{
        originalName: { type: String },
        filePath: { type: String }
    }],
    // ------------------
    companyNotes: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Application', ApplicationSchema);