// backend/models/Job.js -- ENHANCED VERSION WITH ALL NEW FIELDS

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JobSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    company: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    // Basic job details
    jobType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship'],
        default: 'full-time',
    },
    workMode: {
        type: String,
        enum: ['remote', 'onsite', 'hybrid'],
        default: 'onsite'
    },
    experienceLevel: {
        type: String,
        enum: ['entry-level', 'mid-level', 'senior-level', 'executive'],
        default: 'mid-level'
    },
    
    // Salary information
    salaryRange: {
        min: { type: Number },
        max: { type: Number },
        currency: { type: String, default: 'SZL' },
        period: { type: String, enum: ['hourly', 'monthly', 'annually'], default: 'monthly' }
    },
    
    // Job requirements and qualifications
    requirements: {
        education: { type: String },
        experience: { type: String },
        skills: [{ type: String }],
        certifications: [{ type: String }],
        other: { type: String }
    },
    
    // Benefits and perks
    benefits: {
        healthInsurance: { type: Boolean, default: false },
        retirementPlan: { type: Boolean, default: false },
        paidTimeOff: { type: Boolean, default: false },
        flexibleHours: { type: Boolean, default: false },
        remoteWork: { type: Boolean, default: false },
        professionalDevelopment: { type: Boolean, default: false },
        gymMembership: { type: Boolean, default: false },
        freeFood: { type: Boolean, default: false },
        transportAllowance: { type: Boolean, default: false },
        other: [{ type: String }]
    },
    
    // Application settings
    easyApply: {
        type: Boolean,
        default: false
    },
    urgent: {
        type: Boolean,
        default: false
    },
    
    // Dates
    deadline: {
        type: Date,
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
    },
    
    // Analytics and tracking
    views: {
        type: Number,
        default: 0
    },
    applicationCount: {
        type: Number,
        default: 0
    },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'published', 'active', 'paused', 'closed', 'expired'],
        default: 'published'
    }
});

const Job = mongoose.model('Job', JobSchema);

module.exports = Job;