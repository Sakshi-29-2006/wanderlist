
const mongoose = require("mongoose");

const destinationSchema = new mongoose.Schema({

    destinationName: {
        type: String,
        required: [true, "Destination name is required"],
        trim: true,
        minlength: [2, "Destination name must contain at least 2 characters"]
    },

    country: {
        type: String,
        required: [true, "Country name is required"],
        trim: true
    },

    category: {
        type: String,
        required: [true, "Category is required"],
        enum: ["Beach", "Mountain", "City", "Adventure", "Nature", "Historical", "Other"]
    },

    description: {
        type: String,
        required: [true, "Description is required"],
        trim: true
    },

    estimatedBudget: {
        type: Number,
        required: [true, "Estimated budget is required"],
        min: [0, "Budget cannot be negative"]
    },

    travelDate: {
        type: Date
    },

    status: {
        type: String,
        enum: ["Wishlist", "Planned", "Visited"],
        default: "Wishlist"
    },

    imageUrl: {
        type: String,
        trim: true,
        default: ""
    }

}, { timestamps: true });

const Destination = mongoose.model("Destination", destinationSchema);

module.exports = Destination;
