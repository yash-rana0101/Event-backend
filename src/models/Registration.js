import mongoose from "mongoose";

const RegistrationSchema = new mongoose.Schema(
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
    ticketPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate registrations
RegistrationSchema.index({ user: 1, event: 1 }, { unique: true });

const Registration = mongoose.model("Registration", RegistrationSchema);
export default Registration;
