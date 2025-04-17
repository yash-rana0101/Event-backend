import mongoose from "mongoose";

const SavedEventSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

// Create a compound index to ensure a user can only save an event once
SavedEventSchema.index({ user: 1, event: 1 }, { unique: true });

const SavedEvent = mongoose.model("SavedEvent", SavedEventSchema);
export default SavedEvent;
