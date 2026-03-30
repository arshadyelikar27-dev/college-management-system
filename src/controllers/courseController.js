const Course = require('../models/Course');

const getAllCourses = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        let query = {};
        if (search) {
            query = { $text: { $search: search } };
        }
        const courses = await Course.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Course.countDocuments(query);
        res.json({
            courses,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching courses', error: error.message });
    }
};

const createCourse = async (req, res) => {
    try {
        const { name, code, description, duration, fee } = req.body;
        const newCourse = new Course({
            name,
            code,
            description,
            duration,
            fee: Number(fee)
        });
        await newCourse.save();
        res.status(201).json({ message: 'Course created successfully', course: newCourse });
    } catch (error) {
        res.status(500).json({ message: 'Error creating course', error: error.message });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updatedCourse = await Course.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedCourse) return res.status(404).json({ message: 'Course not found' });
        res.json({ message: 'Course updated', course: updatedCourse });
    } catch (error) {
        res.status(500).json({ message: 'Error updating course' });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Course.findByIdAndDelete(id);
        if (!success) return res.status(404).json({ message: 'Course not found' });
        res.json({ message: 'Course deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting course' });
    }
};

module.exports = { getAllCourses, createCourse, updateCourse, deleteCourse };
