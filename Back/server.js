const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Créez une instance d'application Express
const app = express();
// Créez un serveur HTTP en utilisant Express
const server = http.createServer(app);
// Créez une instance de Socket.IO en attachant le serveur HTTP
const io = socketIo(server);

// Port sur lequel le serveur écoute
const PORT = 3000;

// Stockage des noms des utilisateurs connectés
const connectedUsers = new Set();

// Servir les fichiers statiques depuis le répertoire 'public'
app.use(express.static('public'));

// Gestion des connexions des clients Socket.IO
io.on('connection', (socket) => {
    console.log('A user connected');

    // Lorsque l'utilisateur envoie son nom d'utilisateur
    socket.on('setUsername', (username, callback) => {
        // Vérifiez si le nom d'utilisateur est déjà pris
        if (connectedUsers.has(username)) {
            callback({ success: false, message: 'Username is already taken' });
        } else {
            // Ajoutez l'utilisateur à la liste des utilisateurs connectés
            connectedUsers.add(username);
            socket.username = username; // Stockez le nom d'utilisateur dans la connexion Socket.IO
            callback({ success: true, message: 'Username set successfully' });
            // Envoyez la liste mise à jour des utilisateurs à tous les clients
            io.emit('updateUserList', Array.from(connectedUsers));
        }
    });

    // Lorsque l'utilisateur envoie un message
    socket.on('sendMessage', (message) => {
        // Diffusez le message à tous les clients
        io.emit('receiveMessage', { user: socket.username, message });
    });

    // Lorsque l'utilisateur se déconnecte
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        if (socket.username) {
            // Retirez l'utilisateur de la liste des utilisateurs connectés
            connectedUsers.delete(socket.username);
            // Envoyez la liste mise à jour des utilisateurs à tous les clients
            io.emit('updateUserList', Array.from(connectedUsers));
        }
    });
});

// Démarrez le serveur HTTP
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
