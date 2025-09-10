// Simple test to verify uploads work after schema fixes
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// You'll need to replace this with a valid JWT token from your app
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';

async function testProfilePictureUpload() {
    try {
        // Create a simple test image file
        const testImagePath = path.join(__dirname, 'test_image.txt');
        fs.writeFileSync(testImagePath, 'This is a test file for upload testing');
        
        const formData = new FormData();
        formData.append('profilePicture', fs.createReadStream(testImagePath), {
            filename: 'test_image.png',
            contentType: 'image/png'
        });
        
        const response = await axios.post('http://localhost:3000/api/users/profilePicture', formData, {
            headers: {
                ...formData.getHeaders(),
                'x-auth-token': JWT_TOKEN
            }
        });
        
        console.log('Profile picture upload successful!');
        console.log('Response:', response.data);
        
        // Clean up test file
        fs.unlinkSync(testImagePath);
        
    } catch (error) {
        console.error('Profile picture upload failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Uncomment and add a valid JWT token to test
// testProfilePictureUpload();

console.log('Test script ready. Add a valid JWT token and uncomment the test call to run.');
