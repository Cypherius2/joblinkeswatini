// backend/routes/applicationRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Application = require('../models/Application');
const Job = require('../models/Jobs');

// @route   GET api/applications/job/:jobId
// @desc    Get all applications for a specific job
// @access  Private (for the company that posted the job)
router.get('/job/:jobId', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }

        // Security Check: Ensure the user requesting is the one who posted the job
        if (job.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Find all applications for this job and populate the applicant's details
        const applications = await Application.find({ job: req.params.jobId })
            .populate('applicant', ['name', 'headline', 'profilePicture', 'documents']); // <-- This is the magic line

        res.json(applications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/applications/:id
// @desc    Update the status of an application
// @access  Private (for the company that posted the job)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body; // Get the new status from the request body

        // Find the application by its unique ID
        const application = await Application.findById(req.params.id);

        if (!application) {
            return res.status(404).json({ msg: 'Application not found' });
        }

        // We need to verify that the person updating the status is the company
        // that the application was sent to.
        if (application.company.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Update the status and save
        application.status = status;
        await application.save();

        res.json(application); // Send back the updated application

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   POST api/applications/:id/notes
// @desc    Add or update company notes on an application
// @access  Private (for the company)
router.post('/:id/notes', authMiddleware, async (req, res) => {
    try {
        const { notes } = req.body;
        const application = await Application.findById(req.params.id);

        if (!application) { return res.status(404).json({ msg: 'Application not found' }); }
        if (application.company.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        application.companyNotes = notes;
        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/applications/my-applications
// @desc    Get all applications submitted by the logged-in user
// @access  Private
router.get('/my-applications', authMiddleware, async (req, res) => {
    try {
        // Find all applications where the applicant field matches the logged-in user's ID
        const applications = await Application.find({ applicant: req.user.id })
            .sort({ date: -1 }) // Show the most recent applications first
            .populate('job', ['title', 'company']); // Pull in the job title and company name

        res.json(applications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;