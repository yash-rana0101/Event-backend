import Joi from "joi";

// Define validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().allow("", null),
    organization: Joi.string(),
  }),
  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),
  updateProfile: Joi.object({
    name: Joi.string().min(3).max(50),
    email: Joi.string().email(),
    phone: Joi.string().allow("", null),
    bio: Joi.string().allow("", null),
  }),
  event: Joi.object({
    title: Joi.string().required().max(100).messages({
      "string.empty": "Title is required",
      "string.max": "Title cannot exceed 100 characters",
    }),
    tagline: Joi.string().max(150).allow("").messages({
      "string.max": "Tagline cannot exceed 150 characters",
    }),
    description: Joi.string().required().messages({
      "string.empty": "Description is required",
    }),
    date: Joi.string().allow(""),
    startDate: Joi.date().required().messages({
      "date.base": "Start date must be a valid date",
      "any.required": "Start date is required",
    }),
    endDate: Joi.date().required().min(Joi.ref("startDate")).messages({
      "date.base": "End date must be a valid date",
      "date.min": "End date must be after start date",
      "any.required": "End date is required",
    }),
    registrationDeadline: Joi.date().allow(null, ""),
    duration: Joi.string().allow(""),
    location: Joi.object({
      address: Joi.string().required().messages({
        "string.empty": "Address is required",
      }),
      city: Joi.string().required().messages({
        "string.empty": "City is required",
      }),
      state: Joi.string().allow(""),
      country: Joi.string().required().messages({
        "string.empty": "Country is required",
      }),
      zipCode: Joi.string().allow(""),
      coordinates: Joi.object({
        lat: Joi.number().allow(null),
        lng: Joi.number().allow(null),
      }).allow(null),
    }),
    capacity: Joi.number().default(0),
    isPaid: Joi.boolean().default(false),
    price: Joi.number().default(0),
    currency: Joi.string().default("USD"),
    images: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string()),
    featured: Joi.boolean().default(false),
    category: Joi.string()
      .valid(
        "conference",
        "workshop",
        "seminar",
        "webinar",
        "hackathon",
        "meetup",
        "networking",
        "other"
      )
      .required()
      .messages({
        "any.required": "Category is required",
        "any.only": "Category must be one of the allowed values",
      }),
    status: Joi.string()
      .valid("draft", "active", "cancelled", "completed")
      .default("draft"),
    organizer: Joi.string().allow(""),
    organizerId: Joi.string().allow(""),
    timeline: Joi.array().items(
      Joi.object({
        time: Joi.string().required(),
        event: Joi.string().required(),
      })
    ),
    prizes: Joi.array().items(
      Joi.object({
        place: Joi.string().required(),
        amount: Joi.string().required(),
        description: Joi.string().allow(""),
      })
    ),
    sponsors: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        tier: Joi.string()
          .valid("platinum", "gold", "silver", "bronze", "other")
          .default("other"),
        logo: Joi.string().allow(""),
      })
    ),
    faqs: Joi.array().items(
      Joi.object({
        question: Joi.string().required(),
        answer: Joi.string().required(),
      })
    ),
    socialShare: Joi.object({
      likes: Joi.number().default(0),
      comments: Joi.number().default(0),
      shares: Joi.number().default(0),
    }).default({}),
  }),
};

// Validation middleware
export const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      return res.status(500).json({
        success: false,
        message: "Invalid validation schema",
      });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));
      console.log("Validation Error", details);
      return res.status(400).json({
        status: "error",
        message: "Validation Error",
        details,
      });
    }

    req.validatedData = value;
    next();
  };
};
