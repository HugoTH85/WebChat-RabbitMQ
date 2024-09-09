const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// Stockage des noms des utilisateurs connectés
const connectedUsers = new Set();

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected');

    // Lorsque l'utilisateur envoie son nom d'utilisateur
    socket.on('setUsername', (username, callback) => {
        if (connectedUsers.has(username)) {
            callback({ success: false, message: 'Username is already taken' });
        } else {
            connectedUsers.add(username);
            socket.username = username;
            callback({ success: true, message: 'Username set successfully' });
            io.emit('updateUserList', Array.from(connectedUsers)); // Met à jour la liste des utilisateurs pour tous les clients
        }
    });

    // Lorsque l'utilisateur envoie un message
    socket.on('sendMessage', (message) => {
        io.emit('receiveMessage', { user: socket.username, message });
    });

    // Lorsque l'utilisateur se déconnecte
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        if (socket.username) {
            connectedUsers.delete(socket.username);
            io.emit('updateUserList', Array.from(connectedUsers)); // Met à jour la liste des utilisateurs pour tous les clients
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
