// backend/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'anonboard.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log("Connected to SQLite database.");
        createTables();
    }
});

function createTables() {
    db.run(`
        CREATE TABLE IF NOT EXISTS threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            imageData TEXT,
            videoData TEXT
        )
    `, (err) => {
        if (err) {
            console.error("Error creating threads table:", err.message);
        } else {
            // Alter table if columns don't exist
            db.run("ALTER TABLE threads ADD COLUMN imageData TEXT", (err) => {
                if (err && !err.message.includes("duplicate column name")) {
                    console.error("Error altering threads table for imageData:", err.message);
                }
            });
            db.run("ALTER TABLE threads ADD COLUMN videoData TEXT", (err) => {
                if (err && !err.message.includes("duplicate column name")) {
                    console.error("Error altering threads table for videoData:", err.message);
                }
            });
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            threadId INTEGER NOT NULL,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (threadId) REFERENCES threads(id)
        )
    `, (err) => {
        if (err) {
            console.error("Error creating comments table:", err.message);
        }
    });
}

const getAllThreads = (callback) => {
    db.all("SELECT * FROM threads ORDER BY createdAt DESC", [], callback);
};

const createThread = (username, title, content, imageData, videoData, callback) => {
    db.run("INSERT INTO threads (username, title, content, imageData, videoData) VALUES (?, ?, ?, ?, ?)", [username, title, content, imageData, videoData], callback);
};

const getCommentsByThreadId = (threadId, callback) => {
    db.all("SELECT * FROM comments WHERE threadId = ? ORDER BY createdAt ASC", [threadId], callback);
};

const createComment = (threadId, username, content, callback) => {
    db.run("INSERT INTO comments (threadId, username, content) VALUES (?, ?, ?)", [threadId, username, content], callback);
};

module.exports = {
    getAllThreads,
    createThread,
    getCommentsByThreadId,
    createComment
};