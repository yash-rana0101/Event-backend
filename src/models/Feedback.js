import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: [true, "Please provide event"],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please provide user"],
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, "Please provide rating"],
  },
  comment: {
    type: String,
    required: false,
    maxlength: 500,
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index to ensure a user can only provide feedback once per event
FeedbackSchema.index({ event: 1, user: 1 }, { unique: true });

const Feedback = mongoose.model("Feedback", FeedbackSchema);
export default Feedback;
