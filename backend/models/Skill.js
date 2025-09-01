// backend/models/Skill.js -- THIS IS THE MISSING FILE

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SkillSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true // Prevents duplicate skills in our master list
    }
});

module.exports = mongoose.model('Skill', SkillSchema);

