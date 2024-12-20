let express = require("express");
let app = express();
let httpServer = require("http").createServer(app);
let io = require("socket.io")(httpServer);

let connections = [];
let currentColor = '#000000';
let currentBackgroundColor = '#FFFFFF';
let currentBrushSize = 5;
let drawingHistory = [];

io.on("connect", (socket) => {
    connections.push(socket);
    console.log(`${socket.id} has connected`);

    socket.emit("colorChange", { color: currentColor });
    socket.emit("canvasBackgroundChange", { backgroundColor: currentBackgroundColor });
    socket.emit("brushSizeChange", { brushSize: currentBrushSize });
    socket.emit("history", drawingHistory);

    socket.on("down", (data) => {
        socket.broadcast.emit("ondown", { x: data.x, y: data.y, color: data.color });
    });

    socket.on("draw", (data) => {
        drawingHistory.push({ x: data.x, y: data.y, color: data.color, brushSize: data.brushSize });
        socket.broadcast.emit("ondraw", { x: data.x, y: data.y, color: data.color, brushSize: data.brushSize });
    });

    socket.on("erase", (data) => {
        socket.broadcast.emit("onerase", { x: data.x, y: data.y, color: "#FFFFFF", brushSize: data.brushSize });
    });

    socket.on("colorChange", (data) => {
        currentColor = data.color;
        io.emit("colorChange", { color: currentColor });
    });

    socket.on("canvasBackgroundChange", (data) => {
        io.emit("canvasBackgroundChange", { backgroundColor: data.backgroundColor });
    });

    socket.on("brushSizeChange", (data) => {
        currentBrushSize = data.brushSize;
        io.emit("brushSizeChange", { brushSize: currentBrushSize });
    });

    socket.on("getHistory", () => {
        socket.emit("history", drawingHistory);
    });

    socket.on("disconnect", (reason) => {
        console.log(`${socket.id} has disconnected.`);
        connections = connections.filter((con) => con.id !== socket.id);
    });
});

app.use(express.static("public"));

let PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server started on port ${PORT}`));
