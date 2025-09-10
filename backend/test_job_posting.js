// Test file to verify job posting functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testJobPosting() {
    console.log('🧪 Testing Job Posting Functionality...\n');

    try {
        // Step 1: Register a company user
        console.log('1️⃣ Creating test company user...');
        const companyEmail = `company-${Date.now()}@test.com`;
        const registerResponse = await axios.post(`${BASE_URL}/users/register`, {
            name: 'Test Company Ltd',
            email: companyEmail,
            password: 'testpassword123',
            role: 'company'
        });
        
        const token = registerResponse.data.token;
        console.log('✅ Company user created successfully');
        
        // Step 2: Test job posting with comprehensive data
        console.log('\n2️⃣ Testing job posting...');
        
        const jobData = {
            // Basic info (matching frontend form)
            jobTitle: 'Senior Software Developer',
            jobType: 'full-time',
            experienceLevel: 'senior-level',
            workLocation: 'mbabane',
            description: '<p>We are looking for a <strong>Senior Software Developer</strong> to join our dynamic team.</p><ul><li>Develop high-quality software</li><li>Collaborate with cross-functional teams</li><li>Mentor junior developers</li></ul>',
            requirements: '<p>Required qualifications:</p><ul><li>5+ years of software development experience</li><li>Proficiency in JavaScript, Node.js, MongoDB</li><li>Strong problem-solving skills</li></ul>',
            
            // Salary and benefits
            salaryMin: '25000',
            salaryMax: '35000',
            benefits: ['health-insurance', 'flexible-hours', 'remote-work', 'retirement-plan'],
            
            // Application settings
            applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            contactEmail: companyEmail,
            isEasyApply: true,
            isUrgent: false,
            
            // Additional fields
            status: 'active'
        };
        
        const jobResponse = await axios.post(`${BASE_URL}/jobs`, jobData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Job posted successfully');
        console.log('📦 Response structure:', {
            success: jobResponse.data.success,
            message: jobResponse.data.message,
            hasJob: !!jobResponse.data.job,
            jobId: jobResponse.data.job?._id,
            jobTitle: jobResponse.data.job?.title,
            salary: jobResponse.data.job?.salaryRange,
            benefits: jobResponse.data.job?.benefits,
            workMode: jobResponse.data.job?.workMode
        });
        
        // Step 3: Test retrieving the posted job
        console.log('\n3️⃣ Testing job retrieval...');
        const jobId = jobResponse.data.job._id;
        
        const getJobResponse = await axios.get(`${BASE_URL}/jobs/${jobId}`);
        console.log('✅ Job retrieved successfully');
        console.log('📦 Retrieved job data:', {
            title: getJobResponse.data.title,
            company: getJobResponse.data.company,
            location: getJobResponse.data.location,
            workMode: getJobResponse.data.workMode,
            views: getJobResponse.data.views,
            hasSalaryRange: !!getJobResponse.data.salaryRange,
            hasBenefits: !!getJobResponse.data.benefits
        });
        
        // Step 4: Test company's jobs endpoint
        console.log('\n4️⃣ Testing company jobs retrieval...');
        const myJobsResponse = await axios.get(`${BASE_URL}/jobs/myjobs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Company jobs retrieved successfully');
        console.log('📦 My jobs:', {
            count: myJobsResponse.data.length,
            hasPostedJob: myJobsResponse.data.some(job => job._id === jobId)
        });
        
        console.log('\n🎉 All job posting tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            errors: error.response?.data?.errors,
            data: error.response?.data
        });
    }
}

// Run the test
testJobPosting().then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
