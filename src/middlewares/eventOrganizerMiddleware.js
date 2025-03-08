import Event from "../models/Event.js";
import mongoose from "mongoose";

const eventOrganizerMiddleware = async (req, res, next) => {
  try {
    const eventId = req.params.id || req.params.eventId;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user is admin or event organizer
    if (
      req.user &&
      (req.user.role === "admin" ||
        event.organizer.toString() === req.user._id.toString())
    ) {
      req.event = event; // Attach event to request for later use
      next();
    } else {
      res.status(403).json({ message: "Access denied, event organizer only" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default eventOrganizerMiddleware;
