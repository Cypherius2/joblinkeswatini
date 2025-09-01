// backend/routes/skillRoutes.js -- THIS IS THE MISSING FILE

const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');

// @route   GET api/skills
// @desc    Get all skills from the master list
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Find all skills and sort them alphabetically by name
        const skills = await Skill.find().sort({ name: 1 });
        res.json(skills);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;