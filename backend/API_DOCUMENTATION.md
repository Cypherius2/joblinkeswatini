# JobLinkEswatini Backend API Documentation

## Overview
This document outlines the enhanced API endpoints for the JobLinkEswatini platform, supporting comprehensive job management, applications handling, and analytics features.

## Models

### Enhanced Job Model
The Job model now includes comprehensive fields to support the modern job posting features:

```javascript
{
  user: ObjectId, // Company that posted the job
  title: String,
  company: String,
  location: String,
  description: String,
  jobType: ['full-time', 'part-time', 'contract', 'internship'],
  workMode: ['remote', 'onsite', 'hybrid'],
  experienceLevel: ['entry-level', 'mid-level', 'senior-level', 'executive'],
  
  // Salary information
  salaryRange: {
    min: Number,
    max: Number,
    currency: String (default: 'SZL'),
    period: ['hourly', 'monthly', 'annually']
  },
  
  // Requirements
  requirements: {
    education: String,
    experience: String,
    skills: [String],
    certifications: [String],
    other: String
  },
  
  // Benefits
  benefits: {
    healthInsurance: Boolean,
    retirementPlan: Boolean,
    paidTimeOff: Boolean,
    flexibleHours: Boolean,
    remoteWork: Boolean,
    professionalDevelopment: Boolean,
    gymMembership: Boolean,
    freeFood: Boolean,
    transportAllowance: Boolean,
    other: [String]
  },
  
  // Application settings
  easyApply: Boolean,
  urgent: Boolean,
  
  // Analytics
  views: Number,
  applicationCount: Number,
  
  // Status and dates
  status: ['active', 'paused', 'closed', 'expired'],
  deadline: Date,
  date: Date
}
```

## Job Routes (`/api/jobs`)

### POST /api/jobs
Create a new job posting with comprehensive details.

**Auth:** Required (Company role)

**Request Body:**
```json
{
  "title": "Software Engineer",
  "company": "Tech Corp",
  "location": "Mbabane, Eswatini",
  "description": "Job description...",
  "jobType": "full-time",
  "workMode": "hybrid",
  "experienceLevel": "mid-level",
  "deadline": "2024-02-15T23:59:59.000Z",
  "salaryRange": {
    "min": 15000,
    "max": 25000,
    "currency": "SZL",
    "period": "monthly"
  },
  "requirements": {
    "education": "Bachelor's degree in Computer Science",
    "experience": "2+ years of software development",
    "skills": ["JavaScript", "Node.js", "MongoDB"],
    "certifications": ["AWS Certified"]
  },
  "benefits": {
    "healthInsurance": true,
    "flexibleHours": true,
    "remoteWork": true
  },
  "easyApply": true,
  "urgent": false
}
```

### GET /api/jobs
Get all active job postings with basic filtering.

**Auth:** Public

### GET /api/jobs/myjobs
Get all jobs posted by the authenticated company.

**Auth:** Required (Company role)

### GET /api/jobs/:id
Get a single job by ID and track view count.

**Auth:** Public

### PUT /api/jobs/:id
Update a job posting.

**Auth:** Required (Job owner only)

**Request Body:** Same as POST, with status field additionally supported.

### DELETE /api/jobs/:id
Delete a job posting.

**Auth:** Required (Job owner only)

### POST /api/jobs/:id/apply
Apply for a job.

**Auth:** Required (Job seeker role)

## Job Analytics Routes

### GET /api/jobs/:id/analytics
Get detailed analytics for a specific job.

**Auth:** Required (Job owner only)

**Response:**
```json
{
  "jobInfo": {
    "title": "Software Engineer",
    "company": "Tech Corp",
    "postedDate": "2024-01-15T10:00:00.000Z",
    "deadline": "2024-02-15T23:59:59.000Z",
    "status": "active"
  },
  "performance": {
    "views": 156,
    "applications": {
      "total": 23,
      "pending": 15,
      "viewed": 5,
      "successful": 2,
      "unsuccessful": 1
    },
    "conversionRate": "14.74"
  },
  "trends": {
    "applicationsLast7Days": 8,
    "viewsPerDay": "12.3"
  }
}
```

### GET /api/jobs/analytics/dashboard
Get comprehensive dashboard analytics for all company jobs.

**Auth:** Required (Company role)

