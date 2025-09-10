// Debug script for document upload issue
const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/joblinkeswatini')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('MongoDB connection error:', err));

// Test document validation
async function testDocumentValidation() {
    try {
        console.log('Testing document validation...');
        
        // Find a test user (you'll need to update this with a real user ID)
        const users = await User.find().limit(1);
        if (users.length === 0) {
            console.log('No users found in database');
            return;
        }
        
        const user = users[0];
        console.log('Testing with user:', user.name);
        
        // Test 1: Valid document data
        console.log('\n--- Test 1: Valid document ---');
        const validDocument = {
            fileId: new mongoose.Types.ObjectId(),
            filename: 'test-document.pdf',
            originalName: 'My Document.pdf',
            contentType: 'application/pdf',
            fileSize: 12345
        };
        
        console.log('Valid document data:', validDocument);
        
        if (!user.documents) user.documents = [];
        user.documents.unshift(validDocument);
        
        try {
            await user.save();
            console.log('✓ Valid document saved successfully');
            
            // Remove the test document
            user.documents.pull(user.documents[0]._id);
            await user.save();
            console.log('✓ Test document removed');
        } catch (validationError) {
            console.log('✗ Valid document failed validation:', validationError.message);
        }
        
        // Test 2: Invalid document data (missing required fields)
        console.log('\n--- Test 2: Invalid document (missing fields) ---');
        const invalidDocument = {
            fileId: new mongoose.Types.ObjectId(),
            filename: 'test-document.pdf',
            // Missing: originalName, contentType, fileSize
        };
        
        console.log('Invalid document data:', invalidDocument);
        
        user.documents.unshift(invalidDocument);
        
        try {
            await user.save();
            console.log('✗ Invalid document was saved (should have failed)');
        } catch (validationError) {
            console.log('✓ Invalid document correctly failed validation:', validationError.message);
            console.log('Validation errors:', Object.keys(validationError.errors));
        }
        
        // Reset user documents
        user.documents = [];
        await user.save();
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Test what happens when we try to save empty documents array
async function testEmptyDocuments() {
    try {
        console.log('\n--- Test 3: Empty documents with validation ---');
        
        const users = await User.find().limit(1);
        const user = users[0];
        
        // Try to push empty objects
        user.documents.push({}, {});
        
        await user.save();
        console.log('Empty documents test completed');
        
    } catch (error) {
        console.log('Empty documents validation error:', error.message);
        if (error.errors) {
            console.log('Specific errors:', Object.keys(error.errors));
        }
    }
}

// Run tests
if (require.main === module) {
    testDocumentValidation().then(() => {
        testEmptyDocuments();
    });
}

module.exports = { testDocumentValidation, testEmptyDocuments };
