const express = require('express');
const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const query = {
      $or: [
        { userId: req.user.id },
        { role: req.user.role },
        { role: 'all' }
      ]
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return successResponse(res, {
      notifications,
      unreadCount
    });
  })
);

router.patch(
  '/:id/read',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    return successResponse(res, { notification });
  })
);

router.post(
  '/read-all',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      {
        $or: [
          { userId: req.user.id },
          { role: req.user.role },
          { role: 'all' }
        ],
        read: false
      },
      { read: true }
    );
    return successResponse(res, {}, 200, 'All notifications marked as read');
  })
);

module.exports = router;
