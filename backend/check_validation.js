// Script to check MongoDB validation rules
const mongoose = require('mongoose');
require('dotenv').config();

async function checkCollectionValidation() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Get collection info
        const db = mongoose.connection.db;
        const collections = await db.listCollections({ name: 'users' }).toArray();
        
        if (collections.length > 0) {
            const userCollection = collections[0];
            console.log('User collection validation options:');
            console.log(JSON.stringify(userCollection.options, null, 2));
            
            if (userCollection.options.validator) {
                console.log('\n=== VALIDATION RULES ===');
                console.log(JSON.stringify(userCollection.options.validator, null, 2));
            } else {
                console.log('No validation rules found');
            }
        } else {
            console.log('Users collection not found');
        }
        
        // Also check collection stats
        const stats = await db.collection('users').stats();
        console.log('\nCollection stats:');
        console.log(`Count: ${stats.count}`);
        console.log(`Size: ${stats.size}`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkCollectionValidation();
