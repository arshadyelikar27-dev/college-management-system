const { triggerBot } = require('./src/utils/aiBot');
const db = require('./src/models/db');

const mockIo = {
    emit: (event, data) => {
        console.log(`[EVENT: ${event}]`, data);
    }
};

console.log('Testing AI Bot trigger...');
triggerBot('test-id', 'Test User', 'What are the fees?', mockIo);

setTimeout(() => {
    const messages = db.read('messages');
    const lastMsg = messages[messages.length - 1];
    console.log('Last message in DB:', lastMsg);
}, 2000);
