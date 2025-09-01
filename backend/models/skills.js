// --- SKILLS ROUTES (DEBUGGING VERSION) ---
router.post('/skills', authMiddleware, async (req, res) => {
    console.log('--- ADD SKILL ROUTE TRIGGERED ---');
    try {
        const { name } = req.body;
        console.log(`[SKILLS LOG 1] Received request to add skill: "${name}"`);

        const user = await User.findById(req.user.id).select('-password');
        console.log(`[SKILLS LOG 2] Found user: "${user.name}"`);

        // Safety check
        if (!user.skills) {
            user.skills = [];
        }

        // Check for duplicates
        if (user.skills.find(skill => skill.name.toLowerCase() === name.toLowerCase())) {
            console.log('[SKILLS LOG 3a] Skill already exists. Sending error.');
            return res.status(400).json({ msg: 'Skill already exists' });
        }

        console.log('[SKILLS LOG 3b] Skill is new. Adding it to the user object.');
        const newSkill = { name };
        user.skills.unshift(newSkill);

        console.log('[SKILLS LOG 4] Attempting to save user to the database...');
        await user.save();

        console.log('[SKILLS LOG 5] User saved successfully. Sending back updated user data.');
        res.json(user);
    } catch (err) {
        console.error('[SKILLS LOG 6] A FATAL ERROR occurred:', err.message);
        res.status(500).send('Server Error');
    }
});