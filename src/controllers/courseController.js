const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');

const getAllCourses = (req, res) => {
    const courses = db.read('courses');
    res.json(courses);
};

const createCourse = (req, res) => {
    const { name, code, description, duration, fee } = req.body;
    const newCourse = {
        id: uuidv4(),
        name,
        code,
        description,
        duration,
        fee: Number(fee)
    };
    db.create('courses', newCourse);
    res.status(201).json({ message: 'Course created successfully', course: newCourse });
};

const updateCourse = (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const updatedCourse = db.update('courses', id, updates);
    if (!updatedCourse) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course updated', course: updatedCourse });
};

const deleteCourse = (req, res) => {
    const { id } = req.params;
    const success = db.remove('courses', id);
    if (!success) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted' });
};

module.exports = { getAllCourses, createCourse, updateCourse, deleteCourse };
