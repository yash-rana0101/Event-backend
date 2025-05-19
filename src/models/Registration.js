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
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "attended"],
      default: "confirmed",
    },
    ticketType: {
      type: String,
      default: "general",
    },
    ticketPrice: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "free"],
      default: "free",
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    attendanceDate: {
      type: Date,
    },
    ticketId: {
      type: String,
    },
    additionalInfo: {
      type: Object,
    },
  },
  { timestamps: true }
);

// Add compound index to prevent duplicate registrations
RegistrationSchema.index({ user: 1, event: 1 }, { unique: true });

const Registration = mongoose.model("Registration", RegistrationSchema);

export default Registration;
