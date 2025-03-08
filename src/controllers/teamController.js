import Team from "../models/Team.js";
import Member from "../models/Member.js";

// @desc    Create a new team
// @route   POST /api/teams
// @access  Private
export const createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;

    const team = new Team({
      name,
      description,
    });

    const createdTeam = await team.save();
    res.status(201).json(createdTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private
export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find({}).populate("members", "name email");
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private
export const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate(
      "members",
      "name email"
    );
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private
export const updateTeam = async (req, res) => {
  try {
    const { name, description } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    team.name = name || team.name;
    team.description = description || team.description;

    const updatedTeam = await team.save();
    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private
export const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Remove members from the team
    await Member.updateMany({ team: team._id }, { $unset: { team: "" } });

    await team.remove();
    res.json({ message: "Team removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
