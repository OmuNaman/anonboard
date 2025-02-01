const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));

const db = require('./database');

io.on('connection', (socket) => {
    console.log('New client connected');

    // Emit initial threads and username when a client connects
    db.getAllThreads((err, threads) => {
        if (!err) {
            socket.emit('initialThreads', threads);
        }
    });

    const username = `Anonymous_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    socket.emit('username', { username });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

app.get('/api/username', (req, res) => {
    const username = `Anonymous_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    res.json({ username });
});

app.get('/api/threads', (req, res) => {
    db.getAllThreads((err, threads) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(threads);
    });
});

app.post('/api/threads', (req, res) => {
    const { username, title, content, captcha, imageData, videoData } = req.body;

    if (captcha !== '42') {
        return res.status(400).json({ error: 'Captcha verification failed.' });
    }

    db.createThread(username, title, content, imageData, videoData, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Thread created successfully!' });

        db.getAllThreads((err, threads) => {
            if (!err) {
                io.emit('newThread', threads);
            }
        });
    });
});

app.get('/api/threads/:threadId/comments', (req, res) => {
    const threadId = req.params.threadId;
    db.getCommentsByThreadId(threadId, (err, comments) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(comments);
    });
});

app.post('/api/threads/:threadId/comments', (req, res) => {
    const threadId = parseInt(req.params.threadId, 10);
    const { username, content, captcha } = req.body;

    if (captcha !== '42') {
        return res.status(400).json({ error: 'Captcha verification failed.' });
    }

    db.createComment(threadId, username, content, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Comment created successfully!' });

        // Fetch the updated list of comments and emit the 'newComment' event
        db.getCommentsByThreadId(threadId, (err, comments) => {
            if (err) {
                console.error('Error fetching updated comments:', err);
                return;
            }
            io.emit('newComment', { threadId, comments });
        });
    });
});

server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});