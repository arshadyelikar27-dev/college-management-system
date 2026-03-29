const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');

const applyForAdmission = (req, res) => {
    const { courseId, personalDetails } = req.body;
    const studentId = req.user.id;

    // Optional: Check if already applied for this course
    const existing = db.findOne('admissions', a => a.studentId === studentId && a.courseId === courseId);
    if (existing) {
        return res.status(400).json({ message: 'Already applied for this course' });
    }

    const course = db.findOne('courses', c => c.id === courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const application = {
        id: uuidv4(),
        studentId,
        studentName: req.user.name || personalDetails.fullName, // simplified
        courseId,
        courseName: course.name,
        personalDetails,
        status: 'Pending',
        appliedAt: new Date().toISOString()
    };

    db.create('admissions', application);
    res.status(201).json({ message: 'Application submitted successfully', application });
};

const getMyAdmissions = (req, res) => {
    const admissions = db.find('admissions', a => a.studentId === req.user.id);
    const enrichedAdmissions = admissions.map(a => {
        const course = db.findOne('courses', c => c.id === a.courseId);
        return { ...a, courseFee: course ? course.fee : 0 };
    });
    res.json(enrichedAdmissions);
};

const getAllAdmissions = (req, res) => {
    const admissions = db.read('admissions');
    res.json(admissions);
};

const updateAdmissionStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Approved, Rejected

    const updated = db.update('admissions', id, { status });
    if (!updated) return res.status(404).json({ message: 'Application not found' });
    
    // If approved, maybe create a "Student Record" or link to fees.
    
    res.json({ message: `Application ${status}`, application: updated });
};

const deleteAdmission = (req, res) => {
    const { id } = req.params;
    const deleted = db.remove('admissions', id);
    if (!deleted) return res.status(404).json({ message: 'Application not found' });
    res.json({ message: 'Application deleted successfully' });
};

module.exports = { applyForAdmission, getMyAdmissions, getAllAdmissions, updateAdmissionStatus, deleteAdmission };
