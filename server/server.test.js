"use strict";
/**
 * Tests for the CineBook booking server.
 * Run: npm test  (from Movie_booking/server)
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

process.env.RAZORPAY_KEY_ID = "rzp_test_xxxxxxxxxxxx";
process.env.RAZORPAY_SECRET = "test_secret_key";
process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
process.env.DB_PATH = path.join(__dirname, "test-cinebook.sqlite3");

// Fresh DB per test run
for (const suffix of ["", "-wal", "-shm"]) {
  const f = process.env.DB_PATH + suffix;
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const { app, SHOWS, expireStaleHolds } = require("./server");
const request = require("supertest");

// Jest hoists mocks above the env vars above, so build the mock inline.
jest.mock("razorpay", () => {
  const orders = new Map(); // id -> { id, amount, currency }
  const mRazorpay = jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn(async ({ amount, currency, notes }) => {
        const id = "order_test_" + Math.random().toString(36).slice(2, 10);
        const order = { id, amount, currency, notes, status: "created" };
        orders.set(id, order);
        return order;
      }),
      fetch: jest.fn(async (id) => orders.get(id)),
    },
  }));
  mRazorpay.__orders = orders;
  return mRazorpay;
});

const Razorpay = require("razorpay");
const mockOrders = Razorpay.__orders;

const SHOW_ID = "show_101";
const show = SHOWS[SHOW_ID];
const UNIT = show.priceByType.regular;
const TOTAL = Math.round(UNIT * 3 * 1.18);

const signCheckout = (orderId, paymentId) =>
  crypto.createHmac("sha256", process.env.RAZORPAY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");

const signWebhook = (body) =>
  crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");

const createBooking = async (seats = ["A1", "A2", "A3"]) => {
  const res = await request(app).post("/api/bookings").send({ showId: SHOW_ID, seats });
  expect(res.status).toBe(201);
  return res.body;
};

afterAll(() => {
  const db = require("better-sqlite3")(process.env.DB_PATH);
  db.close();
});

describe("show catalogue", () => {
  it("lists shows with server-side prices", async () => {
    const res = await request(app).get("/api/shows");
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty("prices");
  });
});

describe("POST /api/bookings", () => {
  it("creates an order for the server-computed amount, ignoring any client amount", async () => {
    const body = await createBooking();
    expect(body.amount).toBe(TOTAL);
    expect(body.amount).not.toBe(100); // client-sent amounts are irrelevant
    expect(body.orderId).toMatch(/^order_test_/);
    expect(body.holdExpiresAt).toBeTruthy();
  });

  it("rejects an unknown showId", async () => {
    const res = await request(app).post("/api/bookings").send({ showId: "nope", seats: ["A1"] });
    expect(res.status).toBe(400);
  });

  it("rejects malformed seat labels", async () => {
    const res = await request(app).post("/api/bookings").send({ showId: SHOW_ID, seats: ["A1", "hax; DROP TABLE"] });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate seats in one request", async () => {
    const res = await request(app).post("/api/bookings").send({ showId: SHOW_ID, seats: ["A1", "A1"] });
    expect(res.status).toBe(400);
  });

  it("rejects premium when seatType is invalid", async () => {
    const res = await request(app).post("/api/bookings").send({ showId: SHOW_ID, seats: ["A1"], seatType: "gold" });
    expect(res.status).toBe(400);
  });

  it("computes premium pricing when seatType is premium", async () => {
    const unit = show.priceByType.premium;
    const res = await request(app).post("/api/bookings").send({ showId: SHOW_ID, seats: ["D1"], seatType: "premium" });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(Math.round(unit * 1.18));
  });
});

describe("seat holds (atomicity)", () => {
  it("blocks a second concurrent hold on the same seats with 409", async () => {
    const seats = ["E1", "E2"];
    const [r1, r2] = await Promise.all([
      request(app).post("/api/bookings").send({ showId: SHOW_ID, seats }),
      request(app).post("/api/bookings").send({ showId: SHOW_ID, seats }),
    ]);
    const codes = [r1.status, r2.status].sort();
    expect(codes).toEqual([201, 409]);
  });

  it("releases seats after cancel so they can be re-held", async () => {
    const b = await createBooking(["F1"]);
    const db = require("better-sqlite3")(process.env.DB_PATH);
    const row = db.prepare("SELECT id FROM bookings WHERE order_id = ?").get(b.orderId);
    const cancel = await request(app).post(`/api/bookings/${row.id}/cancel`).send();
    expect(cancel.status).toBe(200);
    const again = await request(app).post("/api/bookings").send({ showId: SHOW_ID, seats: ["F1"] });
    expect(again.status).toBe(201);
  });

  it("expires stale holds and frees the seats", async () => {
    await createBooking(["G1"]);
    // Fast-forward: mark the hold as already expired, then run the sweeper.
    const db = require("better-sqlite3")(process.env.DB_PATH);
    db.prepare("UPDATE seat_holds SET hold_until = ? WHERE seat = 'G1'").run(Date.now() - 1000);
    expect(expireStaleHolds()).toBeGreaterThan(0);
    const res = await request(app).post("/api/bookings").send({ showId: SHOW_ID, seats: ["G1"] });
    expect(res.status).toBe(201);
  });
});

describe("POST /api/bookings/:id/verify", () => {
  it("authorizes a valid signature and matching amount", async () => {
    const b = await createBooking(["H1", "H2"]);
    const paymentId = "pay_test_1";
    const sig = signCheckout(b.orderId, paymentId);
    const db = require("better-sqlite3")(process.env.DB_PATH);
    const row = db.prepare("SELECT id FROM bookings WHERE order_id = ?").get(b.orderId);

    const res = await request(app).post(`/api/bookings/${row.id}/verify`).send({
      razorpay_order_id: b.orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("payment_authorized");

    const updated = db.prepare("SELECT payment_signature_verified, status FROM bookings WHERE id = ?").get(row.id);
    expect(updated.payment_signature_verified).toBe(1);
    expect(updated.status).toBe("payment_authorized");
  });

  it("rejects a tampered signature", async () => {
    const b = await createBooking(["I1"]);
    const db = require("better-sqlite3")(process.env.DB_PATH);
    const row = db.prepare("SELECT id FROM bookings WHERE order_id = ?").get(b.orderId);
    const res = await request(app).post(`/api/bookings/${row.id}/verify`).send({
      razorpay_order_id: b.orderId,
      razorpay_payment_id: "pay_test_2",
      razorpay_signature: "deadbeef".repeat(8),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/signature/i);
  });

  it("rejects an order id mismatch", async () => {
    const b = await createBooking(["J1"]);
    const db = require("better-sqlite3")(process.env.DB_PATH);
    const row = db.prepare("SELECT id FROM bookings WHERE order_id = ?").get(b.orderId);
    const res = await request(app).post(`/api/bookings/${row.id}/verify`).send({
      razorpay_order_id: "order_other",
      razorpay_payment_id: "pay_test_3",
      razorpay_signature: signCheckout("order_other", "pay_test_3"),
    });
    expect(res.status).toBe(400);
  });

  it("rejects when the order amount does not match the server-computed bill", async () => {
    const b = await createBooking(["K1"]);
    const db = require("better-sqlite3")(process.env.DB_PATH);
    const row = db.prepare("SELECT id FROM bookings WHERE order_id = ?").get(b.orderId);
    // Simulate a mismatched order amount
    mockOrders.set(b.orderId, { id: b.orderId, amount: 100, currency: "INR" });
    const res = await request(app).post(`/api/bookings/${row.id}/verify`).send({
      razorpay_order_id: b.orderId,
      razorpay_payment_id: "pay_test_4",
      razorpay_signature: signCheckout(b.orderId, "pay_test_4"),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount mismatch/i);
  });
});

describe("POST /api/webhook", () => {
  const payload = (orderId) =>
    JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { order_id: orderId, id: "pay_wh_1" } } },
    });

  it("settles a booking on a valid payment.captured event", async () => {
    const b = await createBooking(["L1"]);
    const db = require("better-sqlite3")(process.env.DB_PATH);
    const raw = payload(b.orderId);
    const res = await request(app)
      .post("/api/webhook")
      .set("x-razorpay-signature", signWebhook(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(200);
    const row = db.prepare("SELECT status, webhook_verified FROM bookings WHERE order_id = ?").get(b.orderId);
    expect(row.status).toBe("payment_settled");
    expect(row.webhook_verified).toBe(1);
  });

  it("rejects an invalid webhook signature", async () => {
    const raw = payload("order_test_whatever");
    const res = await request(app)
      .post("/api/webhook")
      .set("x-razorpay-signature", "00".repeat(32))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(400);
  });

  it("ignores irrelevant events", async () => {
    const raw = JSON.stringify({ event: "refund.processed", payload: {} });
    const res = await request(app)
      .post("/api/webhook")
      .set("x-razorpay-signature", signWebhook(raw))
      .set("Content-Type", "application/json")
      .send(raw);
    expect(res.status).toBe(200);
    expect(res.body.ignored).toBe("refund.processed");
  });
});

describe("misc", () => {
  it("exposes /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("404s unknown routes as JSON", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });
});
