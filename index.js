let express = require("express");
let app = express();
let httpServer = require("http").createServer(app);
let io = require("socket.io")(httpServer);

let connections = [];
let currentColor = '#000000';
let currentBackgroundColor = '#FFFFFF';
let currentBrushSize = 5;
let drawingHistory = [];

class Lock {
    constructor() {
        this.queue = [];
        this.locked = false;
    }

    async acquire() {
        if (this.locked) {
            await new Promise(resolve => this.queue.push(resolve));
        } else {
            this.locked = true;
        }
    }

    release() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next(); 
        } else {
            this.locked = false;
        }
    }
}

const historyLock = new Lock();

io.on("connect", (socket) => {
    connections.push(socket);
    console.log(`${socket.id} has connected`);

    socket.emit("colorChange", { color: currentColor });
    socket.emit("canvasBackgroundChange", { backgroundColor: currentBackgroundColor });
    socket.emit("brushSizeChange", { brushSize: currentBrushSize });
    socket.emit("history", drawingHistory);

    socket.on("draw", async (data) => {
        await historyLock.acquire();
        try {
            drawingHistory.push({
                type: 'ondraw',
                data: { x: data.x, y: data.y, color: data.color, brushSize: data.brushSize }
            });
        } finally {
            historyLock.release();
        }
        socket.broadcast.emit("ondraw", { x: data.x, y: data.y, color: data.color, brushSize: data.brushSize });
    });

    socket.on("down", (data) => {
        socket.broadcast.emit("ondown", { x: data.x, y: data.y, color: data.color });
    });

    socket.on("erase", async (data) => {
        await historyLock.acquire();
        try {
            drawingHistory.push({
                type: 'onerase',
                data: { x: data.x, y: data.y, brushSize: data.brushSize }
            });
        } finally {
            historyLock.release();
        }
        socket.broadcast.emit("onerase", { x: data.x, y: data.y, brushSize: data.brushSize });
    });

    socket.on("colorChange", (data) => {
        currentColor = data.color;
        io.emit("colorChange", { color: currentColor });
    });

    socket.on("canvasBackgroundChange", (data) => {
        currentBackgroundColor = data.backgroundColor;
        io.emit("canvasBackgroundChange", { backgroundColor: data.backgroundColor });
    });

    socket.on("disconnect", () => {
        console.log(`${socket.id} has disconnected.`);
        connections = connections.filter((con) => con.id !== socket.id);
    });
});

app.use(express.static("public"));

let PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => console.log(`Server started on port ${PORT}`));