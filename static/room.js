const socket = io();   // pick up the walkie-talkie

const timeEl = document.getElementById("time");
const startBtn = document.getElementById("start");
const resetBtn = document.getElementById("reset");
const modeBtns = document.querySelectorAll(".mode");
const listEl = document.getElementById("people");
const countEl = document.getElementById("count");

let mode = "focus";               // "focus" or "break"
let minutes = 25;
let secondsLeft = minutes * 60;
let timerId = null;
let endTime = null;
let status = "idle";              // what we tell everyone we're doing

// ---------- Walkie-talkie ----------

function setStatus(newStatus) {
  status = newStatus;
  socket.emit("status", { status: status });    // tell the server
}

// Runs when we connect (and again if the connection drops and comes back)
socket.on("connect", () => {
  socket.emit("join", { room: ROOM, name: NAME, status: status });
});

const LABELS = { focusing: "Focusing", break: "On a break", idle: "Just chilling" };

// The server sends us the updated list of people
socket.on("roster", (people) => {
  listEl.innerHTML = "";
  countEl.textContent = people.length;

  people.forEach((p) => {
    const li = document.createElement("li");

    const dot = document.createElement("span");
    dot.className = "pdot " + p.status;

    const name = document.createElement("span");
    name.className = "pname";
    name.textContent = p.name;          // textContent keeps it safe from sneaky HTML

    const st = document.createElement("span");
    st.className = "pstatus";
    st.textContent = LABELS[p.status] || "";

    li.append(dot, name, st);
    listEl.appendChild(li);
  });
});

// ---------- Timer ----------

function render() {
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const s = String(secondsLeft % 60).padStart(2, "0");
  timeEl.textContent = m + ":" + s;
  document.title = m + ":" + s + " · Focus Room";
}

function tick() {
  secondsLeft = Math.max(0, Math.round((endTime - Date.now()) / 1000));
  render();
  if (secondsLeft === 0) {
    pause();
    timeEl.classList.add("done");
  }
}

function start() {
  endTime = Date.now() + secondsLeft * 1000;
  timerId = setInterval(tick, 250);
  startBtn.textContent = "Pause";
  timeEl.classList.remove("done");
  setStatus(mode === "focus" ? "focusing" : "break");   // tell everyone!
}

function pause() {
  clearInterval(timerId);
  timerId = null;
  startBtn.textContent = "Start";
  setStatus("idle");                                    // tell everyone!
}

startBtn.addEventListener("click", () => {
  if (timerId) { pause(); } else { start(); }
});

resetBtn.addEventListener("click", () => {
  pause();
  secondsLeft = minutes * 60;
  timeEl.classList.remove("done");
  render();
});

modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    mode = btn.dataset.mode;
    minutes = Number(btn.dataset.minutes);
    pause();
    secondsLeft = minutes * 60;
    timeEl.classList.remove("done");
    render();
  });
});

render();