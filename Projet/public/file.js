const io = require('socket.io')(3000);
const userColors = {}; // Stocker les couleurs des utilisateurs

io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté');

    // Recevoir la couleur de l'utilisateur
    socket.on('set_user_color', (data) => {
        const { user, color } = data;
        userColors[user] = color; // Sauvegarder la couleur pour l'utilisateur
    });

    // Recevoir un message et envoyer aux autres utilisateurs avec la couleur associée
    socket.on('send_message', (data) => {
        const { message, user } = data;
        const time = new Date().toLocaleTimeString();
        const color = userColors[user] || '#000000'; // Utiliser la couleur sauvegardée ou une couleur par défaut
        io.emit('receive_message', { msg: message, time, user, color });
    });

    // Recevoir un fichier et envoyer aux autres utilisateurs
    socket.on('send_file', (data) => {
        const { file, filename, user } = data;
        const time = new Date().toLocaleTimeString();
        io.emit('receive_file', { buffer: file, filename, user });
    });

    socket.on('disconnect', () => {
        console.log('Un utilisateur est déconnecté');
    });
});
