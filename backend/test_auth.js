// Test file to verify authentication endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/users';

async function testAuth() {
    console.log('🧪 Testing Authentication Endpoints...\n');

    // Test 1: Register a new user
    console.log('1️⃣ Testing Registration...');
    try {
        const registerResponse = await axios.post(`${BASE_URL}/register`, {
            name: 'Test User',
            email: `test-${Date.now()}@example.com`,
            password: 'testpassword123',
            role: 'seeker'
        });
        
        console.log('✅ Registration successful');
        console.log('📦 Response structure:', {
            hasToken: !!registerResponse.data.token,
            hasUser: !!registerResponse.data.user,
            userFields: registerResponse.data.user ? Object.keys(registerResponse.data.user) : [],
            message: registerResponse.data.msg
        });
        
        // Test 2: Login with the same user
        console.log('\n2️⃣ Testing Login...');
        const loginResponse = await axios.post(`${BASE_URL}/login`, {
            email: registerResponse.data.user.email,
            password: 'testpassword123'
        });
        
        console.log('✅ Login successful');
        console.log('📦 Response structure:', {
            hasToken: !!loginResponse.data.token,
            hasUser: !!loginResponse.data.user,
            userFields: loginResponse.data.user ? Object.keys(loginResponse.data.user) : [],
            userId: loginResponse.data.user?._id,
            userRole: loginResponse.data.user?.role
        });
        
        console.log('\n🎉 All tests passed! Login and registration are working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', {
            status: error.response?.status,
            message: error.response?.data?.msg || error.message,
            data: error.response?.data
        });
    }
}

// Run the test
testAuth().then(() => {
    console.log('\n✨ Test completed');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
