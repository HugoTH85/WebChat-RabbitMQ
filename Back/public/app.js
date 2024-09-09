const socket = io();

document.getElementById('send').addEventListener('click', () => {
    const message = document.getElementById('message').value;
    const user = prompt("Enter 'user1' or 'user2':").trim().toLowerCase();
    if (message.trim() && (user === 'user1' || user === 'user2')) {
        socket.emit('send_message', { message, user });
        document.getElementById('message').value = '';
    } else {
        alert("Invalid input. Please enter a valid message and user.");
    }
});

socket.on('receive_message', (data) => {
    const chat = document.getElementById('chat');
    chat.innerHTML += `<p><strong>${data.user} [${data.time}]:</strong> ${data.msg}</p>`;
    chat.scrollTop = chat.scrollHeight;
});
