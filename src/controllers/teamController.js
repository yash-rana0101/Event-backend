import Team from "../models/Team.js";
import TeamRequest from "../models/TeamRequest.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import ApiResponse from "../utils/apiResponse.js";

// Get all teams (with various filters)
export const getAllTeams = async (req, res) => {
  try {
    const {
      search,
      event,
      hasOpenings,
      tags,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Add filters
    if (search) {
      query.$text = { $search: search };
    }

    if (event) {
      query.event = event;
    }

    if (tags) {
      const tagArray = tags.split(",");
      query.tags = { $in: tagArray };
    }

    // Only show teams with openings if requested
    if (hasOpenings === "true") {
      query.$expr = { $lt: [{ $size: "$members" }, "$maxMembers"] };
    }

    // Only show open teams by default (unless explicitly requesting closed ones)
    if (req.query.isOpen !== "false") {
      query.isOpen = true;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with population
    const teams = await Team.find(query)
      .populate("owner", "name avatar")
      .populate("event", "title date")
      .populate("members.user", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Count total teams matching query (for pagination)
    const totalTeams = await Team.countDocuments(query);

    return ApiResponse.success(res, "Teams retrieved successfully", {
      teams,
      pagination: {
        total: totalTeams,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalTeams / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting teams:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Get single team by ID
export const getTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId)
      .populate("owner", "name avatar")
      .populate("event", "title date location")
      .populate("members.user", "name avatar");

    if (!team) {
      return ApiResponse.notFound(res, "Team not found");
    }

    return ApiResponse.success(res, "Team retrieved successfully", { team });
  } catch (error) {
    console.error("Error getting team:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Create a new team
export const createTeam = async (req, res) => {
  try {
    const { name, description, eventId, maxMembers, tags } = req.body;
    const userId = req.user._id;

    // Basic validation
    if (!name || !description || !eventId) {
      return res.status(400).json({
        success: false,
        message: "Name, description and event are required fields",
      });
    }

    // Check if event exists - but don't check publication status
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Create team
    const team = new Team({
      name,
      description,
      event: eventId,
      owner: userId,
      maxMembers: maxMembers || 5,
      tags: tags || [],
      members: [
        {
          user: userId,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
    });

    await team.save();

    // Populate owner details for response
    await team.populate("owner", "name email");
    await team.populate("event", "title");

    return res.status(201).json({
      success: true,
      message: "Team created successfully",
      team,
    });
  } catch (error) {
    console.error("Error creating team:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create team",
      error: error.message,
    });
  }
};

// Update team
export const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description, maxMembers, tags, isOpen } = req.body;

    // Find team and verify ownership
    const team = await Team.findById(teamId);

    if (!team) {
      return ApiResponse.notFound(res, "Team not found");
    }

    // Only owner can update team details
    if (team.owner.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(
        res,
        "You are not authorized to update this team"
      );
    }

    // Update fields
    if (name) team.name = name;
    if (description) team.description = description;
    if (maxMembers) team.maxMembers = maxMembers;
    if (tags) team.tags = tags;
    if (isOpen !== undefined) team.isOpen = isOpen;

    await team.save();

    // Refresh data
    await team.populate("owner", "name avatar");
    await team.populate("event", "title date");
    await team.populate("members.user", "name avatar");

    return ApiResponse.success(res, "Team updated successfully", { team });
  } catch (error) {
    console.error("Error updating team:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Delete team
export const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Find team and verify ownership
    const team = await Team.findById(teamId);

    if (!team) {
      return ApiResponse.notFound(res, "Team not found");
    }

    // Only owner can delete team
    if (team.owner.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(
        res,
        "You are not authorized to delete this team"
      );
    }

    // Remove all pending requests
    await TeamRequest.deleteMany({ team: teamId });

    // Delete team
    await Team.findByIdAndDelete(teamId);

    return ApiResponse.success(res, "Team deleted successfully", null);
  } catch (error) {
    console.error("Error deleting team:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Apply to join team
export const applyToTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { message } = req.body;

    // Find team
    const team = await Team.findById(teamId);

    if (!team) {
      return ApiResponse.notFound(res, "Team not found");
    }

    // Check if team is open for applications
    if (!team.isOpen) {
      return ApiResponse.badRequest(
        res,
        "This team is not accepting applications"
      );
    }

    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return ApiResponse.badRequest(res, "Team is already at maximum capacity");
    }

    // Check if user is already a member
    if (
      team.members.some(
        (member) => member.user.toString() === req.user._id.toString()
      )
    ) {
      return ApiResponse.badRequest(
        res,
        "You are already a member of this team"
      );
    }

    // Check for existing request
    const existingRequest = await TeamRequest.findOne({
      team: teamId,
      user: req.user._id,
    });

    if (existingRequest) {
      return ApiResponse.badRequest(
        res,
        "You have already applied to this team"
      );
    }

    // Create new request
    const newRequest = new TeamRequest({
      team: teamId,
      user: req.user._id,
      message: message || "I'd like to join your team!",
    });

    await newRequest.save();

    // Return populated request
    await newRequest.populate("team", "name");
    await newRequest.populate("user", "name avatar");

    return ApiResponse.success(
      res,
      "Team application submitted successfully",
      { request: newRequest },
      201
    );
  } catch (error) {
    console.error("Error applying to team:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Get user team requests
export const getUserRequests = async (req, res) => {
  try {
    const requests = await TeamRequest.find({ user: req.user._id })
      .populate("team", "name")
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "Team requests retrieved successfully", {
      requests,
    });
  } catch (error) {
    console.error("Error getting user requests:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Cancel team application (by applicant)
export const cancelRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await TeamRequest.findById(requestId);

    if (!request) {
      return ApiResponse.notFound(res, "Request not found");
    }

    // Verify ownership
    if (request.user.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(
        res,
        "You are not authorized to cancel this request"
      );
    }

    // Remove request
    await TeamRequest.findByIdAndDelete(requestId);

    return ApiResponse.success(res, "Team application cancelled successfully");
  } catch (error) {
    console.error("Error cancelling request:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Manage team requests (for team owners)
export const manageTeamRequests = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Find team and verify ownership
    const team = await Team.findById(teamId);

    if (!team) {
      return ApiResponse.notFound(res, "Team not found");
    }

    // Verify current user is the owner
    if (team.owner.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(
        res,
        "Only team owners can view team requests"
      );
    }

    // Get pending requests
    const requests = await TeamRequest.find({
      team: teamId,
      status: "pending",
    })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "Team requests retrieved successfully", {
      requests,
    });
  } catch (error) {
    console.error("Error getting team requests:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Respond to team request (accept/reject)
export const respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!status || !["accepted", "rejected"].includes(status)) {
      return ApiResponse.badRequest(
        res,
        "Invalid status. Must be 'accepted' or 'rejected'"
      );
    }

    // Find request
    const request = await TeamRequest.findById(requestId)
      .populate("team")
      .populate("user", "name avatar");

    if (!request) {
      return ApiResponse.notFound(res, "Request not found");
    }

    // Find team and verify ownership
    const team = await Team.findById(request.team._id);

    // Verify current user is the owner
    if (team.owner.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(
        res,
        "Only team owners can respond to team requests"
      );
    }

    // If accepting, check if team is full
    if (status === "accepted" && team.members.length >= team.maxMembers) {
      return ApiResponse.badRequest(res, "Team is at maximum capacity");
    }

    // Update request status
    request.status = status;
    await request.save();

    // If accepted, add user to team members
    if (status === "accepted") {
      team.members.push({
        user: request.user._id,
        role: "member",
        joinedAt: new Date(),
      });

      await team.save();
    }

    return ApiResponse.success(res, `Request ${status} successfully`, {
      request,
    });
  } catch (error) {
    console.error("Error responding to request:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Leave team
export const leaveTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Find team
    const team = await Team.findById(teamId);

    if (!team) {
      return ApiResponse.notFound(res, "Team not found");
    }

    // Check if user is a member
    const memberIndex = team.members.findIndex(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (memberIndex === -1) {
      return ApiResponse.badRequest(res, "You are not a member of this team");
    }

    // If user is owner, prevent leaving
    if (team.owner.toString() === req.user._id.toString()) {
      return ApiResponse.badRequest(
        res,
        "Team owner cannot leave. Transfer ownership or delete the team instead."
      );
    }

    // Remove member
    team.members.splice(memberIndex, 1);
    await team.save();

    return ApiResponse.success(res, "You have left the team successfully");
  } catch (error) {
    console.error("Error leaving team:", error);
    return ApiResponse.error(res, error.message);
  }
};

// Get teams the user is a member of
export const getUserTeams = async (req, res) => {
  try {
    const teams = await Team.find({
      "members.user": req.user._id,
    })
      .populate("owner", "name avatar")
      .populate("event", "title date location")
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "User teams retrieved successfully", {
      teams,
    });
  } catch (error) {
    console.error("Error getting user teams:", error);
    return ApiResponse.error(res, error.message);
  }
};
