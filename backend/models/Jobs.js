// backend/models/Job.js -- CORRECT CODE

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
    jobType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship'],
        default: 'full-time',
    },
    deadline: {
        type: Date,
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

const Job = mongoose.model('Job', JobSchema);

module.exports = Job;