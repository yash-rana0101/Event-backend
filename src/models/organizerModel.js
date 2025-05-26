import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const organizerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    organization: {
      type: String,
      required: true,
      trim: true,
    },
    profileImage: String,
    bio: String,
    website: String,
    socialMedia: {
      facebook: String,
      twitter: String,
      linkedin: String,
      instagram: String,
    },
    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      defaultTicketingSettings: {
        currency: {
          type: String,
          default: "USD",
        },
        ticketFeeType: {
          type: String,
          enum: ["absorb", "pass"],
          default: "pass",
        },
      },
    },
    verified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended", "blocked"],
      default: "pending",
    },
    approvalReason: String,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    rejectedAt: Date,
    phone: String,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
organizerSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});
// Password comparison method
organizerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default model("Organizer", organizerSchema);
