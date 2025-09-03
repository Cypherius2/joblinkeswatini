// backend/routes/fileRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
require('dotenv').config();

let gfs;
const conn = mongoose.connection;
conn.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
});

// @route   GET /api/files/:filename
// @desc    Retrieve a file from GridFS by its filename
// @access  Public
router.get('/:filename', async (req, res) => {
    try {
        if (!gfs) {
            return res.status(503).json({ msg: 'GridFS is not initialized.' });
        }
        const file = await gfs.find({ filename: req.params.filename }).toArray();
        if (!file || file.length === 0) {
            return res.status(404).json({ msg: 'File not found' });
        }
        gfs.openDownloadStreamByName(req.params.filename).pipe(res);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;