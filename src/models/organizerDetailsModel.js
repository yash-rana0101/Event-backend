import mongoose from "mongoose";

const organizerDetailsSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    expertise: [String],
    stats: {
      eventsHosted: {
        type: Number,
        default: 0,
      },
      totalAttendees: {
        type: String,
        default: "0",
      },
      clientSatisfaction: {
        type: String,
        default: "0%",
      },
      awards: {
        type: Number,
        default: 0,
      },
    },
    socials: [String],
    testimonials: [
      {
        name: String,
        position: String,
        comment: String,
        rating: {
          type: Number,
          min: 1,
          max: 5,
          default: 5,
        },
      },
    ],
    certifications: [String],
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure we don't have duplicate details for an organizer
organizerDetailsSchema.index({ organizer: 1 }, { unique: true });

const OrganizerDetails = mongoose.model(
  "OrganizerDetails",
  organizerDetailsSchema
);

export default OrganizerDetails;
