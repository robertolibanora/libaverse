# LibaVerse

Mini web game in Flask con 3 mondi (`sarto`, `kpmg`, `malibu`), wallet multi-valuta e store interno.

## Stack

- Python 3.10+
- Flask
- python-dotenv

## Setup rapido

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install flask python-dotenv
```

## Variabili ambiente

Opzionali (con default già presenti in `app.py`):

- `SECRET_KEY` (default: `dev-secret-change-me`)
- `FLASK_ENV` (`production` oppure altro)
- `HOST` (default: `0.0.0.0`)
- `PORT` (default: `8080`)
- `STATIC_CACHE_MAX_AGE` (default: `31536000`)
- `HTML_CACHE_MAX_AGE` (default: `600`)

Esempio `.env`:

```env
SECRET_KEY=change-me
FLASK_ENV=development
PORT=8080
```

## Avvio

```bash
python app.py
```

Apri: `http://localhost:8080`

## Rotte principali

- UI:
  - `/`
  - `/world/sarto`
  - `/world/kpmg`
  - `/world/malibu`
  - `/store`
- Health:
  - `/health`
  - `/ready`
  - `/ping`
- API stato/store:
  - `GET /api/state`
  - `POST /api/state`
  - `POST /api/earn`
  - `GET /api/store/catalog`
  - `POST /api/store/buy`
  - `POST /api/store/equip-skin`
  - `POST /api/reset`

## Struttura progetto

```text
app.py
templates/
  _partials/
  worlds/
static/
  app/
    css/
    js/
    pwa/
  worlds/
    sarto/
    kpmg/
    malibu/
```

## Note

- Lo stato gioco è in sessione server-side Flask.
- I dati dei mondi sono in `static/worlds/*/data/*.json`.
- `manifest.webmanifest` e `sw.js` sono serviti anche da route dedicate.
