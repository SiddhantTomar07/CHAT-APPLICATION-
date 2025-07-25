require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('chat message', async (msg) => {
        if (msg.startsWith("chat ")) {
            const userInput = msg.substring(5).trim();
            try {
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: "moonshotai/kimi-k2:free",
                        messages: [
                            { role: "system", content: "You are a helpful assistant." },
                            { role: "user", content: userInput }
                        ]
                    })
                });

                const data = await response.json();

                let aiReply = "🤖 Sorry, no reply.";
                if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
                    aiReply = `🤖 ${data.choices[0].message.content}`;
                } else if (data.error) {
                    aiReply = `🤖 Error: ${data.error.message}`;
                }

                io.emit('chat message', aiReply);
            } catch (err) {
                console.error("OpenRouter API Error:", err);
                io.emit('chat message', "🤖 Error contacting AI.");
            }
        } else {
            io.emit('chat message', msg);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
