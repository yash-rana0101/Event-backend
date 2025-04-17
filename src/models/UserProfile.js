import mongoose from "mongoose";

const attendedEventSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  name: String,
  date: String,
  type: String,
  image: String,
  location: String,
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  review: String,
  photos: [String],
});

const upcomingEventSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  name: String,
  date: String,
  type: String,
  image: String,
  location: String,
  ticketType: String,
});

const badgeSchema = new mongoose.Schema({
  name: String,
  description: String,
  type: {
    type: String,
    enum: ["attendance", "review", "exclusive", "achievement", "special"],
    default: "achievement",
  },
  level: {
    type: Number,
    min: 1,
    max: 5,
    default: 1,
  },
});

const notificationPreferenceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "event_reminder",
      "registration_confirmation",
      "event_update",
      "event_notification",
      "admin_notification",
      "new_event",
      "system",
    ],
    required: true,
  },
  name: String,
  enabled: {
    type: Boolean,
    default: true,
  },
  description: String,
});

const UserProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    location: String,
    website: String,
    phone: String,
    joinDate: {
      type: Date,
      default: Date.now,
    },
    eventsAttended: {
      type: Number,
      default: 0,
    },
    upcomingEvents: {
      type: Number,
      default: 0,
    },
    followers: {
      type: Number,
      default: 0,
    },
    following: {
      type: Number,
      default: 0,
    },
    interests: [String],
    preferences: [String],
    attendedEvents: [attendedEventSchema],
    upcomingEventsList: [upcomingEventSchema],
    badges: [badgeSchema],
    savedEvents: {
      type: Number,
      default: 0,
    },
    eventPhotos: {
      type: Number,
      default: 0,
    },
    notificationPreferences: [notificationPreferenceSchema],
  },
  {
    timestamps: true,
  }
);

const UserProfile = mongoose.model("UserProfile", UserProfileSchema);
export default UserProfile;
