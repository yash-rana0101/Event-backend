import { Schema, model } from "mongoose";
import bcryptjs from "bcryptjs";
const { hash, compare } = bcryptjs;

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
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
organizerSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await hash(this.password, 10);
  }
  next();
});

// Password comparison method
organizerSchema.methods.comparePassword = async function (candidatePassword) {
  return compare(candidatePassword, this.password);
};

export default model("Organizer", organizerSchema);
