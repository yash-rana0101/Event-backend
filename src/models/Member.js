import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide a name"],
    minlength: 3,
    maxlength: 50,
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      "Please provide a valid email",
    ],
    unique: true,
  },
  role: {
    type: String,
    enum: ["member", "leader"],
    default: "member",
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Member = mongoose.model("Member", MemberSchema);
export default Member;
