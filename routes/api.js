const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const sheets = require('../utils/sheets');

const TOTAL_TICKETS = 15;

const TICKET_TYPES = [
  { id: 'presale_drink', label: '預售走喝酒票', price: 929, note: '限兩杯', presale: true },
  { id: 'presale_nondry', label: '預售去走走票', price: 799, note: '無酒精', presale: true },
  { id: 'onsite_drink', label: '現場一起喝酒票', price: 1729, note: '無限暢飲', presale: false },
  { id: 'onsite_nodry', label: '現場不喝酒票', price: 829, note: '無酒精', presale: false },
];

// GET /api/event
router.get('/event', async (req, res) => {
  try {
    const [title, soldCount] = await Promise.all([
      sheets.getTitle(),
      sheets.getSoldCount(),
    ]);
    res.json({
      title,
      soldCount,
      totalTickets: TOTAL_TICKETS,
      remaining: Math.max(0, TOTAL_TICKETS - soldCount),
      ticketTypes: TICKET_TYPES,
      payment: {
        linepayId: process.env.LINEPAY_ID || '',
        note: process.env.PAYMENT_NOTE || '付款完成後請截圖傳給主辦確認，訂單確認後票券即生效',
      },
    });
  } catch (err) {
    console.error('GET /api/event error:', err.message);
    res.status(500).json({ error: '無法取得活動資訊，請稍後再試' });
  }
});

// POST /api/order
router.post('/order', async (req, res) => {
  const { name, phone, email, ticketTypeId, quantity, notes } = req.body;

  // Basic validation
  if (!name || !phone || !email || !ticketTypeId || !quantity) {
    return res.status(400).json({ error: '請填寫所有必填欄位' });
  }
  if (quantity < 1 || quantity > 4) {
    return res.status(400).json({ error: '購票數量請在 1–4 張之間' });
  }

  const ticketType = TICKET_TYPES.find(t => t.id === ticketTypeId);
  if (!ticketType) {
    return res.status(400).json({ error: '票種不存在' });
  }
  if (!ticketType.presale) {
    return res.status(400).json({ error: '現場票請至現場購買' });
  }

  // Check availability
  let soldCount;
  try {
    soldCount = await sheets.getSoldCount();
  } catch (err) {
    return res.status(500).json({ error: '無法確認票券餘量，請稍後再試' });
  }

  const remaining = TOTAL_TICKETS - soldCount;
  if (remaining <= 0) {
    return res.status(409).json({ error: '很抱歉，票券已售完！' });
  }
  if (quantity > remaining) {
    return res.status(409).json({
      error: `剩餘票券不足，目前僅剩 ${remaining} 張`,
    });
  }

  const orderId = generateOrderId();
  const amount = ticketType.price * quantity;

  const order = {
    orderId,
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
    ticketType: ticketType.label,
    ticketNote: ticketType.note,
    quantity: Number(quantity),
    amount,
    notes: (notes || '').trim(),
  };

  try {
    await sheets.appendOrder(order);
  } catch (err) {
    console.error('Sheets append error:', err.message);
    return res.status(500).json({ error: '儲存訂單失敗，請稍後再試' });
  }

  res.json({
    success: true,
    order: {
      orderId: order.orderId,
      name: order.name,
      ticketType: order.ticketType,
      ticketNote: order.ticketNote,
      quantity: order.quantity,
      amount: order.amount,
    },
  });
});

function generateOrderId() {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VB${ymd}-${rand}`;
}

module.exports = router;
