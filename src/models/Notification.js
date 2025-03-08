import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please provide recipient user"],
  },
  type: {
    type: String,
    enum: [
      "event_reminder",
      "registration_confirmation",
      "event_update",
      "payment_confirmation",
      "system",
    ],
    required: [true, "Please provide notification type"],
  },
  title: {
    type: String,
    required: [true, "Please provide notification title"],
  },
  message: {
    type: String,
    required: [true, "Please provide notification message"],
  },
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create index for faster queries on recipient and read status
NotificationSchema.index({ recipient: 1, isRead: 1 });

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
