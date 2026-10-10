const go = () => {
  const name = document.getElementById("name").value.trim();
  const room = document.getElementById("room").value.trim().toLowerCase().replace(/\s+/g, "-");
  if (!name || !room) { alert("Fill in both boxes first."); return; }
  location.href = "/room/" + encodeURIComponent(room) + "?name=" + encodeURIComponent(name);
};
document.getElementById("join-btn").addEventListener("click", go);
document.querySelectorAll("input").forEach(i => i.addEventListener("keydown", e => e.key === "Enter" && go()));