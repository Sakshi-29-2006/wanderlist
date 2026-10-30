
const express = require("express");
const router = express.Router();

const Destination = require("../models/Destination");

// CREATE - Add a new destination
router.post("/", async (req, res) => {
    try {
        const destination = new Destination(req.body);

        const savedDestination = await destination.save();

        res.status(201).json({
            message: "Destination added successfully!",
            destination: savedDestination
        });

    } catch (error) {
        res.status(400).json({
            message: "Failed to add destination",
            error: error.message
        });
    }
});

// READ - Get all destinations
router.get("/", async (req, res) => {
    try {
        const destinations = await Destination.find().sort({ createdAt: -1 });

        res.status(200).json({
            count: destinations.length,
            destinations
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve destinations",
            error: error.message
        });
    }
});

// READ - Get a single destination by ID
router.get("/:id", async (req, res) => {
    try {
        const destination = await Destination.findById(req.params.id);

        if (!destination) {
            return res.status(404).json({
                message: "Destination not found"
            });
        }

        res.status(200).json(destination);

    } catch (error) {
        res.status(400).json({
            message: "Invalid destination ID",
            error: error.message
        });
    }
});

// UPDATE - Update a destination
router.put("/:id", async (req, res) => {
    try {
        const updatedDestination = await Destination.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedDestination) {
            return res.status(404).json({
                message: "Destination not found"
            });
        }

        res.status(200).json({
            message: "Destination updated successfully!",
            destination: updatedDestination
        });

    } catch (error) {
        res.status(400).json({
            message: "Failed to update destination",
            error: error.message
        });
    }
});

// DELETE - Delete a destination
router.delete("/:id", async (req, res) => {
    try {
        const deletedDestination = await Destination.findByIdAndDelete(
            req.params.id
        );

        if (!deletedDestination) {
            return res.status(404).json({
                message: "Destination not found"
            });
        }

        res.status(200).json({
            message: "Destination deleted successfully!"
        });

    } catch (error) {
        res.status(400).json({
            message: "Invalid destination ID",
            error: error.message
        });
    }
});

module.exports = router;
