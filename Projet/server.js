const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const amqp = require('amqplib');  // Pour RabbitMQ
const multer = require('multer');  // Pour l'upload des fichiers
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;
const RABBITMQ_URL = 'amqp://rabbitmq';  // L'URL de RabbitMQ dans Docker

// Stocker les utilisateurs connectés et leurs couleurs
let users = {};

// Configurer multer pour l'upload des fichiers avec le nom original
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');  // Dossier où stocker les fichiers uploadés
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);  // Conserver le nom d'origine du fichier
    }
});
const upload = multer({ storage: storage });

// Gérer les fichiers statiques
app.use(express.static('public'));

// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fonction pour formater l'heure en [HH:mm]
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0'); // Format 24 heures
    const minutes = String(date.getMinutes()).padStart(2, '0'); // Ajouter 0 devant les minutes si nécessaire
    return `[${hours}:${minutes}]`;
}

// Fonction pour générer une couleur unique basée sur le nom d'utilisateur
function getUserColor(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

// Gérer l'upload des fichiers
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Aucun fichier envoyé.');
    }

    // Après que le fichier a été uploadé avec succès, notifier tous les utilisateurs
    io.emit('fileReceived', req.file.originalname);  // Utiliser le nom original du fichier
    res.status(200).send('Fichier téléchargé avec succès.');
});

// Fonction pour se connecter à RabbitMQ pour un utilisateur
async function connectToRabbitMQ(username) {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue('chat_queue', { durable: true });
        console.log(`${username} est connecté à RabbitMQ`);

        return { connection, channel };
    } catch (error) {
        console.error('Erreur lors de la connexion à RabbitMQ:', error);
    }
}

// Fonction principale de Socket.IO
io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté');

    socket.on('setUsername', async (username, callback) => {
        if (users[username]) {
            callback({ success: false, message: 'Nom déjà pris' });
        } else {
            const userColor = getUserColor(username);  // Générer une couleur unique pour l'utilisateur
            users[username] = { socketId: socket.id, color: userColor };
            socket.username = username;

            // Connexion à RabbitMQ pour cet utilisateur
            const { connection, channel } = await connectToRabbitMQ(username);
            users[username].connection = connection;
            users[username].channel = channel;

            callback({ success: true, color: userColor });  // Envoyer la couleur de l'utilisateur au client
            io.emit('updateUserList', Object.keys(users));
        }
    });

    // Gérer la réception des messages
    socket.on('sendMessage', async (message) => {
        const timestamp = formatTime(new Date());  // Format 24 heures
        const userColor = users[socket.username].color;  // Récupérer la couleur de l'utilisateur
        const fullMessage = { user: socket.username, message, time: timestamp, color: userColor };
        if (users[socket.username] && users[socket.username].channel) {
            await users[socket.username].channel.sendToQueue('chat_queue', Buffer.from(JSON.stringify(fullMessage)));
        }
        io.emit('receiveMessage', fullMessage);
    });

    // Gérer la déconnexion manuelle
    socket.on('disconnectUser', () => {
        if (socket.username) {
            const user = users[socket.username];
            if (user && user.connection) {
                user.connection.close();  // Fermer la connexion RabbitMQ de l'utilisateur
                console.log(`${socket.username} s'est déconnecté de RabbitMQ`);
            }
            delete users[socket.username];
            io.emit('updateUserList', Object.keys(users));
        }
    });

    // Gérer la déconnexion à la fermeture de la fenêtre
    socket.on('disconnect', () => {
        if (socket.username) {
            const user = users[socket.username];
            if (user && user.connection) {
                user.connection.close();  // Fermer la connexion RabbitMQ de l'utilisateur
                console.log(`${socket.username} s'est déconnecté de RabbitMQ`);
            }
            delete users[socket.username];
            io.emit('updateUserList', Object.keys(users));
        }
    });
});

// Démarrer le serveur
server.listen(PORT, () => {
    console.log(`Le serveur est démarré sur le port ${PORT}`);
});
