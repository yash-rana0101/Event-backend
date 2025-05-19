import mongoose from "mongoose";

const SavedEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  savedAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
  },
});

// Add compound index to prevent duplicate saved events
SavedEventSchema.index({ user: 1, event: 1 }, { unique: true });

const SavedEvent = mongoose.model("SavedEvent", SavedEventSchema);

export default SavedEvent;
