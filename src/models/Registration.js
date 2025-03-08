import mongoose from "mongoose";

const RegistrationSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending",
  },
  paymentStatus: {
    type: String,
    enum: ["not_applicable", "pending", "completed", "refunded"],
    default: "not_applicable",
  },
  paymentInfo: {
    transactionId: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      required: false,
    },
    method: {
      type: String,
      required: false,
    },
    paidAt: {
      type: Date,
      required: false,
    },
  },
  attendanceStatus: {
    type: Boolean,
    default: false,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    required: false,
  },
});

// Index to ensure a user can't register for the same event multiple times
RegistrationSchema.index({ event: 1, user: 1 }, { unique: true });

const Registration = mongoose.model("Registration", RegistrationSchema);
export default Registration;
