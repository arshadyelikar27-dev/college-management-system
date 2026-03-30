const Admission = require('../models/Admission');
const Course = require('../models/Course');

const applyForAdmission = async (req, res) => {
    try {
        const { courseId, personalDetails } = req.body;
        const studentId = req.user.id;

        const existing = await Admission.findOne({ studentId, courseId });
        if (existing) {
            return res.status(400).json({ message: 'Already applied for this course' });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const application = new Admission({
            studentId,
            studentName: req.user.name || personalDetails.fullName,
            courseId,
            courseName: course.name,
            personalDetails,
            status: 'Pending',
        });

        await application.save();
        res.status(201).json({ message: 'Application submitted successfully', application });
    } catch (error) {
        res.status(500).json({ message: 'Error applying for admission', error: error.message });
    }
};

const getMyAdmissions = async (req, res) => {
    try {
        const admissions = await Admission.find({ studentId: req.user.id });
        const enrichedAdmissions = await Promise.all(admissions.map(async (a) => {
            const course = await Course.findById(a.courseId);
            return { ...a.toObject(), courseFee: course ? course.fee : 0 };
        }));
        res.json(enrichedAdmissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching applications' });
    }
};

const getAllAdmissions = async (req, res) => {
    try {
        const admissions = await Admission.find();
        res.json(admissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching all applications' });
    }
};

const updateAdmissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updated = await Admission.findByIdAndUpdate(id, { status }, { new: true });
        if (!updated) return res.status(404).json({ message: 'Application not found' });

        res.json({ message: `Application ${status}`, application: updated });
    } catch (error) {
        res.status(500).json({ message: 'Error updating application status' });
    }
};

const deleteAdmission = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Admission.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Application not found' });
        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting application' });
    }
};

module.exports = { applyForAdmission, getMyAdmissions, getAllAdmissions, updateAdmissionStatus, deleteAdmission };
