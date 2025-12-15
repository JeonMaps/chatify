import express from 'express';
import { getAllContacts, getChatPartners, getMessagesByUserId, sendMessage, deleteMessageForEveryone, deleteMessageForMe, markMessagesAsRead, pinMessage, unpinMessage, getPinnedMessages } from '../controllers/message.controller.js'
import { protectRoute } from '../middleware/auth.middleware.js';
import { arcjetProtection } from '../middleware/arcjet.middleware.js';

const router = express.Router();

//these middlewares will execute in order
router.use(arcjetProtection, protectRoute);

router.get('/contacts', getAllContacts)
router.get('/chats', getChatPartners)
router.get('/:id', getMessagesByUserId)
router.get('/pinned/:id', getPinnedMessages)
router.post('/send/:id', sendMessage)
router.patch('/mark-read/:id', markMessagesAsRead)
router.patch('/pin/:id', pinMessage)
router.patch('/unpin/:id', unpinMessage)
router.delete('/delete-for-everyone/:id', deleteMessageForEveryone)
router.delete('/delete-for-me/:id', deleteMessageForMe)

export default router;