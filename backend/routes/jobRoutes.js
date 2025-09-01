// backend/routes/jobRoutes.js -- FINAL VERSION WITH DEADLINE LOGIC

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Job = require('../models/Jobs'); // Corrected Path
const User = require('../models/User');
const Application = require('../models/Application');

// @route   POST api/jobs (Create a job)
// @desc    Create a new job posting with a deadline
// @access  Private (for Companies)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'company') {
            return res.status(403).json({ msg: 'Authorization denied: Only company accounts can post jobs.' });
        }

        // Add 'deadline' to the destructured properties from the request body
        const { title, company, location, description, jobType, deadline } = req.body;

        if (!deadline) {
            return res.status(400).json({ msg: 'Application deadline is a required field.' });
        }

        const newJob = new Job({
            title, company, location, description, jobType, deadline, // Add deadline to the new Job object
            user: req.user.id
        });

        const job = await newJob.save();
        res.status(201).json(job);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/jobs (Get all ACTIVE jobs)
// @desc    Get all job postings that have not expired
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Find only jobs where the deadline is greater than or equal to the current time ($gte)
        const jobs = await Job.find({ deadline: { $gte: new Date() } }).sort({ date: -1 });
        res.json(jobs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/jobs/myjobs (Get company's own jobs, including past jobs)
// @desc    Get all jobs posted by the logged-in company user
// @access  Private (for Companies)
router.get('/myjobs', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'company') {
            return res.status(403).json({ msg: 'Authorization denied' });
        }
        // No deadline filter here, so companies can see their expired posts
        const jobs = await Job.find({ user: req.user.id }).sort({ date: -1 });
        res.json(jobs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/jobs/:id (Get a single job)
// @desc    Get a single job by its ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }
        res.json(job);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Job not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST api/jobs/:id/apply (Apply for a job)
// @desc    Apply for a job, checking the deadline
// @access  Private (for Job Seekers)
router.post('/:id/apply', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) { return res.status(404).json({ msg: 'Job not found' }); }

        // --- NEW DEADLINE SECURITY CHECK ---
        if (new Date(job.deadline) < new Date()) {
            return res.status(400).json({ msg: 'The application deadline for this job has passed.' });
        }
        // ------------------------------------

        const applicantUser = await User.findById(req.user.id);
        if (applicantUser.role !== 'seeker') {
            return res.status(403).json({ msg: 'Only job seekers can apply for jobs.' });
        }

        const existingApplication = await Application.findOne({ job: req.params.id, applicant: req.user.id });
        if (existingApplication) {
            return res.status(400).json({ msg: 'You have already applied for this job' });
        }

        const { coverLetter, attachedDocumentIds } = req.body;
        const documentsToAttach = applicantUser.documents.filter(doc =>
            attachedDocumentIds.includes(doc._id.toString())
        );

        const newApplication = new Application({
            job: req.params.id,
            applicant: req.user.id,
            company: job.user,
            coverLetter: coverLetter,
            attachedDocuments: documentsToAttach
        });

        await newApplication.save();
        res.json({ msg: 'Application submitted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/jobs/:id (Delete a job)
// @desc    Delete a job posting
// @access  Private (for Companies)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }
        if (job.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        await job.deleteOne();
        res.json({ msg: 'Job removed successfully' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Job not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;