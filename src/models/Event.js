import mongoose from "mongoose";

const timelineItemSchema = new mongoose.Schema({
  time: {
    type: String,
    required: true,
  },
  event: {
    type: String,
    required: true,
  },
});

const prizeSchema = new mongoose.Schema({
  place: {
    type: String,
    required: true,
  },
  amount: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
});

const sponsorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  tier: {
    type: String,
    enum: ["platinum", "gold", "silver", "bronze", "other"],
    default: "other",
  },
  logo: {
    type: String,
  },
});

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
});

const socialShareSchema = new mongoose.Schema({
  likes: {
    type: Number,
    default: 0,
  },
  comments: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
});

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide event title"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: [150, "Tagline cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Please provide event description"],
    },
    date: {
      type: String,
      required: [true, "Please provide event date"],
    },
    startDate: {
      type: Date,
      required: [true, "Please provide event start date"],
    },
    endDate: {
      type: Date,
      required: [true, "Please provide event end date"],
    },
    registrationDeadline: {
      type: String,
    },
    duration: {
      type: String,
    },
    location: {
      type: Object,
      address: {
        type: String,
        required: [true, "Please provide event location"],
      },
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    participants: {
      type: String,
    },
    capacity: {
      type: Number,
      default: 0, // 0 means unlimited
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: [true, "Please provide event organizer"],
    },
    organizerName: {
      type: String,
    },
    organizerLogo: {
      type: String,
    },
    category: {
      type: String,
      enum: [
        "conference",
        "workshop",
        "seminar",
        "webinar",
        "hackathon",
        "meetup",
        "networking",
        "other",
      ],
      default: "other",
    },
    // image: {
    //   type: String,
    //   default: "",
    // },
    featured: {
      type: Boolean,
      default: false,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    timeline: {
      type: [
        {
          time: String,
          event: String,
        },
      ],
      default: [],
      validate: {
        validator: function (v) {
          // Ensure it's an array and every item has time and event properties
          if (!Array.isArray(v)) return false;
          return v.every(
            (item) =>
              item &&
              typeof item === "object" &&
              typeof item.time === "string" &&
              typeof item.event === "string"
          );
        },
        message: "Timeline items must contain time and event properties",
      },
    },
    prizes: {
      type: [
        {
          place: String,
          amount: String,
          description: String,
        },
      ],
      default: [],
      validate: {
        validator: function (v) {
          // Ensure it's an array and every item has place and amount properties
          if (!Array.isArray(v)) return false;
          return v.every(
            (item) =>
              item &&
              typeof item === "object" &&
              typeof item.place === "string" &&
              typeof item.amount === "string"
          );
        },
        message: "Prize items must contain place and amount properties",
      },
    },
    sponsors: {
      type: [
        {
          name: String,
          tier: {
            type: String,
            enum: ["platinum", "gold", "silver", "bronze", "other"],
            default: "other",
          },
          logo: String,
        },
      ],
      default: [],
      validate: {
        validator: function (v) {
          // Ensure it's an array and every item has name property
          if (!Array.isArray(v)) return false;
          return v.every(
            (item) =>
              item && typeof item === "object" && typeof item.name === "string"
          );
        },
        message: "Sponsor items must contain name property",
      },
    },
    faqs: {
      type: [
        {
          question: String,
          answer: String,
        },
      ],
      default: [],
      validate: {
        validator: function (v) {
          // Ensure it's an array and every item has question and answer properties
          if (!Array.isArray(v)) return false;
          return v.every(
            (item) =>
              item &&
              typeof item === "object" &&
              typeof item.question === "string" &&
              typeof item.answer === "string"
          );
        },
        message: "FAQ items must contain question and answer properties",
      },
    },
    tags: [String],
    socialShare: {
      type: socialShareSchema,
      default: () => ({}),
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    attendeesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Create text index for search functionality
EventSchema.index({
  title: "text",
  description: "text",
  tags: "text",
});

const Event = mongoose.model("Event", EventSchema);
export default Event;
