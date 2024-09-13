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

let topics = [];

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
async function connectToRabbitMQ(username, topic) {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(`chat_queue_${topic}`, { durable: true });
        console.log(`${username} est connecté à RabbitMQ sur le topic ${topic}`);

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
            const userColor = getUserColor(username);
            users[username] = { socketId: socket.id, color: userColor };
            socket.username = username;
    
            const { connection, channel } = await connectToRabbitMQ(username);
            users[username].connection = connection;
            users[username].channel = channel;
    
            // Si aucun topic par défaut n'existe, on en crée un
            if (!topics.includes('Général')) {
                topics.push('Général');
            }
    
            callback({ success: true, color: userColor });
            io.emit('updateUserList', Object.keys(users));
            socket.emit('updateTopicList', topics);
    
            // Rejoindre automatiquement le topic "Général"
            socket.join('Général');
            socket.currentTopic = 'Général';
            socket.emit('receiveMessage', { user: 'Serveur', message: `Vous avez rejoint le topic Général` });
        }
    });

    socket.on('createTopic', (topicTitle) => {
        if (topicTitle && !topics.includes(topicTitle)) {
            topics.push(topicTitle);  // Ajouter le topic au tableau
            io.emit('updateTopicList', topics);  // Notifier tous les utilisateurs
        }
    });

    socket.on('joinTopic', (topicTitle, callback) => {
        if (topicTitle && topics.includes(topicTitle)) {
            if (socket.currentTopic) {
                socket.leave(socket.currentTopic);
                socket.emit('receiveMessage', { user: 'Serveur', message: `Vous avez quitté le topic ${socket.currentTopic}` });
            }

            // Rejoindre le nouveau topic et mettre à jour l'URL côté client
            socket.join(topicTitle);
            socket.currentTopic = topicTitle;
            callback({ success: true, topic: topicTitle });
            socket.emit('receiveMessage', { user: 'Serveur', message: `Vous avez rejoint le topic ${topicTitle}` });
        } 
    });



    // Gérer la réception des messages
    socket.on('sendMessage', async (message) => {
        const fullMessage = { user: socket.username, message, color: users[socket.username].color };
        const topic = socket.currentTopic || 'Général';
    
        if (users[socket.username] && users[socket.username].channel) {
            // Envoyer le message à la file du topic
            await users[socket.username].channel.sendToQueue(`chat_queue_${topic}`, Buffer.from(JSON.stringify(fullMessage)));
        }
        // Envoyer le message aux utilisateurs du même topic
        io.to(topic).emit('receiveMessage', fullMessage);
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
