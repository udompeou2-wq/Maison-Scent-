import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

// API: receive an order and forward it to Telegram.
app.post("/api/order", async (req, res) => {
  try {
    const { customer, items, total, currency } = req.body || {};

    if (!customer?.name || !customer?.phone || !customer?.location || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ ok: false, error: "Missing required order information" });
    }

    if (items.length > 50) {
      return res.status(400).json({ ok: false, error: "Too many items in order" });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return res.status(500).json({ ok: false, error: "Telegram server configuration is missing" });
    }

    const clip = (s, max) => String(s ?? "").slice(0, max);
    const orderId = "MS-" + Date.now().toString(36).toUpperCase();

    const lines = items.map((x, i) => {
      const name = clip(x.name, 80);
      const ml = Number(x.ml) || 0;
      const qty = Number(x.qty) || 0;
      const price = Number(x.price) || 0;
      const lineTotal = price * qty;
      return `${i + 1}. ${name} — ${ml}ml × ${qty} = $${lineTotal.toFixed(2)}`;
    }).join("\n");

    const safeTotal = Number(total);
    const text = [
      "🧴 NEW PERFUME ORDER",
      "",
      `Order: ${orderId}`,
      "",
      `👤 Customer: ${clip(customer.name, 120)}`,
      `📞 Phone: ${clip(customer.phone, 40)}`,
      `📍 Location: ${clip(customer.location, 300)}`,
      `📝 Additional info: ${clip(customer.notes, 500) || "—"}`,
      "",
      "🛍 ITEMS",
      lines,
      "",
      `💰 TOTAL: $${Number.isFinite(safeTotal) ? safeTotal.toFixed(2) : "0.00"} ${clip(currency || "USD", 10)}`,
      "",
      "Please contact the customer to confirm the order."
    ].join("\n");

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });

    const result = await tg.json().catch(() => ({}));
    if (!tg.ok || !result.ok) {
      console.error("Telegram error:", result);
      return res.status(502).json({ ok: false, error: "Telegram rejected the order" });
    }

    return res.status(200).json({ ok: true, orderId });
  } catch (err) {
    console.error("Order error:", err);
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
});

// Health check for Render.
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "perfume-shop" });
});

// Serve the storefront.
app.use(express.static(__dirname));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Perfume shop running on port ${PORT}`);
});
