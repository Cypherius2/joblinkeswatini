// Script to drop validation rules and allow current schema
const mongoose = require('mongoose');
require('dotenv').config();

async function removeValidation() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const db = mongoose.connection.db;
        
        // Remove validation rules from users collection
        console.log('Removing validation rules...');
        
        const result = await db.command({
            collMod: 'users',
            validator: {},
            validationLevel: 'off'
        });
        
        console.log('Validation rules removed:', result);
        console.log('Users collection can now accept the current Mongoose schema');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

removeValidation();
