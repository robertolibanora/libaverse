import os
from datetime import datetime

from flask import (
    Flask,
    render_template,
    request,
    session,
    jsonify,
    send_from_directory,
)
from dotenv import load_dotenv

# =====================================================
# ENV + APP SETUP
# =====================================================
load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")

# produzione / reverse proxy (Railway, Render, ecc.)
if os.environ.get("FLASK_ENV") == "production":
    app.config["DEBUG"] = False
    from werkzeug.middleware.proxy_fix import ProxyFix

    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
else:
    app.config["DEBUG"] = True

# Cache tuning (puoi cambiare via .env)
STATIC_CACHE_MAX_AGE = int(os.environ.get("STATIC_CACHE_MAX_AGE", "31536000"))  # 1 anno
HTML_CACHE_MAX_AGE = int(os.environ.get("HTML_CACHE_MAX_AGE", "600"))  # 10 min

# =====================================================
# GAME CONSTANTS (VALUTE + DEFAULT STATE)
# =====================================================
CURRENCIES = {
    "fish": {"label": "FishCoin", "emoji": "🐟"},
    "brain": {"label": "BrainCell", "emoji": "🧠"},
    "vibe": {"label": "VibeToken", "emoji": "🎧"},
}


def fresh_state() -> dict:
    """Crea SEMPRE un nuovo state (no shallow-copy di dict/list)."""
    return {
        "wallet": {"fish": 0, "brain": 0, "vibe": 0},
        "inventory": [],  # item IDs acquistati
        "skins": [],  # skin/outfit IDs sbloccati
        "equipped_skin": None,  # opzionale
        "stats": {  # opzionale: contatori globali
            "plays": 0,
            "correct": 0,
            "wrong": 0,
            "last_seen": None,
        },
    }


# Store catalog “placeholder”: lo popoli poi con JSON o DB
STORE_CATALOG = [
    {
        "id": "car_panda_grind",
        "name": "Panda Grind Edition",
        "type": "car",
        "cost": {"fish": 120, "brain": 40, "vibe": 0},
        "desc": "La macchina ufficiale del grind.",
    },
    {
        "id": "skin_kpmg_tie",
        "name": "Outfit: Cravatta Consultant",
        "type": "skin",
        "cost": {"fish": 0, "brain": 50, "vibe": 30},
        "desc": "Aumenta la credibilità percepita del 7% (fake).",
    },
    {
        "id": "social_confidence",
        "name": "Confidence Buff",
        "type": "social",
        "cost": {"fish": 0, "brain": 0, "vibe": 180},
        "desc": "Risponde al cringe al posto tuo.",
    },
]
CATALOG_INDEX = {item["id"]: item for item in STORE_CATALOG}

# =====================================================
# HELPERS: STATE
# =====================================================


def get_state() -> dict:
    """Ensure and return session state."""
    if "state" not in session or not isinstance(session.get("state"), dict):
        session["state"] = fresh_state()
    # Aggiorna last_seen
    session["state"]["stats"]["last_seen"] = datetime.utcnow().isoformat()
    session.modified = True
    return session["state"]


def set_state(new_state: dict) -> dict:
    """Replace state safely (basic shape enforcement)."""
    safe = fresh_state()

    if isinstance(new_state, dict):
        # wallet
        if isinstance(new_state.get("wallet"), dict):
            for k in safe["wallet"].keys():
                v = new_state["wallet"].get(k, safe["wallet"][k])
                try:
                    safe["wallet"][k] = int(v)
                except (TypeError, ValueError):
                    pass
                safe["wallet"][k] = max(0, safe["wallet"][k])

        # inventory / skins
        if isinstance(new_state.get("inventory"), list):
            safe["inventory"] = [str(x) for x in new_state["inventory"]]

        if isinstance(new_state.get("skins"), list):
            safe["skins"] = [str(x) for x in new_state["skins"]]

        # equipped_skin
        if new_state.get("equipped_skin") is None or isinstance(
            new_state.get("equipped_skin"), str
        ):
            safe["equipped_skin"] = new_state.get("equipped_skin")

        # stats (accetta solo chiavi note)
        if isinstance(new_state.get("stats"), dict):
            for k in safe["stats"].keys():
                if k in new_state["stats"]:
                    safe["stats"][k] = new_state["stats"][k]

    session["state"] = safe
    session.modified = True
    return safe


