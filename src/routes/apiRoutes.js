const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const admissionController = require('../controllers/admissionController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');
const upload = require('../middleware/uploadMiddleware');
const { triggerBot } = require('../utils/aiBot');

// Mongoose Models
const User = require('../models/User');
const Course = require('../models/Course');
const Admission = require('../models/Admission');
const Payment = require('../models/Payment');
const Notice = require('../models/Notice');
const Material = require('../models/Material');
const Assignment = require('../models/Assignment');
const Attendance = require('../models/Attendance');
const Message = require('../models/Message');

// Course Routes
router.get('/courses', courseController.getAllCourses);
router.post('/courses', authenticate, isAdmin, async (req, res, next) => { 
    await courseController.createCourse(req, res, next); 
    req.app.get('socketio').emit('stats-update'); 
});
router.put('/courses/:id', authenticate, isAdmin, async (req, res, next) => { 
    await courseController.updateCourse(req, res, next); 
    req.app.get('socketio').emit('stats-update'); 
});
router.delete('/courses/:id', authenticate, isAdmin, async (req, res, next) => { 
    await courseController.deleteCourse(req, res, next); 
    req.app.get('socketio').emit('stats-update'); 
});

// Admission Routes
router.post('/admissions', authenticate, async (req, res, next) => { 
    await admissionController.applyForAdmission(req, res, next); 
    req.app.get('socketio').emit('stats-update'); 
});
router.get('/admissions/my', authenticate, admissionController.getMyAdmissions);
router.get('/admissions/all', authenticate, isAdmin, admissionController.getAllAdmissions);
router.put('/admissions/:id/status', authenticate, isAdmin, async (req, res, next) => { 
    await admissionController.updateAdmissionStatus(req, res, next); 
    req.app.get('socketio').emit('stats-update'); 
});
router.delete('/admissions/:id', authenticate, isAdmin, admissionController.deleteAdmission);

// Payment Routes
router.get('/payment/config', authenticate, paymentController.getConfig);
router.post('/payment/create-order', authenticate, paymentController.createOrder);
router.post('/payment/verify', authenticate, paymentController.verifyPayment);

// Helper functions for routes
const isStudentApproved = async (studentId) => {
    return await Admission.exists({ studentId, status: 'Approved' });
};

const getApprovedCourseIds = async (studentId) => {
    const apps = await Admission.find({ studentId, status: 'Approved' });
    return apps.map(a => a.courseId.toString());
};

// Notice Routes
router.get('/notices', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            const approved = await isStudentApproved(req.user.id);
            if (!approved) {
                return res.status(403).json({ message: 'Access denied. Your admission is not yet approved.' });
            }
        }
        const notices = await Notice.find().sort({ createdAt: -1 });
        res.json(notices);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notices' });
    }
});

router.post('/notices', authenticate, isAdmin, async (req, res) => {
    try {
        const { title, content, type } = req.body;
        const newNotice = new Notice({
            title, content,
            type: type || 'Info',
            author: req.user.name
        });
        await newNotice.save();
        req.app.get('socketio').emit('new-notice', newNotice);
        res.status(201).json(newNotice);
    } catch (error) {
        res.status(500).json({ message: 'Error creating notice' });
    }
});

router.delete('/notices/:id', authenticate, isAdmin, async (req, res) => {
    try {
        await Notice.findByIdAndDelete(req.params.id);
        req.app.get('socketio').emit('notice-deleted', req.params.id);
        res.json({ message: 'Notice deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting notice' });
    }
});

router.delete('/notices', authenticate, isAdmin, async (req, res) => {
    try {
        await Notice.deleteMany({});
        req.app.get('socketio').emit('all-notices-cleared');
        res.json({ message: 'All notices cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing notices' });
    }
});

// Materials Routes
router.get('/materials', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            const approved = await isStudentApproved(req.user.id);
            if (!approved) {
                return res.status(403).json({ message: 'Access denied. Your admission is not yet approved.' });
            }
            const approvedCourseIds = await getApprovedCourseIds(req.user.id);
            const materials = await Material.find({ courseId: { $in: approvedCourseIds } });
            return res.json(materials);
        }
        const { courseId } = req.query;
        const query = courseId ? { courseId } : {};
        const materials = await Material.find(query);
        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching materials' });
    }
});

router.post('/materials', authenticate, isAdmin, upload.single('file'), async (req, res) => {
    try {
        const { title, courseId, description } = req.body;
        if (!courseId) return res.status(400).json({ message: 'courseId is required' });
        const newMaterial = new Material({
            title, courseId, description,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
            fileName: req.file ? req.file.originalname : null,
        });
        await newMaterial.save();
        res.status(201).json(newMaterial);
    } catch (error) {
        res.status(500).json({ message: 'Error creating material' });
    }
});

