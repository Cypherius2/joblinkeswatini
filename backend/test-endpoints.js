// Test script for API endpoints
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testEndpoints() {
    console.log('Testing API endpoints...\n');

    // Test basic API
    try {
        const response = await axios.get(`${API_BASE}/api/test`);
        console.log('✅ Basic API test:', response.data);
    } catch (error) {
        console.log('❌ Basic API test failed:', error.message);
    }

    // Test unread-count without auth (should fail)
    try {
        const response = await axios.get(`${API_BASE}/api/messages/unread-count`);
        console.log('⚠️  Unread count without auth:', response.data);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('✅ Unread count properly requires authentication');
        } else {
            console.log('❌ Unread count error:', error.message);
        }
    }

    // Test file serving endpoint
    try {
        const response = await axios.get(`${API_BASE}/api/files/test.txt`);
        console.log('⚠️  File serving test (should 404):', response.status);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log('✅ File serving endpoint working (404 for non-existent file)');
        } else {
            console.log('❌ File serving error:', error.message);
        }
    }

    console.log('\n✅ All endpoint tests completed');
}

if (require.main === module) {
    testEndpoints().catch(console.error);
}

module.exports = { testEndpoints };