def add_currency(currency: str, delta: int) -> dict:
    """Add/subtract currency, clamp at 0."""
    st = get_state()
    if currency not in st["wallet"]:
        return st
    st["wallet"][currency] = max(0, int(st["wallet"][currency]) + int(delta))
    session.modified = True
    return st


def can_afford(cost: dict, wallet: dict) -> bool:
    for cur, amount in (cost or {}).items():
        if int(wallet.get(cur, 0)) < int(amount):
            return False
    return True


def spend(cost: dict) -> None:
    st = get_state()
    for cur, amount in (cost or {}).items():
        st["wallet"][cur] = max(0, int(st["wallet"].get(cur, 0)) - int(amount))
    session.modified = True


# =====================================================
# CACHE HEADERS
# =====================================================
@app.after_request
def after_request(resp):
    # Static: cache aggressivo
    if request.path.startswith("/static/"):
        resp.headers["Cache-Control"] = (
            f"public, max-age={STATIC_CACHE_MAX_AGE}, immutable"
        )
        resp.headers["Vary"] = "Accept-Encoding"
        return resp

    # HTML pages: cache breve
    if request.method == "GET" and resp.mimetype == "text/html":
        resp.headers["Cache-Control"] = f"public, max-age={HTML_CACHE_MAX_AGE}"
    return resp


# =====================================================
# HEALTH / READY
# =====================================================
@app.get("/health")
def health():
    return "OK", 200


@app.get("/ready")
def ready():
    return "READY", 200


@app.get("/ping")
def ping():
    return "PONG", 200


# =====================================================
# PAGES (TEMPLATES)
# =====================================================
@app.get("/")
def hub():
    st = get_state()
    return render_template("hub.html", currencies=CURRENCIES, state=st)


@app.get("/world/sarto")
def world_sarto():
    st = get_state()
    return render_template("worlds/sarto.html", currencies=CURRENCIES, state=st)


@app.get("/world/kpmg")
def world_kpmg():
    st = get_state()
    return render_template("worlds/kpmg.html", currencies=CURRENCIES, state=st)


@app.get("/world/malibu")
def world_malibu():
    st = get_state()
    return render_template("worlds/malibu.html", currencies=CURRENCIES, state=st)


@app.get("/store")
def store():
    st = get_state()
    return render_template(
        "store.html",
        currencies=CURRENCIES,
        state=st,
        catalog=STORE_CATALOG,
    )


# =====================================================
# API: STATE (wallet/inventory)
# =====================================================
@app.get("/api/state")
def api_get_state():
    return jsonify({"success": True, "state": get_state(), "currencies": CURRENCIES})


@app.post("/api/state")
def api_set_state():
    data = request.get_json(silent=True) or {}
    st = set_state(data.get("state", {}))
    return jsonify({"success": True, "state": st})


@app.post("/api/earn")
def api_earn():
    """
    Endpoint generico per i giochi:
      { "world":"sarto|kpmg|malibu", "result":"correct|wrong", "delta": {..optional..} }

    Se non passi delta, applico regole standard:
      correct: +10 valuta mondo
      wrong:   -7  valuta mondo
    """
    data = request.get_json(silent=True) or {}
    world = (data.get("world") or "").strip().lower()
    result = (data.get("result") or "").strip().lower()

    world_to_currency = {"sarto": "fish", "kpmg": "brain", "malibu": "vibe"}
    cur = world_to_currency.get(world)

    st = get_state()
    st["stats"]["plays"] = int(st["stats"].get("plays", 0)) + 1

    if not cur:
        return jsonify({"success": False, "error": "world non valido"}), 400

    # delta custom (opzionale): deve contenere la currency target, es {"fish":5}
    delta_map = data.get("delta")
    if isinstance(delta_map, dict) and cur in delta_map:
        try:
            delta = int(delta_map[cur])
        except (TypeError, ValueError):
            delta = 0
    else:
        delta = 10 if result == "correct" else -7

    add_currency(cur, delta)

    if result == "correct":
        st["stats"]["correct"] = int(st["stats"].get("correct", 0)) + 1
    elif result == "wrong":
        st["stats"]["wrong"] = int(st["stats"].get("wrong", 0)) + 1

    return jsonify({"success": True, "state": st, "applied": {"currency": cur, "delta": delta}})


