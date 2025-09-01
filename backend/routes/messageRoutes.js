// backend/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const User = require('../models/User');

// @route   POST api/messages/:receiverId
// @desc    Send a new message to a user
// @access  Private
router.post('/:receiverId', authMiddleware, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ msg: 'Message content cannot be empty.' });
        }

        const newMessage = new Message({
            sender: req.user.id,
            receiver: req.params.receiverId,
            content: content
        });

        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/messages/conversation/:otherUserId
// @desc    Get a conversation and mark messages as read
// @access  Private
router.get('/conversation/:otherUserId', authMiddleware, async (req, res) => {
    try {
        const loggedInUserId = req.user.id;
        const otherUserId = req.params.otherUserId;

        // --- THIS IS THE NEW, CRUCIAL STEP ---
        // When a user opens a conversation, we find all messages sent TO them
        // from the other user that are unread, and we update them.
        await Message.updateMany(
            { sender: otherUserId, receiver: loggedInUserId, isRead: false },
            { $set: { isRead: true } }
        );
        // ------------------------------------

        // The rest of the function fetches the now-updated conversation history
        const messages = await Message.find({
            $or: [
                { sender: loggedInUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: loggedInUserId }
            ]
        }).sort({ timestamp: 1 });

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/messages/conversations
// @desc    Get a list of the user's conversations with unread counts
// @access  Private
router.get('/conversations', authMiddleware, async (req, res) => {
    try {
        // Find all messages involving the current user
        const messages = await Message.find({
            $or: [{ sender: req.user.id }, { receiver: req.user.id }]
        }).populate('sender', 'name profilePicture').populate('receiver', 'name profilePicture');

        const conversations = {};

        messages.forEach(message => {
            const otherUser = message.sender._id.toString() === req.user.id ? message.receiver : message.sender;
            const otherUserId = otherUser._id.toString();

            if (!conversations[otherUserId]) {
                conversations[otherUserId] = {
                    withUser: otherUser,
                    lastMessage: message.content,
                    timestamp: message.timestamp,
                    unreadCount: 0
                };
            }

            // If the message is newer, update the last message
            if (message.timestamp > conversations[otherUserId].timestamp) {
                conversations[otherUserId].lastMessage = message.content;
                conversations[otherUserId].timestamp = message.timestamp;
            }

            // If the message was sent TO me and is unread, increment the count
            if (message.receiver.toString() === req.user.id && !message.isRead) {
                conversations[otherUserId].unreadCount++;
            }
        });

        const sortedConversations = Object.values(conversations).sort((a, b) => b.timestamp - a.timestamp);

        res.json(sortedConversations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/messages/unread-count
// @desc    Get the count of the user's unread messages
// @access  Private
router.get('/unread-count', authMiddleware, async (req, res) => {
    try {
        const unreadCount = await Message.countDocuments({
            receiver: req.user.id,
            isRead: false
        });
        res.json({ unreadCount });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;