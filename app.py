import os
from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, emit

app = Flask(__name__)
socketio = SocketIO(app)

rooms = {}   # {"math-club": {sid: {"name", "status", "task", "left"}}}
where = {}   # {sid: "math-club"}


def clean(text, n):
    return str(text or "").strip()[:n]


def send_roster(code):
    emit("roster", list(rooms.get(code, {}).values()), to=code)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/room/<code>")
def room(code):
    return render_template("room.html", code=clean(code, 30), name=clean(request.args.get("name"), 20))


@socketio.on("join")
def on_join(d):
    code = clean(d.get("room"), 30)
    if not code:
        return
    join_room(code)
    rooms.setdefault(code, {})[request.sid] = {
        "name": clean(d.get("name"), 20) or "Guest",
        "status": "idle", "task": clean(d.get("task"), 40), "left": 0,
    }
    where[request.sid] = code
    send_roster(code)


@socketio.on("update")
def on_update(d):
    code = where.get(request.sid)
    me = rooms.get(code, {}).get(request.sid)
    if me:
        me["status"] = d.get("status") if d.get("status") in ("idle", "focusing", "break") else "idle"
        me["task"] = clean(d.get("task"), 40)
        me["left"] = max(0, int(d.get("left") or 0))
        send_roster(code)


@socketio.on("disconnect")
def on_disconnect(*args):
    code = where.pop(request.sid, None)
    if code:
        rooms[code].pop(request.sid, None)
        if rooms[code]:
            send_roster(code)
        else:
            del rooms[code]


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5001)),
                 debug=not os.environ.get("PORT"), allow_unsafe_werkzeug=True)