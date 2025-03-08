import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort("-createdAt")
      .populate("relatedEvent", "title")
      .exec();

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    notification.readAt = Date.now();

    await notification.save();

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true, readAt: Date.now() }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await notification.remove();

    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send notification to users
// @route   POST /api/notifications/send
// @access  Private/Admin
export const sendNotificationToUsers = async (req, res) => {
  try {
    const { title, message, userIds } = req.body;

    const notifications = userIds.map((userId) => ({
      recipient: userId,
      type: "admin_notification",
      title,
      message,
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({ message: "Notifications sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send notification to event attendees
// @route   POST /api/notifications/events/:eventId/notify
// @access  Private/EventOrganizer
export const sendNotificationToEventAttendees = async (req, res) => {
  try {
    const { title, message } = req.body;
    const eventId = req.params.eventId;

    const registrations = await Registration.find({
      event: eventId,
      status: "confirmed",
    })
      .populate("user", "email")
      .exec();

    const notifications = registrations.map((reg) => ({
      recipient: reg.user._id,
      type: "event_notification",
      title,
      message,
      relatedEvent: eventId,
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({ message: "Notifications sent to event attendees" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
