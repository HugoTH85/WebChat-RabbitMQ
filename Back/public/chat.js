document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    const username = window.location.pathname.split('/')[2]; // Extraire le nom d'utilisateur de l'URL

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
