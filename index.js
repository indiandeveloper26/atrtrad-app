// // index.js
// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');
// const path = require('path');

// // Import your bot logic
// const { initializeBot, activeTrades, USER_CHAT_IDS } = require('./botLogic');

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server); // Initialize Socket.IO with the server

// const PORT = process.env.PORT || 3000;

// // Serve static files from the 'public' directory
// app.use(express.static(path.join(__dirname, 'public')));

// // Basic route for the home page
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// // Socket.IO connection handling
// io.on('connection', (socket) => {
//     console.log('A user connected to the web interface');

//     // Send initial active trades and user status to the newly connected client
//     socket.emit('initial_data', {
//         activeTrades: activeTrades, // activeTrades will hold all users' trades
//         userIds: USER_CHAT_IDS // Send user IDs as well
//     });

//     socket.on('disconnect', () => {
//         console.log('User disconnected from the web interface');
//     });

//     // You can add more socket.on events here for client-to-server communication if needed
//     // Example: socket.on('request_trade_history', () => { /* send historical data */ });
// });

// // Initialize the bot logic and pass the Socket.IO instance
// initializeBot(io);

// // Start the server
// server.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
//     console.log(`Bot is also active and listening for Telegram messages.`);
// });








// index.js (No changes from previous response)
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Import your bot logic
const { initializeBot, activeTrades } = require('./botLogic'); // Removed USER_CHAT_IDS

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('A user connected to the web interface');

    // Send initial active trades to the newly connected client
    socket.emit('initial_data', {
        activeTrades: activeTrades // activeTrades now holds trades directly
    });

    socket.on('disconnect', () => {
        console.log('User disconnected from the web interface');
    });
});

initializeBot(io); // Initialize the bot logic and pass the Socket.IO instance

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});