const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const admissionController = require('../controllers/admissionController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');
const upload = require('../middleware/uploadMiddleware');
const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');

// AI Bot Logic (Inlined for reliability)
const KNOWLEDGE_BASE = [
    { kw: ['hi', 'hello', 'hey'], res: "Hello! I am the CollegeHub AI Bot. Ask me about courses, fees, materials, or your ID card!" },
    { kw: ['fee', 'pay', 'money', 'cost'], res: "Fees can be paid in 'My Applications' once approved. We support all digital payments." },
    { kw: ['course', 'degree', 'program', 'admission'], res: "View and apply for degrees in the 'Browse Courses' section." },
    { kw: ['study', 'material', 'notes', 'pdf'], res: "Download your notes and PDFs from the 'Study Center' section." },
    { kw: ['notice', 'update', 'news'], res: "Check the 'Notice Board' for official announcements." },
    { kw: ['id', 'card', 'profile'], res: "Your Digital ID is in the 'My Profile' section." },
    { kw: ['help', 'query', 'problem', 'solution'], res: "I'm here to help! Describe your issue or check our specialized sections." }
];

const botReply = (studentId, text, io) => {
    setTimeout(() => {
        const input = text.toLowerCase();
        let response = "I understand you need help. Feel free to ask about fees, courses, or study materials. Our team will also see this message and reply soon.";
        for (const item of KNOWLEDGE_BASE) {
            if (item.kw.some(k => input.includes(k))) { response = item.res; break; }
        }
        const botMsg = {
            id: uuidv4(),
            senderId: 'ai-bot',
            senderName: 'Assistant Bot',
            receiverId: studentId,
            studentId: studentId,
            content: response,
            timestamp: new Date().toISOString()
        };
        db.create('messages', botMsg);
        io.emit('new-message', botMsg);
    }, 1000);
};

// Courses
router.get('/courses', courseController.getAllCourses);
router.post('/courses', authenticate, isAdmin, courseController.createCourse);
router.put('/courses/:id', authenticate, isAdmin, courseController.updateCourse);
router.delete('/courses/:id', authenticate, isAdmin, courseController.deleteCourse);

// Admissions
router.post('/admissions', authenticate, admissionController.applyForAdmission);
router.get('/admissions/my', authenticate, admissionController.getMyAdmissions);
router.get('/admissions/all', authenticate, isAdmin, admissionController.getAllAdmissions);
router.put('/admissions/:id/status', authenticate, isAdmin, admissionController.updateAdmissionStatus);
router.delete('/admissions/:id', authenticate, isAdmin, admissionController.deleteAdmission);

// Payment
router.get('/payment/config', authenticate, paymentController.getConfig);
router.post('/payment/create-order', authenticate, paymentController.createOrder);
router.post('/payment/verify', authenticate, paymentController.verifyPayment);

// --- Advanced Features ---

// Notices
router.get('/notices', authenticate, (req, res) => {
    const notices = db.read('notices');
    res.json(notices.reverse());
});

router.post('/notices', authenticate, isAdmin, (req, res) => {
    const { title, content, type } = req.body;
    const newNotice = {
        id: uuidv4(),
        title,
        content,
        type: type || 'Info',
        date: new Date().toISOString(),
        author: req.user.name
    };
    db.create('notices', newNotice);
    
    // Real-time broadcast
    req.app.get('socketio').emit('new-notice', newNotice);
    
    res.status(201).json(newNotice);
});

router.delete('/notices/:id', authenticate, isAdmin, (req, res) => {
    db.remove('notices', req.params.id);
    req.app.get('socketio').emit('notice-deleted', req.params.id);
    res.json({ message: 'Notice deleted' });
});

router.delete('/notices', authenticate, isAdmin, (req, res) => {
    db.write('notices', []);
    req.app.get('socketio').emit('all-notices-cleared');
    res.json({ message: 'All notices cleared' });
});

// Study Materials
router.get('/materials', authenticate, (req, res) => {
    res.json(db.read('materials'));
});

router.post('/materials', authenticate, isAdmin, upload.single('file'), (req, res) => {
    const { title, courseId, description } = req.body;
    const newMaterial = {
        id: uuidv4(),
        title,
        courseId,
        description,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
        fileName: req.file ? req.file.originalname : null,
        date: new Date().toISOString()
    };
    db.create('materials', newMaterial);
    res.status(201).json(newMaterial);
});

// Assignments
router.get('/assignments/my', authenticate, (req, res) => {
    const assignments = db.find('assignments', a => a.studentId === req.user.id);
    res.json(assignments);
});

