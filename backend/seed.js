// backend/seed.js
const mongoose = require('mongoose');
const Skill = require('./models/Skill');
require('dotenv').config();

const skillsToSeed = [
    'JavaScript', 'React.js', 'Node.js', 'HTML5', 'CSS3', 'Python', 'Django', 'Flask', 'Java', 'Spring Boot', 'SQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes', 'Git', 'Agile Methodologies', 'Scrum', 'Project Management', 'Quality Assurance', 'Customer Service', 'Public Speaking', 'Marketing', 'SEO', 'Graphic Design', 'UI/UX Design'
    // Add as many skills as you want here
];

const seedDB = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    await Skill.deleteMany({}); // Clear existing skills
    console.log('Cleared existing skills.');

    const skillObjects = skillsToSeed.map(name => ({ name }));
    await Skill.insertMany(skillObjects);
    console.log('Master skill list has been seeded!');

    mongoose.connection.close();
};

seedDB().catch(err => {
    console.error(err);
    mongoose.connection.close();
});