// backend/routes/applicationRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Application = require('../models/Application');
const Job = require('../models/Jobs');

// @route   GET api/applications/job/:jobId
// @desc    Get all applications for a specific job with filtering, sorting, and search
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

        // Build filter query
        let filter = { job: req.params.jobId };
        
        // Filter by status
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }
        
        // Date range filter
        if (req.query.dateFrom || req.query.dateTo) {
            filter.date = {};
            if (req.query.dateFrom) filter.date.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) filter.date.$lte = new Date(req.query.dateTo);
        }
        
        // Build sort query
        let sortQuery = {};
        switch (req.query.sortBy) {
            case 'name':
                sortQuery = { 'applicant.name': req.query.sortOrder === 'desc' ? -1 : 1 };
                break;
            case 'status':
                sortQuery = { status: req.query.sortOrder === 'desc' ? -1 : 1 };
                break;
            case 'date':
            default:
                sortQuery = { date: req.query.sortOrder === 'asc' ? 1 : -1 };
                break;
        }
        
        // Find applications with filters and populate applicant details
        let query = Application.find(filter)
            .populate('applicant', ['name', 'email', 'headline', 'location', 'profilePicture', 'documents', 'experience', 'skills'])
            .sort(sortQuery);
        
        let applications = await query.exec();
        
        // Apply text search filter (after population)
        if (req.query.search) {
            const searchTerm = req.query.search.toLowerCase();
            applications = applications.filter(app => {
                const applicant = app.applicant;
                return applicant.name.toLowerCase().includes(searchTerm) ||
                       (applicant.email && applicant.email.toLowerCase().includes(searchTerm)) ||
                       (applicant.headline && applicant.headline.toLowerCase().includes(searchTerm)) ||
                       (applicant.location && applicant.location.toLowerCase().includes(searchTerm)) ||
                       (app.coverLetter && app.coverLetter.toLowerCase().includes(searchTerm));
            });
        }
        
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        
        const paginatedApplications = applications.slice(startIndex, endIndex);
        
        res.json({
            applications: paginatedApplications,
            pagination: {
                current: page,
                total: Math.ceil(applications.length / limit),
                count: applications.length,
                limit
            }
        });
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

// @route   PUT api/applications/bulk-update
// @desc    Bulk update application statuses
// @access  Private (for companies)
router.put('/bulk-update', authMiddleware, async (req, res) => {
    try {
        const { applicationIds, status } = req.body;
        
        if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({ msg: 'Application IDs array is required' });
        }
        
        if (!status || !['pending', 'viewed', 'successful', 'unsuccessful'].includes(status)) {
            return res.status(400).json({ msg: 'Valid status is required' });
        }
        
        // Find applications and verify ownership
        const applications = await Application.find({ _id: { $in: applicationIds } });
        
        // Check if user is authorized to update all applications
        const unauthorizedApps = applications.filter(app => app.company.toString() !== req.user.id);
        if (unauthorizedApps.length > 0) {
            return res.status(401).json({ msg: 'User not authorized for some applications' });
        }
        
        // Perform bulk update
        const result = await Application.updateMany(
            { _id: { $in: applicationIds }, company: req.user.id },
            { status: status }
        );
        
        res.json({ 
            msg: `Successfully updated ${result.modifiedCount} applications`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/applications/export/csv/:jobId
// @desc    Export applications for a job as CSV
// @access  Private (for companies)
router.get('/export/csv/:jobId', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }
        
        // Check if user owns this job
        if (job.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        
        // Get applications with full applicant details
        const applications = await Application.find({ job: req.params.jobId })
            .populate('applicant', ['name', 'email', 'headline', 'location', 'experience', 'skills'])
            .sort({ date: -1 });
        
        // Build CSV content
        const csvHeaders = [
            'Name',
            'Email', 
            'Headline',
            'Location',
            'Status',
            'Applied Date',
            'Experience (Years)',
            'Skills',
            'Cover Letter Preview',
            'Company Notes'
        ];
        
        const csvRows = applications.map(app => {
            const applicant = app.applicant;
            const experienceYears = applicant.experience && applicant.experience.length > 0 
                ? applicant.experience.length 
                : 0;
            const skills = applicant.skills && applicant.skills.length > 0
                ? applicant.skills.map(skill => skill.name).join('; ')
                : 'N/A';
            const coverLetterPreview = app.coverLetter 
                ? app.coverLetter.substring(0, 100) + (app.coverLetter.length > 100 ? '...' : '')
                : 'N/A';
            
            return [
                applicant.name || 'N/A',
                applicant.email || 'N/A',
                applicant.headline || 'N/A',
                applicant.location || 'N/A',
                app.status,
                app.date.toISOString().split('T')[0],
                experienceYears,
                skills,
                coverLetterPreview.replace(/["\r\n]/g, ' '),
                (app.companyNotes || 'N/A').replace(/["\r\n]/g, ' ')
            ];
        });
        
        // Convert to CSV format
        const csvContent = [
            csvHeaders.join(','),
            ...csvRows.map(row => 
                row.map(field => `"${field}"`).join(',')
            )
        ].join('\n');
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${job.title.replace(/[^a-zA-Z0-9]/g, '_')}_applications.csv"`);
        
        res.send(csvContent);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/applications/bulk-notes
// @desc    Add notes to multiple applications
// @access  Private (for companies)
router.post('/bulk-notes', authMiddleware, async (req, res) => {
    try {
        const { applicationIds, notes } = req.body;
        
        if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({ msg: 'Application IDs array is required' });
        }
        
        // Find applications and verify ownership
        const applications = await Application.find({ _id: { $in: applicationIds } });
        
        const unauthorizedApps = applications.filter(app => app.company.toString() !== req.user.id);
        if (unauthorizedApps.length > 0) {
            return res.status(401).json({ msg: 'User not authorized for some applications' });
        }
        
        // Perform bulk notes update
        const result = await Application.updateMany(
            { _id: { $in: applicationIds }, company: req.user.id },
            { companyNotes: notes }
        );
        
        res.json({ 
            msg: `Successfully updated notes for ${result.modifiedCount} applications`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
