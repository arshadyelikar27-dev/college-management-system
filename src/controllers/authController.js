const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_demo_purposes';
const RESET_SECRET = process.env.JWT_RESET_SECRET || 'another_secret_for_resets';

const otpStore = new Map();

const hashOtp = async (otp) => await bcrypt.hash(otp, 10);

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendSms = async (mobile, otp) => {
    try {
        const url = 'https://api.msg91.com/api/v5/otp';
        await axios.get(url, {
            params: {
                authkey: process.env.MSG91_AUTH_KEY,
                template_id: process.env.MSG91_TEMPLATE_ID,
                mobile: mobile,
                otp: otp
            }
        });
    } catch (error) {
        console.error('MSG91 Error:', error.message);
    }
};

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = db.findOne('users', user => user.email === email);
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: uuidv4(), name, email, password: hashedPassword, role: 'student', createdAt: new Date().toISOString() };
        db.create('users', newUser);
        req.app.get('socketio').emit('stats-update');
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.findOne('users', u => u.email === email);
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, SECRET_KEY, { expiresIn: '1d' });
        res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body; 
        const identifier = email.trim();
        

        const user = db.findOne('users', u => u.email === identifier || u.phone === identifier);
        
        if (user) {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpHash = await hashOtp(otpCode);
            const expiresAt = Date.now() + (parseInt(process.env.OTP_EXPIRY_MINS) || 5) * 60 * 1000;

            otpStore.set(identifier, {
                otpHash,
                expiresAt,
                attempts: 0
            });

            if (identifier.includes('@')) {

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: identifier,
                    subject: 'Reset Password Code - CollegeHub',
                    text: `Your security code is: ${otpCode}. It expires in 5 minutes.`
                };
                transporter.sendMail(mailOptions).catch(err => console.error('Email Fail:', err.message));
            } else {

                if(/^\d+$/.test(identifier)) {
                    sendSms(identifier, otpCode);
                }
            }
            
        }

        res.json({ message: "If account exists, an OTP has been sent." });
    } catch (error) {
        console.error('Forgot PW Error:', error.message);
        res.status(500).json({ message: "An error occurred." });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const identifier = email.trim();
        const record = otpStore.get(identifier);

        if (!record) return res.status(400).json({ message: "No OTP session found for this user." });
        if (Date.now() > record.expiresAt) {
            otpStore.delete(identifier);
            return res.status(400).json({ message: "OTP has expired." });
        }
        if (record.attempts >= (parseInt(process.env.MAX_OTP_ATTEMPTS) || 5)) {
            otpStore.delete(identifier);
            return res.status(403).json({ message: "Too many failed attempts. Support locked." });
        }

        const isMatch = await bcrypt.compare(otp, record.otpHash);
        if (!isMatch) {
            record.attempts += 1;
            return res.status(400).json({ message: "Invalid OTP code." });
        }

        const resetToken = jwt.sign({ identifier }, RESET_SECRET, { expiresIn: '15m' });
        otpStore.delete(identifier);

        res.json({ message: "OTP verified correctly.", resetToken });
    } catch (error) {
        res.status(500).json({ message: "Verification failed." });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        
        if (!resetToken) return res.status(400).json({ message: "Reset token is required." });

        const decoded = jwt.verify(resetToken, RESET_SECRET);
        const identifier = decoded.identifier;

        const user = db.findOne('users', u => u.email === identifier || u.phone === identifier);
        if (!user) return res.status(404).json({ message: "Account not recovered." });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.update('users', user.id, { password: hashedPassword });

        res.json({ message: "Password updated successfully! You can login now." });
    } catch (error) {
        res.status(401).json({ message: "Verification session expired or invalid." });
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    verifyOtp,
    resetPassword,
    SECRET_KEY
};

