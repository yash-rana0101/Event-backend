import Member from "../models/Member.js";
import Team from "../models/Team.js";

// @desc    Create a new member
// @route   POST /api/members
// @access  Private
export const createMember = async (req, res) => {
  try {
    const { name, email, role, teamId } = req.body;

    const member = new Member({
      name,
      email,
      role,
      team: teamId,
    });

    const createdMember = await member.save();

    if (teamId) {
      const team = await Team.findById(teamId);
      team.members.push(createdMember._id);
      await team.save();
    }

    res.status(201).json(createdMember);
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

// @desc    Get all members
// @route   GET /api/members
// @access  Private
export const getAllMembers = async (req, res) => {
  try {
    const members = await Member.find({}).populate("team", "name");
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get member by ID
// @route   GET /api/members/:id
// @access  Private
export const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate(
      "team",
      "name"
    );
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    res.json(member);
  } catch (error) {
    if (error.name === "CastError") {
      res.status(400).json({ message: "Invalid member ID" });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Private
export const updateMember = async (req, res) => {
  try {
    const { name, email, role, teamId } = req.body;

    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    member.name = name || member.name;
    member.email = email || member.email;
    member.role = role || member.role;
    member.team = teamId || member.team;

    const updatedMember = await member.save();
    res.json(updatedMember);
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({ message: error.message });
    } else if (error.name === "CastError") {
      res.status(400).json({ message: "Invalid member ID" });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private
export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    await member.remove();
    res.json({ message: "Member removed" });
  } catch (error) {
    if (error.name === "CastError") {
      res.status(400).json({ message: "Invalid member ID" });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};
