# Perfume Shop — Render Ready

This version is prepared for a Render Web Service.

## Render settings

- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`

## Environment variables

In Render → your service → Environment, add:

- `TELEGRAM_BOT_TOKEN` = your Telegram bot token
- `TELEGRAM_CHAT_ID` = the Telegram chat ID where orders should arrive

Do not put the real token in GitHub or inside the frontend files.

## Local test

```bash
npm install
npm start
```

Then open `http://localhost:3000`.
