require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const db = require('./models/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Export IO for use in routes
app.set('socketio', io);

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve Static Files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
    setHeaders: (res, path) => {
        res.setHeader('Content-Disposition', 'attachment');
    }
}));

// Seed Admin User
const seedAdmin = async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'arshadyelikar5@gmail.com';
    const adminPass = process.env.ADMIN_PASS || 'Arshu@27';

    const existingAdmin = db.findOne('users', u => u.role === 'admin');
    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPass, 10);
        const adminUser = {
            id: uuidv4(),
            name: 'System Administrator',
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date().toISOString()
        };
        db.create('users', adminUser);
        console.log(`Admin user seeded: ${adminEmail}`);
    } else if (existingAdmin.email !== adminEmail) {
        // Update admin info if it changed in env
        const hashedPassword = await bcrypt.hash(adminPass, 10);
        db.update('users', existingAdmin.id, { email: adminEmail, password: hashedPassword });
        console.log(`Admin user updated to: ${adminEmail}`);
    }
};
seedAdmin();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