router.get('/assignments/all', authenticate, isAdmin, (req, res) => {
    res.json(db.read('assignments'));
});

router.post('/assignments', authenticate, upload.single('file'), (req, res) => {
    console.log('Assignment upload request received:', { title: req.body.title, file: req.file ? req.file.filename : 'none' });
    const { title, description, courseId } = req.body;
    const newAssignment = {
        id: uuidv4(),
        studentId: req.user.id,
        studentName: req.user.name,
        title,
        description,
        courseId,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
        status: 'Submitted',
        submittedAt: new Date().toISOString(),
        feedback: ''
    };
    db.create('assignments', newAssignment);
    res.status(201).json(newAssignment);
});

router.put('/assignments/:id/grade', authenticate, isAdmin, (req, res) => {
    const { status, feedback } = req.body;
    const updated = db.update('assignments', req.params.id, { status, feedback });
    res.json(updated);
});

router.delete('/assignments/:id', authenticate, isAdmin, (req, res) => {
    const { id } = req.params;
    const success = db.remove('assignments', id);
    if (!success) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Assignment deleted successfully' });
});

// Attendance
router.get('/attendance/my', authenticate, (req, res) => {
    const attendance = db.find('attendance', a => a.studentId === req.user.id);
    res.json(attendance);
});

router.post('/attendance', authenticate, isAdmin, (req, res) => {
    const { studentId, date, status, subject } = req.body;
    const newRecord = {
        id: uuidv4(),
        studentId,
        date,
        status, // Present, Absent
        subject
    };
    db.create('attendance', newRecord);
    res.json(newRecord);
});

// Messaging / Help Desk
router.get('/messages', authenticate, (req, res) => {
    const messages = db.read('messages');
    if (req.user.role === 'admin') {
        res.json(messages);
    } else {
        res.json(messages.filter(m => m.studentId === req.user.id));
    }
});

router.post('/messages', authenticate, (req, res) => {
    const { content, receiverId } = req.body;
    const newMessage = {
        id: uuidv4(),
        senderId: req.user.id,
        senderName: req.user.name,
        receiverId: receiverId || 'admin',
        studentId: req.user.role === 'student' ? req.user.id : receiverId,
        content,
        timestamp: new Date().toISOString()
    };
    db.create('messages', newMessage);
    
    // Real-time broadcast
    req.app.get('socketio').emit('new-message', newMessage);

    // AI Bot Integration
    if (req.user.role === 'student') {
        botReply(req.user.id, content, req.app.get('socketio'));
    }
    
    res.status(201).json(newMessage);
});

// Stats
router.get('/stats', authenticate, isAdmin, (req, res) => {
    const students = db.read('users').filter(u => u.role === 'student').length;
    const courses = db.read('courses').length;
    const admissions = db.read('admissions').filter(a => a.status === 'Pending').length;
    const notices = db.read('notices').length;
    res.json({ students, courses, admissions, notices });
});

router.get('/users/students', authenticate, isAdmin, (req, res) => {
    const students = db.read('users')
        .filter(u => u.role === 'student')
        .map(({ password, ...user }) => user);
    res.json(students);
});

router.put('/users/profile', authenticate, (req, res) => {
    const { phone, bloodGroup, address, avatar, enrollNumber } = req.body;
    const userToUpdate = db.read('users').find(u => u.id === req.user.id);
    if (!userToUpdate) return res.status(404).json({ message: 'User not found' });
    
    const updatedUser = {
        ...userToUpdate,
        phone: phone || userToUpdate.phone,
        bloodGroup: bloodGroup || userToUpdate.bloodGroup,
        address: address || userToUpdate.address,
        avatar: avatar || userToUpdate.avatar,
        enrollNumber: enrollNumber || userToUpdate.enrollNumber || `ENR${Math.floor(Math.random() * 90000) + 10000}`
    };
    
    db.update('users', req.user.id, updatedUser);
    
    const { password, ...safeUser } = updatedUser;
    res.json({ message: 'Profile updated successfully', user: safeUser });
});

router.get('/users/me', authenticate, (req, res) => {
    const user = db.read('users').find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, ...safeUser } = user;
    res.json(safeUser);
});

router.delete('/users/students/:id', authenticate, isAdmin, (req, res) => {
    const { id } = req.params;
    const deleted = db.remove('users', id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    
    // Cleanup
    db.write('admissions', db.read('admissions').filter(a => a.studentId !== id));
    db.write('assignments', db.read('assignments').filter(a => a.studentId !== id));
    db.write('attendance', db.read('attendance').filter(a => a.studentId !== id));
    
    res.json({ message: 'Student and related data deleted successfully' });
});

module.exports = router;

