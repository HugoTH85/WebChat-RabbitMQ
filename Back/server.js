const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const amqp = require('amqplib');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const EXCHANGE = 'direct_exchange';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/chat/:user', (req, res) => {
    const user = req.params.user;
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function setupRabbitMQ() {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'direct', { durable: false });

    return { connection, channel };
}

async function setup() {
    const { connection, channel } = await setupRabbitMQ();

    io.on('connection', (socket) => {
        console.log('A user connected');
        
        socket.on('send_message', (data) => {
            const { message, user } = data;
            const routingKey = user === 'user1' ? 'user2_key' : 'user1_key';
            channel.publish(EXCHANGE, routingKey, Buffer.from(message));
            console.log(`Message sent: ${message}`);

            // Broadcast the message to all clients
            io.emit('receive_message', { msg: message, time: new Date().toLocaleTimeString(), user });
        });

        socket.on('disconnect', () => {
            console.log('A user disconnected');
        });
    });

    server.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}

setup().catch(console.error);
