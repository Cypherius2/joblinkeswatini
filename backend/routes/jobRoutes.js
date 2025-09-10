// backend/routes/jobRoutes.js -- FINAL VERSION WITH DEADLINE LOGIC

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Job = require('../models/Jobs'); // Corrected Path
const User = require('../models/User');
const Application = require('../models/Application');

// @route   POST api/jobs (Create a job)
// @desc    Create a new job posting with comprehensive data
// @access  Private (for Companies)
router.post('/', authMiddleware, async (req, res) => {
    try {
        console.log('=== Job Creation Request ===');
        console.log('User ID:', req.user.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        
        const user = await User.findById(req.user.id);
        if (user.role !== 'company') {
            return res.status(403).json({ 
                success: false,
                message: 'Authorization denied: Only company accounts can post jobs.' 
            });
        }

        // Extract and map form fields to database schema
        const { 
            // Basic job info
            jobTitle, title, company, workLocation, location, 
            jobType, experienceLevel, description, requirements,
            
            // Salary and benefits
            salaryMin, salaryMax, benefits,
            
            // Application settings
            applicationDeadline, deadline, contactEmail,
            isEasyApply, easyApply, isUrgent, urgent,
            
            // Additional fields
            status, postedBy, companyId
        } = req.body;

        // Validation
        const finalTitle = jobTitle || title;
        const finalLocation = workLocation || location;
        const finalDeadline = applicationDeadline || deadline;
        const finalCompany = company || user.name;
        
        if (!finalTitle) {
            return res.status(400).json({ 
                success: false,
                message: 'Job title is required.' 
            });
        }
        
        if (!finalDeadline) {
            return res.status(400).json({ 
                success: false,
                message: 'Application deadline is required.' 
            });
        }
        
        if (!description) {
            return res.status(400).json({ 
                success: false,
                message: 'Job description is required.' 
            });
        }
        
        // Build salary range object
        const salaryRange = {};
        if (salaryMin && parseFloat(salaryMin) > 0) {
            salaryRange.min = parseFloat(salaryMin);
        }
        if (salaryMax && parseFloat(salaryMax) > 0) {
            salaryRange.max = parseFloat(salaryMax);
        }
        if (salaryRange.min || salaryRange.max) {
            salaryRange.currency = 'SZL';
            salaryRange.period = 'monthly';
        }
        
        // Build benefits object
        const benefitsObj = {};
        if (benefits && Array.isArray(benefits)) {
            benefitsObj.healthInsurance = benefits.includes('health-insurance');
            benefitsObj.retirementPlan = benefits.includes('retirement-plan');
            benefitsObj.paidTimeOff = benefits.includes('paid-time-off');
            benefitsObj.flexibleHours = benefits.includes('flexible-hours');
            benefitsObj.remoteWork = benefits.includes('remote-work');
            benefitsObj.professionalDevelopment = benefits.includes('professional-development');
            benefitsObj.other = benefits.filter(b => ![
                'health-insurance', 'retirement-plan', 'paid-time-off', 
                'flexible-hours', 'remote-work', 'professional-development'
            ].includes(b));
        }
        
        // Determine work mode from location
        let workMode = 'onsite';
        if (finalLocation === 'remote') {
            workMode = 'remote';
        } else if (finalLocation === 'hybrid') {
            workMode = 'hybrid';
        }
        
        // Build requirements object if it's a string
        let requirementsObj = requirements;
        if (typeof requirements === 'string') {
            requirementsObj = {
                other: requirements
            };
        }
        
        // Handle status mapping and validation
        let finalStatus = status || 'published';
        const validStatuses = ['draft', 'published', 'active', 'paused', 'closed', 'expired'];
        
        if (!validStatuses.includes(finalStatus)) {
            // Map common aliases
            if (finalStatus === 'live') finalStatus = 'published';
            else if (finalStatus === 'inactive') finalStatus = 'paused';
            else finalStatus = 'published'; // Default fallback
        }
        
        const jobData = {
            title: finalTitle,
            company: finalCompany,
            location: finalLocation,
            description,
            jobType: jobType || 'full-time',
            workMode,
            experienceLevel: experienceLevel || 'mid-level',
            deadline: new Date(finalDeadline),
            salaryRange: Object.keys(salaryRange).length > 0 ? salaryRange : undefined,
            requirements: requirementsObj,
            benefits: Object.keys(benefitsObj).length > 0 ? benefitsObj : undefined,
            easyApply: isEasyApply || easyApply || false,
            urgent: isUrgent || urgent || false,
            status: finalStatus,
            user: req.user.id
        };
        
        console.log('Final Job Data:', JSON.stringify(jobData, null, 2));
        
        const newJob = new Job(jobData);
        const savedJob = await newJob.save();
        
        console.log('Job saved successfully:', savedJob._id);
        console.log('=============================');
        
        res.status(201).json({
            success: true,
            message: 'Job posted successfully!',
            job: savedJob
        });
    } catch (err) {
        console.error('Job creation error:', err);
        
        if (err.name === 'ValidationError') {
            const errors = Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            }));
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// @route   GET api/jobs (Get all ACTIVE jobs)
// @desc    Get all active/published job postings that have not expired
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Find jobs that are published/active and not expired
        const jobs = await Job.find({ 
            deadline: { $gte: new Date() },
            status: { $in: ['published', 'active'] }
        }).sort({ date: -1 });
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
// @desc    Get a single job by its ID and track view
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }
        
        // Increment view count (but don't wait for it to complete)
        Job.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();
        
        res.json(job);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Job not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/jobs/:id (Update a job)
// @desc    Update a job posting
// @access  Private (for Companies)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }
        
        // Check if user owns this job
        if (job.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        
        // Extract updatable fields
        const { 
            title, company, location, description, jobType, deadline,
            workMode, experienceLevel, salaryRange, requirements, benefits,
            easyApply, urgent, status
        } = req.body;
        
        // Update job fields
        const updatedJob = await Job.findByIdAndUpdate(
            req.params.id,
            {
                title, company, location, description, jobType, deadline,
                workMode, experienceLevel, salaryRange, requirements, benefits,
                easyApply, urgent, status
            },
            { new: true, runValidators: true }
        );
        
        res.json(updatedJob);
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
        
        // Increment application count for the job
        await Job.findByIdAndUpdate(req.params.id, { $inc: { applicationCount: 1 } });
        
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

// @route   GET api/jobs/:id/analytics
// @desc    Get detailed analytics for a specific job
// @access  Private (for job owner)
router.get('/:id/analytics', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }
        
        // Check if user owns this job
        if (job.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        
        // Get application statistics
        const applications = await Application.find({ job: req.params.id });
        const applicationStats = {
            total: applications.length,
            pending: applications.filter(app => app.status === 'pending').length,
            viewed: applications.filter(app => app.status === 'viewed').length,
            successful: applications.filter(app => app.status === 'successful').length,
            unsuccessful: applications.filter(app => app.status === 'unsuccessful').length
        };
        
        // Calculate application trend (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentApplications = applications.filter(app => app.date >= sevenDaysAgo);
        
        const analytics = {
            jobInfo: {
                title: job.title,
                company: job.company,
                postedDate: job.date,
                deadline: job.deadline,
                status: job.status
            },
            performance: {
                views: job.views,
                applications: applicationStats,
                conversionRate: job.views > 0 ? ((applicationStats.total / job.views) * 100).toFixed(2) : 0
            },
            trends: {
                applicationsLast7Days: recentApplications.length,
                viewsPerDay: job.views > 0 ? (job.views / Math.ceil((Date.now() - job.date) / (1000 * 60 * 60 * 24))).toFixed(1) : 0
            }
        };
        
        res.json(analytics);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/jobs/company/:companyId
// @desc    Get all job postings for a specific company (with ownership controls)
// @access  Private (authentication required)
router.get('/company/:companyId', authMiddleware, async (req, res) => {
    try {
        const requestingUser = await User.findById(req.user.id);
        const isOwner = req.user.id === req.params.companyId;
        
        let query = { user: req.params.companyId };
        
        // If not the owner, only show active/published jobs
        if (!isOwner) {
            query.status = { $in: ['published', 'active'] };
            query.deadline = { $gte: new Date() };
        }
        
        const jobs = await Job.find(query).sort({ date: -1 });
        res.json(jobs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/jobs/public/company/:companyId
// @desc    Get public job postings for a specific company
// @access  Public
router.get('/public/company/:companyId', async (req, res) => {
    try {
        const jobs = await Job.find({ 
            user: req.params.companyId,
            status: { $in: ['published', 'active'] },
            deadline: { $gte: new Date() }
        }).sort({ date: -1 });
        
        res.json(jobs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/jobs/:id/close
// @desc    Close a job posting
// @access  Private (for job owner)
router.patch('/:id/close', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }
        
        // Check if user owns this job
        if (job.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        
        const updatedJob = await Job.findByIdAndUpdate(
            req.params.id,
            { status: 'closed' },
            { new: true, runValidators: true }
        );
        
        res.json({ msg: 'Job posting closed successfully', job: updatedJob });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Job not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/jobs/:id/reopen
// @desc    Reopen a closed job posting
// @access  Private (for job owner)
router.patch('/:id/reopen', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }
        
        // Check if user owns this job
        if (job.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        
        // Check if deadline hasn't passed
        if (job.deadline < new Date()) {
            return res.status(400).json({ 
                msg: 'Cannot reopen job with past deadline. Please update the deadline first.' 
            });
        }
        
        const updatedJob = await Job.findByIdAndUpdate(
            req.params.id,
            { status: 'published' },
            { new: true, runValidators: true }
        );
        
        res.json({ msg: 'Job posting reopened successfully', job: updatedJob });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Job not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET api/jobs/analytics/dashboard
// @desc    Get dashboard analytics for all company jobs
// @access  Private (for Companies)
router.get('/analytics/dashboard', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'company') {
            return res.status(403).json({ msg: 'Authorization denied' });
        }
        
        const jobs = await Job.find({ user: req.user.id });
        const jobIds = jobs.map(job => job._id);
        const applications = await Application.find({ job: { $in: jobIds } });
        
        // Overall statistics
        const totalViews = jobs.reduce((sum, job) => sum + job.views, 0);
        const totalApplications = applications.length;
        const activeJobs = jobs.filter(job => job.status === 'active' && job.deadline >= new Date()).length;
        const expiredJobs = jobs.filter(job => job.deadline < new Date()).length;
        
        // Application status breakdown
        const applicationStats = {
            pending: applications.filter(app => app.status === 'pending').length,
            viewed: applications.filter(app => app.status === 'viewed').length,
            successful: applications.filter(app => app.status === 'successful').length,
            unsuccessful: applications.filter(app => app.status === 'unsuccessful').length
        };
        
        // Top performing jobs
        const topJobs = jobs
            .sort((a, b) => b.views - a.views)
            .slice(0, 5)
            .map(job => ({
                id: job._id,
                title: job.title,
                views: job.views,
                applications: job.applicationCount,
                conversionRate: job.views > 0 ? ((job.applicationCount / job.views) * 100).toFixed(2) : 0
            }));
        
        // Recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentApplications = applications.filter(app => app.date >= thirtyDaysAgo);
        
        const dashboard = {
            overview: {
                totalJobs: jobs.length,
                activeJobs,
                expiredJobs,
                totalViews,
                totalApplications,
                averageConversionRate: totalViews > 0 ? ((totalApplications / totalViews) * 100).toFixed(2) : 0
            },
            applications: applicationStats,
            topPerformingJobs: topJobs,
            recentActivity: {
                applicationsLast30Days: recentApplications.length,
                newJobsLast30Days: jobs.filter(job => job.date >= thirtyDaysAgo).length
            }
        };
        
        res.json(dashboard);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
