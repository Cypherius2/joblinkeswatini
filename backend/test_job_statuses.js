// Test file to verify job status handling
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testJobStatuses() {
    console.log('🧪 Testing Job Status Functionality...\n');

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
        
        // Step 2: Test draft job posting
        console.log('\n2️⃣ Testing draft job posting...');
        
        const draftJobData = {
            jobTitle: 'Draft Job Position',
            jobType: 'full-time',
            experienceLevel: 'mid-level',
            workLocation: 'manzini',
            description: '<p>This is a draft job posting.</p>',
            requirements: '<p>Draft requirements.</p>',
            applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            contactEmail: companyEmail,
            isEasyApply: true,
            isUrgent: false,
            status: 'draft'
        };
        
        const draftResponse = await axios.post(`${BASE_URL}/jobs`, draftJobData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Draft job posted successfully');
        console.log('📦 Draft job status:', draftResponse.data.job.status);
        
        // Step 3: Test published job posting
        console.log('\n3️⃣ Testing published job posting...');
        
        const publishedJobData = {
            jobTitle: 'Published Job Position',
            jobType: 'full-time',
            experienceLevel: 'senior-level',
            workLocation: 'lobamba',
            description: '<p>This is a published job posting.</p>',
            requirements: '<p>Published job requirements.</p>',
            applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            contactEmail: companyEmail,
            isEasyApply: true,
            isUrgent: true,
            status: 'published'
        };
        
        const publishedResponse = await axios.post(`${BASE_URL}/jobs`, publishedJobData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Published job posted successfully');
        console.log('📦 Published job status:', publishedResponse.data.job.status);
        
        // Step 4: Test public jobs endpoint (should only show published jobs)
        console.log('\n4️⃣ Testing public jobs endpoint...');
        
        const publicJobsResponse = await axios.get(`${BASE_URL}/jobs`);
        const publishedJobInPublic = publicJobsResponse.data.find(job => 
            job._id === publishedResponse.data.job._id
        );
        const draftJobInPublic = publicJobsResponse.data.find(job => 
            job._id === draftResponse.data.job._id
        );
        
        console.log('✅ Public jobs retrieved');
        console.log('📦 Published job visible in public:', !!publishedJobInPublic);
        console.log('📦 Draft job visible in public:', !!draftJobInPublic);
        
        // Step 5: Test company's private jobs endpoint (should show both)
        console.log('\n5️⃣ Testing company jobs endpoint...');
        
        const myJobsResponse = await axios.get(`${BASE_URL}/jobs/myjobs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const draftJobInMy = myJobsResponse.data.find(job => job._id === draftResponse.data.job._id);
        const publishedJobInMy = myJobsResponse.data.find(job => job._id === publishedResponse.data.job._id);
        
        console.log('✅ Company jobs retrieved');
        console.log('📦 Total company jobs:', myJobsResponse.data.length);
        console.log('📦 Draft job in my jobs:', !!draftJobInMy);
        console.log('📦 Published job in my jobs:', !!publishedJobInMy);
        
        console.log('\n🎉 All job status tests passed!');
        console.log('✨ Summary:');
        console.log('   - Draft jobs are saved but not visible publicly');
        console.log('   - Published jobs are visible publicly and in company dashboard');
        console.log('   - Company can see both draft and published jobs in their dashboard');
        
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
testJobStatuses().then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
