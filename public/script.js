let canvas = document.getElementById("canvas");
let colorPicker = document.getElementById("colorPicker");
let saveBtn = document.getElementById("saveBtn");
let changeColorBtn = document.getElementById("changeColorBtn");
let brushSizeInput = document.getElementById("brushSize");
let eraseBtn = document.getElementById("eraseBtn");

canvas.width = 600;
canvas.height = 480;

var io = io.connect("http://localhost:5001/");

let ctx = canvas.getContext("2d");
let x, y;
let mouseDown = false;
let currentColor = colorPicker.value;
let isErasing = false;
let brushSize = 5;


colorPicker.addEventListener("input", (event) => {
    currentColor = event.target.value;
    io.emit("colorChange", { color: currentColor });
});

let lastEmit = 0;
canvas.addEventListener("mousemove", (event) => {
    if (!mouseDown) return;

    const now = Date.now();
    if (now - lastEmit < 30) return; 
    lastEmit = now;

    const rect = canvas.getBoundingClientRect();
    x = event.clientX - rect.left;
    y = event.clientY - rect.top;

    ctx.lineWidth = brushSize;

    if (isErasing) {
        ctx.clearRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
        io.emit("erase", { x, y, brushSize });
    } else {
        ctx.strokeStyle = currentColor;
        ctx.lineTo(x, y);
        ctx.stroke();
        io.emit("draw", { x, y, color: ctx.strokeStyle, brushSize });
    }
});

canvas.onmousedown = (event) => {
    const rect = canvas.getBoundingClientRect();
    x = event.clientX - rect.left;
    y = event.clientY - rect.top;

    mouseDown = true;
    ctx.beginPath();
    ctx.moveTo(x, y);

    io.emit("down", { x, y, color: currentColor });
};

canvas.onmouseup = () => {
    mouseDown = false;
    ctx.closePath();
};

io.on("ondraw", ({ x, y, color, brushSize }) => {
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
});

io.on("ondown", ({ x, y, color }) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
});

io.on("colorChange", ({ color }) => {
    colorPicker.value = color;
    currentColor = color;
});

changeColorBtn.addEventListener("click", () => {
    const newColor = getRandomColor();
    canvas.style.backgroundColor = newColor;
    io.emit("canvasBackgroundChange", { backgroundColor: newColor });
});

io.on("canvasBackgroundChange", ({ backgroundColor }) => {
    canvas.style.backgroundColor = backgroundColor;
});

io.on("clearCanvas", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

saveBtn.addEventListener("click", () => {
    const backgroundColor = canvas.style.backgroundColor || "#FFFFFF";
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCtx.fillStyle = backgroundColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    const dataURL = tempCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `drawing-${Date.now()}.png`;
    link.click();
});

brushSizeInput.addEventListener("input", (event) => {
    brushSize = event.target.value;
    ctx.lineWidth = brushSize;
    io.emit("brushSizeChange", { brushSize });
});

io.on("brushSizeChange", ({ brushSize }) => {
    brushSizeInput.value = brushSize;
    ctx.lineWidth = brushSize;
});

eraseBtn.addEventListener("click", () => {
    isErasing = !isErasing;
    eraseBtn.style.backgroundColor = isErasing ? "#f0a" : "";
});

io.on("onerase", ({ x, y, brushSize }) => {
    ctx.clearRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
});
