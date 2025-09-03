// backend/routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

// Create mongo connection
const conn = mongoose.connection;

// Init gfs
let gfs;
conn.once('open', () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

// @route GET /files/:filename
// @desc Display a single file (image or document)
router.get('/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({ err: 'No file exists' });
        }
        // Check if image
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'application/pdf') {
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({ err: 'Not an image or PDF' });
        }
    });
});

module.exports = router;