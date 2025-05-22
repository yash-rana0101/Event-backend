import mongoose from "mongoose";

const TeamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Team description is required"],
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Team must have an owner"],
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Team must be associated with an event"],
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    maxMembers: {
      type: Number,
      default: 5,
      min: [2, "Team must allow at least 2 members"],
      max: [10, "Team cannot have more than 10 members"],
    },
    tags: [String],
    isOpen: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Virtual for current member count
TeamSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

// Middleware to update timestamps
TeamSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient search
TeamSchema.index({ name: "text", description: "text", tags: "text" });

const Team = mongoose.model("Team", TeamSchema);
export default Team;