router.delete('/materials/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const deleted = await Material.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Material not found' });
        res.json({ message: 'Material deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting material' });
    }
});

// Assignments Routes
router.get('/assignments/my', authenticate, async (req, res) => {
    try {
        const assignments = await Assignment.find({ studentId: req.user.id });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

router.get('/assignments/all', authenticate, isAdmin, async (req, res) => {
    try {
        const assignments = await Assignment.find();
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

router.post('/assignments', authenticate, upload.single('file'), async (req, res) => {
    try {
        const { title, description, courseId } = req.body;
        const newAssignment = new Assignment({
            studentId: req.user.id,
            studentName: req.user.name,
            title,
            description,
            courseId,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
            status: 'Submitted',
        });
        await newAssignment.save();
        res.status(201).json(newAssignment);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting assignment' });
    }
});

router.put('/assignments/:id/grade', authenticate, isAdmin, async (req, res) => {
    try {
        const { status, feedback } = req.body;
        const updated = await Assignment.findByIdAndUpdate(req.params.id, { status, feedback }, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error grading assignment' });
    }
});

router.delete('/assignments/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const deleted = await Assignment.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Assignment not found' });
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting assignment' });
    }
});

// Attendance Routes
router.get('/attendance/my', authenticate, async (req, res) => {
    try {
        const attendance = await Attendance.find({ studentId: req.user.id });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance' });
    }
});

router.post('/attendance', authenticate, isAdmin, async (req, res) => {
    try {
        const { studentId, date, status, subject } = req.body;
        const newRecord = new Attendance({
            studentId, date, status, subject
        });
        await newRecord.save();
        res.json(newRecord);
    } catch (error) {
        res.status(500).json({ message: 'Error creating attendance record' });
    }
});

// Messages Routes
router.get('/messages', authenticate, async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'admin') {
            query = { studentId: req.user.id };
        }
        const messages = await Message.find(query).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

router.post('/messages', authenticate, async (req, res) => {
    try {
        const { content, receiverId } = req.body;
        const newMessage = new Message({
            senderId: req.user.id,
            senderName: req.user.name,
            receiverId: receiverId || 'admin',
            studentId: req.user.role === 'student' ? req.user.id : receiverId,
            content,
        });
        await newMessage.save();
        req.app.get('socketio').emit('new-message', newMessage);
        if (req.user.role === 'student') {
            await triggerBot(req.user.id, req.user.name, content, req.app.get('socketio'));
        }
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message' });
    }
});

// Stats Routes
router.get('/stats/public', async (req, res) => {
    try {
        const students = await User.countDocuments({ role: 'student' });
        const courses = await Course.countDocuments();
        const notices = await Notice.countDocuments();
        const materials = await Material.countDocuments();
        res.json({ students, courses, notices, materials });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching public stats' });
    }
});

router.get('/stats', authenticate, isAdmin, async (req, res) => {
    try {
        const students = await User.countDocuments({ role: 'student' });
        const courses = await Course.countDocuments();
        const admissions = await Admission.countDocuments({ status: 'Pending' });
        const notices = await Notice.countDocuments();
        const feePayments = await Payment.find({ status: 'success' });
        const revenue = feePayments.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
        res.json({ students, courses, admissions, notices, revenue });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

router.get('/admissions/approved-by-course', authenticate, isAdmin, async (req, res) => {
    try {
        const approved = await Admission.find({ status: 'Approved' });
        const result = {};
        approved.forEach(a => {
            if (!result[a.courseId]) result[a.courseId] = [];
            result[a.courseId].push(a.studentId);
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admissions by course' });
    }
});

router.get('/users/students', authenticate, isAdmin, async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
    }
});

router.put('/users/profile', authenticate, async (req, res) => {
    try {
        const { phone, bloodGroup, address, avatar, enrollNumber } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.phone = phone || user.phone;
        user.bloodGroup = bloodGroup || user.bloodGroup;
        user.address = address || user.address;
        user.avatar = avatar || user.avatar;
        if (enrollNumber && !user.enrollNumber) {
            user.enrollNumber = enrollNumber;
        } else if (!user.enrollNumber) {
            user.enrollNumber = `ENR${Math.floor(Math.random() * 90000) + 10000}`;
        }
        
        await user.save();
        const safeUser = user.toObject();
        delete safeUser.password;
        res.json({ message: 'Profile updated successfully', user: safeUser });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile' });
    }
});

router.get('/users/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user' });
    }
});

router.delete('/users/students/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await User.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'User not found' });
        
        // Cascade delete related data
        await Admission.deleteMany({ studentId: id });
        await Assignment.deleteMany({ studentId: id });
        await Attendance.deleteMany({ studentId: id });
        await Message.deleteMany({ studentId: id });
        
        res.json({ message: 'Student and related data deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting student' });
    }
});

module.exports = router;
