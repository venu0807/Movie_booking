const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

if (!rzp.key_id || !rzp.key_secret) {
  console.error('RAZORPAY_KEY_ID / RAZORPAY_SECRET must be set');
  process.exit(1);
}

app.post('/api/create-payment-order', async (req, res) => {
  try {
    const order = await rzp.orders.create({
      amount: Math.round(req.body.amount * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(8001, () => console.log('Server running on 8001'));
