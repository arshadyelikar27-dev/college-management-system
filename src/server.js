require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', limiter);

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

app.set('socketio', io);

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
    setHeaders: (res, path) => {
        res.setHeader('Content-Disposition', 'attachment');
    }
}));

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
        
    } else if (existingAdmin.email !== adminEmail) {

        const hashedPassword = await bcrypt.hash(adminPass, 10);
        db.update('users', existingAdmin.id, { email: adminEmail, password: hashedPassword });
        
    }
};
seedAdmin();

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

io.on('connection', (socket) => {
    
    
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        
    });

    socket.on('disconnect', () => {
        
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

