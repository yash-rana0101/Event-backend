import mongoose from "mongoose";

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please provide event title"],
    maxlength: 100,
  },
  description: {
    type: String,
    required: [true, "Please provide event description"],
    maxlength: 1000,
  },
  date: {
    type: Date,
    required: [true, "Please provide event date"],
  },
  time: {
    start: {
      type: String,
      required: [true, "Please provide start time"],
    },
    end: {
      type: String,
      required: [true, "Please provide end time"],
    },
  },
  location: {
    address: {
      type: String,
      required: [true, "Please provide event address"],
    },
    city: {
      type: String,
      required: [true, "Please provide city"],
    },
    state: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: [true, "Please provide country"],
    },
    zipCode: {
      type: String,
      required: false,
    },
    coordinates: {
      lat: {
        type: Number,
        required: false,
      },
      lng: {
        type: Number,
        required: false,
      },
    },
  },
  category: {
    type: String,
    required: [true, "Please provide event category"],
    enum: [
      "conference",
      "workshop",
      "seminar",
      "webinar",
      "networking",
      "other",
    ],
  },
  capacity: {
    type: Number,
    required: false,
    default: 0, // 0 means unlimited
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,
    required: function () {
      return this.isPaid;
    },
    default: 0,
  },
  currency: {
    type: String,
    required: function () {
      return this.isPaid;
    },
    default: "USD",
  },
  images: [
    {
      type: String,
      required: false,
    },
  ],
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please provide event organizer"],
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
EventSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Event = mongoose.model("Event", EventSchema);
export default Event;
