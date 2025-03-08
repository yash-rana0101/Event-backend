import mongoose from "mongoose";

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide a team name"],
    minlength: 3,
    maxlength: 50,
  },
  description: {
    type: String,
    required: false,
    maxlength: 500,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Team = mongoose.model("Team", TeamSchema);
export default Team;
