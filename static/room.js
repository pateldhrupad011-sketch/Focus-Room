const $ = id => document.getElementById(id);
const invite = () => navigator.clipboard.writeText(location.origin + "/room/" + encodeURIComponent(ROOM))
  .then(() => { $("invite").textContent = "Copied!"; setTimeout(() => $("invite").textContent = "Copy invite link", 1500); });
$("invite").addEventListener("click", invite);

if (!NAME) {
  const enter = () => {
    const n = $("gate-name").value.trim();
    if (n) location.href = location.pathname + "?name=" + encodeURIComponent(n);
  };
  $("gate-btn").addEventListener("click", enter);
  $("gate-name").addEventListener("keydown", e => e.key === "Enter" && enter());
} else {
  const socket = io();
  let mode = "focusing", total = 25 * 60, left = total, endAt = 0, timer = null, people = [], audio = null;

  const fmt = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  const status = () => timer ? mode : "idle";
  const tell = () => socket.emit("update", { status: status(), task: $("task").value, left });

  function draw() {
    $("time").textContent = fmt(left);
    $("fill").style.width = (100 - (left / total) * 100) + "%";
    document.title = (timer ? fmt(left) + " | " : "") + ROOM;
  }

  function beep() {
    if (!audio) return;
    [660, 880].forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = f; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.2, audio.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + i * 0.25 + 0.4);
      o.start(audio.currentTime + i * 0.25); o.stop(audio.currentTime + i * 0.25 + 0.4);
    });
  }

  function stop() { clearInterval(timer); timer = null; $("start").textContent = "Start"; }

  function start() {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    endAt = Date.now() + left * 1000;
    timer = setInterval(() => {
      left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      draw();
      if (left === 0) { stop(); beep(); tell(); }
    }, 250);
    $("start").textContent = "Pause";
  }

  $("start").addEventListener("click", () => { timer ? stop() : start(); tell(); draw(); });
  $("reset").addEventListener("click", () => { stop(); left = total; draw(); tell(); });
  $("task").addEventListener("change", tell);

  document.querySelectorAll(".mode").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".mode").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    mode = b.dataset.mode; total = left = Number(b.dataset.min) * 60;
    stop(); draw(); tell();
  }));

  socket.on("connect", () => {
    socket.emit("join", { room: ROOM, name: NAME, task: $("task").value });
    tell();
  });

  const LABEL = { focusing: "focusing", break: "on a break", idle: "just here" };
  socket.on("roster", list => { people = list.map(p => ({ ...p, at: Date.now() })); paint(); });

  function paint() {
    $("count").textContent = people.length;
    $("board").innerHTML = "";
    people.forEach((p, i) => {
      const n = document.createElement("div");
      n.className = "sticky " + p.status;
      n.style.setProperty("--tilt", ((i * 37) % 7 - 3) * 0.7 + "deg");
      const nm = document.createElement("b"); nm.textContent = p.name;
      const tk = document.createElement("p"); tk.className = "task"; tk.textContent = p.task || "...";
      const st = document.createElement("span"); st.className = "st"; st.dataset.i = i;
      n.append(nm, tk, st);
      $("board").appendChild(n);
    });
    tickNotes();
  }

  function tickNotes() {
    document.querySelectorAll(".st").forEach(el => {
      const p = people[el.dataset.i];
      const r = Math.max(0, p.left - Math.floor((Date.now() - p.at) / 1000));
      el.textContent = p.status === "idle" ? LABEL.idle : LABEL[p.status] + ", " + fmt(r) + " left";
    });
  }
  setInterval(tickNotes, 1000);
  draw();
}