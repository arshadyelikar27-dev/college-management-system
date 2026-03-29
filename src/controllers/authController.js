const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_for_demo_purposes';
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Standard configuration
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = db.findOne('users', user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            id: uuidv4(),
            name,
            email,
            password: hashedPassword,
            role: 'student', // Default role for public registration
            createdAt: new Date().toISOString()
        };

        db.create('users', newUser);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = db.findOne('users', u => u.email === email);
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            SECRET_KEY,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = db.findOne('users', u => u.email === email);
        if (!user) {
            return res.status(404).json({ message: "No account found with this email." });
        }
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // Valid for 10 minutes

        // Check if OTP record already exists for this email
        const existingOtp = db.findOne('otps', o => o.email === email);
        if (existingOtp) {
            db.update('otps', existingOtp.id, { otp, expiresAt });
        } else {
            db.create('otps', { id: uuidv4(), email, otp, expiresAt });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP - CollegeHub',
            text: `Your securely generated OTP for password reset is ${otp}. It is valid for 10 minutes. Do not share this with anyone.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: "OTP sent successfully to your email." });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: "Failed to send OTP email. Please ensure your EMAIL_USER and EMAIL_PASS environment variables are correctly configured for Nodemailer." });
    }
};

const verifyOtp = (req, res) => {
    const { email, otp } = req.body;
    const record = db.findOne('otps', o => o.email === email);
    
    if (!record) return res.status(400).json({ message: "No OTP requested currently for this email." });
    if (Date.now() > record.expiresAt) return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP submitted." });

    res.json({ message: "OTP verified. You can now securely reset your password." });
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const record = db.findOne('otps', o => o.email === email);
        
        if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
            return res.status(400).json({ message: "Invalid or expired OTP flow." });
        }

        const user = db.findOne('users', u => u.email === email);
        if(!user) return res.status(404).json({ message: "User not found." });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.update('users', user.id, { password: hashedPassword });
        
        db.remove('otps', record.id);

        res.json({ message: "Password reset completely successful!" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Server error during password reset." });
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