# =====================================================
# API: STORE
# =====================================================
@app.get("/api/store/catalog")
def api_store_catalog():
    return jsonify({"success": True, "catalog": STORE_CATALOG, "currencies": CURRENCIES})


@app.post("/api/store/buy")
def api_store_buy():
    data = request.get_json(silent=True) or {}
    item_id = (data.get("item_id") or "").strip()
    item = CATALOG_INDEX.get(item_id)

    if not item:
        return jsonify({"success": False, "error": "item non trovato"}), 404

    st = get_state()

    if item_id in st["inventory"] or item_id in st["skins"]:
        return jsonify({"success": False, "error": "già acquistato"}), 400

    cost = item.get("cost", {})
    if not can_afford(cost, st["wallet"]):
        return jsonify(
            {"success": False, "error": "fondi insufficienti", "wallet": st["wallet"]},
            400,
        )

    spend(cost)

    # salva in inventory o skins
    if item.get("type") == "skin":
        st["skins"].append(item_id)
        if st.get("equipped_skin") is None:
            st["equipped_skin"] = item_id
    else:
        st["inventory"].append(item_id)

    session.modified = True
    return jsonify({"success": True, "state": st, "bought": item})


@app.post("/api/store/equip-skin")
def api_store_equip_skin():
    data = request.get_json(silent=True) or {}
    skin_id = (data.get("skin_id") or "").strip()

    st = get_state()
    if skin_id not in st["skins"]:
        return jsonify({"success": False, "error": "skin non posseduta"}), 400

    st["equipped_skin"] = skin_id
    session.modified = True
    return jsonify({"success": True, "state": st})


# =====================================================
# DEV: RESET
# =====================================================
@app.post("/api/reset")
def api_reset():
    """Reset rapido per dev/test."""
    set_state(fresh_state())
    return jsonify({"success": True, "state": get_state()})


# =====================================================
# STATIC: PWA FILES (manifest + sw)
# =====================================================
@app.get("/manifest.webmanifest")
def manifest():
    return send_from_directory(
        os.path.join(app.static_folder, "app", "pwa"),
        "manifest.webmanifest",
        mimetype="application/manifest+json",
    )


@app.get("/sw.js")
def service_worker():
    return send_from_directory(
        os.path.join(app.static_folder, "app", "pwa"),
        "sw.js",
        mimetype="application/javascript",
    )


# =====================================================
# DATA: WORLD JSON (questions/dialogues/fishes/customers)
# =====================================================
@app.get("/api/world/<world>/data/<path:filename>")
def api_world_data(world, filename):
    """
    Serve JSON data per mondo, es:
      /api/world/kpmg/data/questions.json
      /api/world/sarto/data/fishes.json
      /api/world/malibu/data/dialogues.json
    """
    base = os.path.join(app.static_folder, "worlds", world, "data")
    return send_from_directory(base, filename, mimetype="application/json")


# =====================================================
# OPTIONAL: WORLD STATIC ROUTER (se vuoi path “carini”)
# (puoi anche NON usarlo e caricare direttamente /static/worlds/..)
# =====================================================
@app.get("/world-static/<world>/<path:filename>")
def world_static(world, filename):
    base = os.path.join(app.static_folder, "worlds", world)
    return send_from_directory(base, filename)


# =====================================================
# RUN
# =====================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host=host, port=port, debug=debug)