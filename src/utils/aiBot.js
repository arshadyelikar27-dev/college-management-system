const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');

const KNOWLEDGE_BASE = [
    {
        keywords: ['hi', 'hello', 'hey', 'start'],
        response: "Hello! I am the CollegeHub AI Assistant. How can I help you today? You can ask me about courses, fees, admissions, or your study materials."
    },
    {
        keywords: ['fee', 'payment', 'pay', 'tuition', 'cost'],
        response: "You can manage your payments in the 'My Applications' section. Once an application is approved, a 'Pay Fee' button will appear. We accept all major digital payment methods."
    },
    {
        keywords: ['course', 'degree', 'program', 'admission', 'apply'],
        response: "To apply for a new program, head over to the 'Browse Courses' section. You can see all available academic tracks and submit your application along with your academic marks."
    },
    {
        keywords: ['study', 'material', 'lms', 'notes', 'pdf', 'book'],
        response: "Your study materials are located in the 'Study Center'. You can download PDFs, notes, and other assets uploaded by the faculty directly to your device."
    },
    {
        keywords: ['notice', 'announcement', 'update', 'news'],
        response: "Check the 'Notice Board' for the latest official updates from the college. Urgent notices are highlighted in red for your attention."
    },
    {
        keywords: ['id', 'card', 'profile', 'avatar'],
        response: "Your Digital ID Card is available in the 'My Profile' section. It contains your verified student details and is valid until 2028."
    },
    {
        keywords: ['assignment', 'submit', 'homework'],
        response: "You can submit assignments through the Study Center. Simply enter the title and attach your file (PDF/IMG/DOC) for faculty review."
    },
    {
        keywords: ['help', 'support', 'contact', 'solution', 'query', 'problem', 'working'],
        response: "I'm here to help! If you have a problem or need a solution, please describe it clearly. Our human support team has also been alerted and will assist you if I can't solve it immediately."
    }
];

const generateBotResponse = (message) => {
    const input = message.toLowerCase();
    
    for (const entry of KNOWLEDGE_BASE) {
        if (entry.keywords.some(kw => input.toLowerCase().includes(kw.toLowerCase()))) {
            return entry.response;
        }
    }
    
    return "I'm not sure I understand that specifically. Our human support team has been notified and will get back to you soon. In the meantime, you can check the Help Desk or browse the sections for more info.";
};

const triggerBot = (studentId, studentName, userMessage, io) => {
    setTimeout(() => {
        const botResponse = generateBotResponse(userMessage);
        const botMessage = {
            id: uuidv4(),
            senderId: 'ai-bot',
            senderName: 'CollegeHub Bot',
            receiverId: studentId,
            studentId: studentId,
            content: botResponse,
            timestamp: new Date().toISOString()
        };
        
        db.create('messages', botMessage);
        console.log(`🤖 Bot Responding to ${studentId}: ${botResponse}`);
        io.emit('new-message', botMessage);
    }, 1000); // 1 second delay for "typing" effect
};

module.exports = { triggerBot };
