import Joi from "joi";

const schemas = {
  register: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().trim().lowercase().required(),
    password: Joi.string()
      .min(8)
      .max(72)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      )
      .required()
      .messages({
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
      }),
    organization: Joi.string().trim().min(2).max(100).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  event: Joi.object({
    title: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().min(10).max(2000).required(),
    startDate: Joi.date().greater("now").required(),
    endDate: Joi.date().greater(Joi.ref("startDate")).required(),
    venue: Joi.object({
      name: Joi.string().required(),
      address: Joi.string().required(),
      city: Joi.string().required(),
      country: Joi.string().required(),
    }).required(),
    ticketTypes: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          price: Joi.number().min(0).required(),
          quantity: Joi.number().integer().min(1).required(),
        })
      )
      .min(1)
      .required(),
    capacity: Joi.number().integer().min(1).max(100000).required(),
  }),

  registration: Joi.object({
    ticketType: Joi.string().required(),
    quantity: Joi.number().integer().min(1).max(10).required(),
    attendeeDetails: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
          phone: Joi.string().optional(),
          dietaryRequirements: Joi.string().optional(),
          specialNeeds: Joi.string().optional(),
        })
      )
      .min(1)
      .required(),
  }),

  feedback: Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().min(3).max(500).required(),
    anonymous: Joi.boolean().default(false),
  }),

  memberInvite: Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid("member", "admin", "viewer").default("member"),
    message: Joi.string().max(500),
  }),

  updateRole: Joi.object({
    role: Joi.string().valid("member", "admin", "viewer").required(),
  }),

  team: Joi.object({
    name: Joi.string().trim().min(3).max(50).required(),
    description: Joi.string().trim().max(500),
    isPublic: Joi.boolean().default(false),
    logo: Joi.string().uri().optional(),
    settings: Joi.object({
      allowMemberInvites: Joi.boolean().default(false),
    }).optional(),
  }),

  updateTeam: Joi.object({
    name: Joi.string().trim().min(3).max(50),
    description: Joi.string().trim().max(500),
    isPublic: Joi.boolean(),
    logo: Joi.string().uri().optional(),
    settings: Joi.object({
      allowMemberInvites: Joi.boolean(),
    }).optional(),
  }).min(1), // Require at least one field to be updated

  updateProfile: Joi.object({
    name: Joi.string().trim().min(2).max(50),
    organization: Joi.string().trim().min(2).max(100),
    profileImage: Joi.string().uri().optional(),
    bio: Joi.string().max(500).optional(),
    website: Joi.string().uri().optional(),
    socialMedia: Joi.object({
      facebook: Joi.string().optional(),
      twitter: Joi.string().optional(),
      linkedin: Joi.string().optional(),
      instagram: Joi.string().optional(),
    }).optional(),
  }).min(1),

  updateSettings: Joi.object({
    emailNotifications: Joi.boolean(),
    defaultTicketingSettings: Joi.object({
      currency: Joi.string().length(3),
      ticketFeeType: Joi.string().valid("absorb", "pass"),
    }).optional(),
  }).min(1),
};

export const validate = (schemaName) => {
  return async (req, res, next) => {
    try {
      const schema = schemas[schemaName];
      if (!schema) {
        throw new Error(`Validation schema '${schemaName}' not found`);
      }

      const validatedData = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error.isJoi) {
        return res.status(400).json({
          status: "error",
          message: "Validation Error",
          details: error.details.map((detail) => ({
            field: detail.path.join("."),
            message: detail.message,
          })),
        });
      }
      next(error);
    }
  };
};

export default { validate };