**Response:**
```json
{
  "overview": {
    "totalJobs": 12,
    "activeJobs": 8,
    "expiredJobs": 4,
    "totalViews": 1247,
    "totalApplications": 89,
    "averageConversionRate": "7.14"
  },
  "applications": {
    "pending": 45,
    "viewed": 25,
    "successful": 12,
    "unsuccessful": 7
  },
  "topPerformingJobs": [
    {
      "id": "job_id_1",
      "title": "Senior Developer",
      "views": 234,
      "applications": 28,
      "conversionRate": "11.97"
    }
  ],
  "recentActivity": {
    "applicationsLast30Days": 67,
    "newJobsLast30Days": 5
  }
}
```

## Application Routes (`/api/applications`)

### GET /api/applications/job/:jobId
Get all applications for a specific job with advanced filtering, sorting, and search.

**Auth:** Required (Job owner only)

**Query Parameters:**
- `status`: Filter by application status ('pending', 'viewed', 'successful', 'unsuccessful', 'all')
- `search`: Text search across applicant name, email, headline, location, and cover letter
- `sortBy`: Sort field ('name', 'status', 'date')
- `sortOrder`: Sort order ('asc', 'desc')
- `dateFrom`: Filter applications from date
- `dateTo`: Filter applications to date
- `page`: Page number for pagination (default: 1)
- `limit`: Number of results per page (default: 10)

**Response:**
```json
{
  "applications": [...],
  "pagination": {
    "current": 1,
    "total": 3,
    "count": 23,
    "limit": 10
  }
}
```

### PUT /api/applications/:id
Update application status.

**Auth:** Required (Company that received the application)

### POST /api/applications/:id/notes
Add or update company notes on an application.

**Auth:** Required (Company that received the application)

### GET /api/applications/my-applications
Get all applications submitted by the authenticated user.

**Auth:** Required

## Bulk Operations

### PUT /api/applications/bulk-update
Update status for multiple applications at once.

**Auth:** Required (Company role)

**Request Body:**
```json
{
  "applicationIds": ["app_id_1", "app_id_2", "app_id_3"],
  "status": "viewed"
}
```

### POST /api/applications/bulk-notes
Add notes to multiple applications.

**Auth:** Required (Company role)

**Request Body:**
```json
{
  "applicationIds": ["app_id_1", "app_id_2"],
  "notes": "Interviewed on 2024-01-20. Good technical skills."
}
```

### GET /api/applications/export/csv/:jobId
Export all applications for a job as CSV file.

**Auth:** Required (Job owner only)

**Response:** CSV file download with headers:
- Name, Email, Headline, Location, Status, Applied Date, Experience (Years), Skills, Cover Letter Preview, Company Notes

## Features Implemented

### ✅ Job Management
- **Enhanced Job Model**: Comprehensive fields for modern job postings
- **Job Creation**: Support for all new fields from post-job.html
- **Job Updates**: Companies can edit their posted jobs
- **Job Status Management**: Active, paused, closed, expired states

### ✅ Analytics & Tracking
- **View Tracking**: Automatic view counting for job listings
- **Application Metrics**: Track application counts and conversion rates
- **Performance Analytics**: Detailed job performance insights
- **Dashboard Analytics**: Company-wide statistics and trends

### ✅ Advanced Application Management
- **Filtering & Search**: Filter applications by status, date range, and text search
- **Sorting**: Sort applications by name, status, or date
- **Pagination**: Handle large numbers of applications efficiently
- **Bulk Operations**: Update multiple applications at once
- **CSV Export**: Download applicant data for external analysis

### ✅ Data Integrity
- **Authorization Checks**: Ensure users can only access/modify their own data
- **Input Validation**: Comprehensive validation for all endpoints
- **Error Handling**: Proper error responses for all scenarios

## Frontend Integration

These backend enhancements directly support the frontend pages:

1. **post-job.html**: Uses enhanced job creation endpoint with all new fields
2. **job-applicants.html**: Uses advanced filtering, sorting, search, and bulk operations
3. **job-analytics.html**: Uses analytics endpoints for performance dashboards
4. **manage-job.html**: Uses job update endpoint for editing posted jobs

## Next Steps

The backend is now fully equipped to support:
- Complete job management workflow
- Advanced applicant tracking system
- Comprehensive analytics and reporting
- Bulk operations for efficient management
- CSV exports for data analysis

All API endpoints are production-ready with proper authentication, authorization, validation, and error handling.
