export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { customer, items, total, currency } = req.body || {};

    if (
      !customer?.name ||
      !customer?.phone ||
      !customer?.location ||
      !Array.isArray(items) ||
      !items.length
    ) {
      return res.status(400).json({ ok: false, error: "Missing required order information" });
    }

    if (items.length > 50) {
      return res.status(400).json({ ok: false, error: "Too many items in order" });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return res.status(500).json({ ok: false, error: "Telegram server configuration is missing" });
    }

    const clip = (s, max) => String(s ?? "").slice(0, max);

    const orderId = "MS-" + Date.now().toString(36).toUpperCase();
    const lines = items
      .map((x, i) => {
        const name = clip(x.name, 80);
        const ml = Number(x.ml) || 0;
        const qty = Number(x.qty) || 0;
        const lineTotal = Number(x.price) * qty;
        return `${i + 1}. ${name} — ${ml}ml × ${qty} = $${Number.isFinite(lineTotal) ? lineTotal.toFixed(2) : "0.00"}`;
      })
      .join("\n");

    const text = [
      `🧴 NEW PERFUME ORDER`,
      ``,
      `Order: ${orderId}`,
      ``,
      `👤 Customer: ${clip(customer.name, 120)}`,
      `📞 Phone: ${clip(customer.phone, 40)}`,
      `📍 Location: ${clip(customer.location, 300)}`,
      `📝 Additional info: ${clip(customer.notes, 500) || "—"}`,
      ``,
      `🛍 ITEMS`,
      lines,
      ``,
      `💰 TOTAL: $${Number(total).toFixed(2)} ${currency || "USD"}`,
      ``,
      `Please contact the customer to confirm the order.`
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

    const result = await tg.json();
    if (!tg.ok || !result.ok) {
      console.error(result);
      return res.status(502).json({ ok: false, error: "Telegram rejected the order" });
    }

    return res.status(200).json({ ok: true, orderId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
