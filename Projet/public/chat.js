document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    const username = window.location.pathname.split('/')[2]; // Extraire le nom d'utilisateur de l'URL

    // Fonction pour générer une couleur de fond unique basée sur le nom d'utilisateur
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
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesDiv = document.getElementById('messages');

    sendButton.addEventListener('click', function() {
        const message = messageInput.value;
        if (message) {
            socket.emit('send_message', { message, user: username });
            messageInput.value = '';
        }
    });

    socket.on('receive_message', function(data) {
        const { msg, time, user } = data;
        const messageElement = document.createElement('div');
        messageElement.textContent = `[${time}] ${user} : ${msg}`;
        messagesDiv.appendChild(messageElement);
    });
    
});
