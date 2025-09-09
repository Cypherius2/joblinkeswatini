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
        
        const fileData = file[0];
        
        // Set appropriate headers
        res.set({
            'Content-Type': fileData.contentType || 'application/octet-stream',
            'Content-Length': fileData.length,
            'Content-Disposition': `inline; filename="${fileData.metadata?.originalName || fileData.filename}"`
        });
        
        // Stream the file
        const downloadStream = gfs.openDownloadStreamByName(req.params.filename);
        downloadStream.pipe(res);
        
        downloadStream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(404).json({ msg: 'File not found' });
            }
        });
        
    } catch (err) {
        console.error('File serving error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ msg: 'Server Error', error: err.message });
        }
    }
});

// @route   GET /api/files/id/:fileId
// @desc    Retrieve a file from GridFS by its ObjectId
// @access  Public
router.get('/id/:fileId', async (req, res) => {
    try {
        if (!gfs) {
            return res.status(503).json({ msg: 'GridFS is not initialized.' });
        }
        
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const file = await gfs.find({ _id: fileId }).toArray();
        
        if (!file || file.length === 0) {
            return res.status(404).json({ msg: 'File not found' });
        }
        
        const fileData = file[0];
        
        // Set appropriate headers
        res.set({
            'Content-Type': fileData.contentType || 'application/octet-stream',
            'Content-Length': fileData.length,
            'Content-Disposition': `inline; filename="${fileData.metadata?.originalName || fileData.filename}"`
        });
        
        // Stream the file
        const downloadStream = gfs.openDownloadStream(fileId);
        downloadStream.pipe(res);
        
        downloadStream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(404).json({ msg: 'File not found' });
            }
        });
        
    } catch (err) {
        console.error('File serving error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ msg: 'Server Error', error: err.message });
        }
    }
});

module.exports = router;