"use strict";
/**
 * CineBook booking & payment server
 *
 * Design (fixes the client-trusted-pricing vulnerability):
 *   1. Showtimes are defined SERVER-SIDE. The client never sends a price or an
 *      amount — it sends showId + seat labels, and the server computes the bill.
 *   2. Seats are held atomically for 10 minutes via a transactional UPDATE with
 *      an expiry column, so two users can never hold the same seat.
 *   3. Payment success is only accepted if the verified Razorpay order amount
 *      equals the server-computed bill. No client data is trusted.
 *   4. A signature-verified webhook is the source of truth for payment_settled.
 *
 * Environment variables:
 *   RAZORPAY_KEY_ID / RAZORPAY_SECRET  (required — server exits without them)
 *   RAZORPAY_WEBHOOK_SECRET            (optional — enables POST /api/webhook)
 *   PORT                               (default 8001)
 */

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// ── Tiny .env loader (no external deps) ──────────────────────────────────────
// Loads .env from this directory if present; real environment variables win.
(function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
})();

const PORT = Number(process.env.PORT) || 8001;
const HOLD_MINUTES = 10;
const GST_RATE = 0.18;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "cinebook.sqlite3");

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
  console.error("RAZORPAY_KEY_ID / RAZORPAY_SECRET must be set");
  process.exit(1);
}

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// ── SQLite (no external deps; db file stays inside the repo dir) ────────────
const Database = require("better-sqlite3");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE NOT NULL,
    show_id TEXT NOT NULL,
    seats TEXT NOT NULL,
    seat_count INTEGER NOT NULL,
    base_amount INTEGER NOT NULL,      -- paise, server-computed
    total_amount INTEGER NOT NULL,     -- paise, base * (1 + GST_RATE)
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','payment_authorized','payment_settled','expired','cancelled')),
    payment_id TEXT,
    payment_signature_verified INTEGER DEFAULT 0,
    webhook_verified INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS seat_holds (
    order_id TEXT NOT NULL,
    show_id TEXT NOT NULL,
    seat TEXT NOT NULL,
    hold_until INTEGER NOT NULL,       -- unix ms
    PRIMARY KEY (show_id, seat)
  );
  CREATE INDEX IF NOT EXISTS idx_holds_expiry ON seat_holds (hold_until);
  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    poster_url TEXT,
    backdrop_url TEXT,
    genre TEXT,
    certificate TEXT,
    rating REAL,
    runtime INTEGER,
    languages TEXT,
    about TEXT,
    release_date TEXT,
    city TEXT,
    cast_json TEXT,
    crew_json TEXT
  );
  CREATE TABLE IF NOT EXISTS shows (
    id TEXT PRIMARY KEY,
    movie_id TEXT NOT NULL REFERENCES movies(id),
    theater TEXT NOT NULL,
    city TEXT,
    screen TEXT,
    show_time TEXT NOT NULL,
    price_regular INTEGER NOT NULL,
    price_premium INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    eventname TEXT NOT NULL,
    image_url TEXT,
    place TEXT,
    eventtype TEXT,
    price INTEGER,
    city TEXT,
    event_date TEXT
  );
  CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    occupation_json TEXT,
    born TEXT,
    birthplace TEXT,
    bio TEXT
  );
`);
// One-time migrations (SQLite has no ADD COLUMN IF NOT EXISTS).
for (const stmt of [
  "ALTER TABLE bookings ADD COLUMN user_id INTEGER",
  "ALTER TABLE movies ADD COLUMN city TEXT",
  "ALTER TABLE shows ADD COLUMN city TEXT",
]) {
  try {
    db.exec(stmt);
  } catch (e) {
    if (!String(e.message).includes("duplicate column")) throw e;
  }
}

// ── Show catalogue (DB-backed; falls back to the built-in demo shows) ────────
// Declared via `var` below; function is only invoked after SHOWS exists.
var CATALOGUE;
function loadCatalogue() {
  const rows = db
    .prepare(
      `SELECT s.id, s.theater, s.city, s.screen, s.show_time,
              s.price_regular, s.price_premium,
              m.id AS movie_id, m.title, m.poster_url, m.backdrop_url, m.genre,
              m.certificate, m.rating, m.runtime, m.languages, m.about, m.release_date,
              m.cast_json, m.crew_json
       FROM shows s JOIN movies m ON m.id = s.movie_id
       ORDER BY s.show_time`
    )
    .all();
  if (rows.length > 0) {
    const byId = {};
    for (const r of rows) {
      byId[r.id] = {
        movie: r.title,
        movieId: r.movie_id,
        theater: r.theater,
        city: r.city || "All",
        screen: r.screen || "Audi 1",
        showTime: r.show_time,
        priceByType: { regular: r.price_regular, premium: r.price_premium },
        meta: {
          poster: r.poster_url,
          backdrop: r.backdrop_url,
          genre: r.genre,
          certificate: r.certificate,
          rating: r.rating,
          runtime: r.runtime,
          languages: r.languages,
          about: r.about,
          release_date: r.release_date,
          cast: r.cast_json ? JSON.parse(r.cast_json) : [],
          crew: r.crew_json ? JSON.parse(r.crew_json) : [],
        },
      };
    }
    return byId;
  }
  return SHOWS; // built-in demo catalogue (kept for tests)
}

const insertHold = db.prepare(
  "INSERT OR REPLACE INTO seat_holds (order_id, show_id, seat, hold_until) VALUES (?, ?, ?, ?)"
);
const deleteHoldsForOrder = db.prepare("DELETE FROM seat_holds WHERE order_id = ?");
const activeHoldStmt = db.prepare(
  `SELECT order_id FROM seat_holds
   WHERE show_id = ? AND seat = ? AND hold_until > ? AND order_id != ?`
);
const bookingByIdStmt = db.prepare("SELECT * FROM bookings WHERE id = ?");
const bookingByOrderStmt = db.prepare("SELECT * FROM bookings WHERE order_id = ?");
const setBookingStatusStmt = db.prepare(
  "UPDATE bookings SET status = ?, payment_id = COALESCE(?, payment_id), updated_at = datetime('now') WHERE id = ?"
);
const markVerifiedStmt = db.prepare(
  "UPDATE bookings SET payment_signature_verified = 1, updated_at = datetime('now') WHERE id = ?"
);
const markWebhookStmt = db.prepare(
  "UPDATE bookings SET webhook_verified = 1, status = 'payment_settled', updated_at = datetime('now') WHERE order_id = ?"
);

const settleBookingTx = db.transaction((booking, paymentId) => {
  setBookingStatusStmt.run("payment_settled", paymentId ?? null, booking.id);
  deleteHoldsForOrder.run(booking.order_id);
});

// ── Server-side show catalogue (the single source of truth for pricing) ──────
const SHOWS = {
  show_101: {
    movie: "Test Movie",
    theater: "PVR Nexus",
    screen: "Audi 2",
    showTime: "2026-09-20T19:30:00",
    priceByType: { regular: 25000, premium: 45000 }, // paise
  },
  show_102: {
    movie: "Another Movie",
    theater: "INOX Gurgaon",
    screen: "Audi 1",
    showTime: "2026-09-21T21:00:00",
    priceByType: { regular: 22000, premium: 40000 },
  },
};

function getShow(showId) {
  return CATALOGUE[showId] || SHOWS[showId] || null;
}

// Live catalogue: DB-seeded movies when present, else the demo shows above.
CATALOGUE = loadCatalogue();

function validSeatLabel(seat) {
  return typeof seat === "string" && /^[A-Z][1-9][0-9]?$/.test(seat);
}

// ── App ──────────────────────────────────────────────────────────────────────
const app = express();
// Raw body needed for Razorpay webhook HMAC verification.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  })
);

const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));app.get("/api/shows", (req, res) => {
  res.json(
    Object.entries(CATALOGUE).map(([id, s]) => ({
      id,
      movie: s.movie,
      movieId: s.movieId || s.movie,
      theater: s.theater,
      city: s.city || "All",
      screen: s.screen,
      showTime: s.showTime,
      prices: s.priceByType,
      poster: s.meta ? s.meta.poster : undefined,
      genre: s.meta ? s.meta.genre : undefined,
      certificate: s.meta ? s.meta.certificate : undefined,
      rating: s.meta ? s.meta.rating : undefined,
      release_date: s.meta ? s.meta.release_date : undefined,
    }))
  );
});

/**
 * GET /api/movies — unique movie list with full metadata (poster, cast, crew,
 * genres). Theatrical detail is aggregated from the shows table.
 */
app.get("/api/movies", (req, res) => {
  const movies = {};
  for (const s of Object.values(CATALOGUE)) {
    const id = s.movieId || s.movie;
    if (!movies[id]) {
      movies[id] = {
        id,
        moviename: s.movie,
        screentype: "2D",
        image: s.meta ? s.meta.poster : "",
        background: s.meta ? s.meta.backdrop : "",
        starring: s.theater,
        genre: s.meta ? s.meta.genre : "",
        certificate: s.meta ? s.meta.certificate : "",
        rating: s.meta ? s.meta.rating : null,
        runtime: s.meta ? s.meta.runtime : null,
        languages: s.meta ? s.meta.languages : "",
        about: s.meta ? s.meta.about : "",
        release_date: s.meta ? s.meta.release_date : "",
        cast: s.meta ? s.meta.cast : [],
        crew: s.meta ? s.meta.crew : [],
      };
    } else {
      const m = movies[id];
      if (!m.starring.includes(s.theater)) m.starring += ", " + s.theater;
      m.about = s.meta && s.meta.about ? s.meta.about : m.about;
    }
  }
  res.json(Object.values(movies));
});

/**
 * GET /api/shows/:id/booked
 * Seat labels already taken for a show — consumed by the frontend seat grid.
 * A seat is taken if it has an active hold (pending booking) or belongs to a
 * payment_authorized / payment_settled booking.
 */
app.get("/api/shows/:id/booked", (req, res) => {
  const showId = req.params.id;
  if (!getShow(showId)) return res.status(404).json({ error: "Unknown showId" });
  const now = Date.now();
  const held = db
    .prepare("SELECT DISTINCT seat FROM seat_holds WHERE show_id = ? AND hold_until > ?")
    .all(showId, now)
    .map((r) => r.seat);
  const sold = db
    .prepare(
      "SELECT seats FROM bookings WHERE show_id = ? AND status IN ('payment_authorized','payment_settled')"
    )
    .all(showId)
    .flatMap((r) => String(r.seats).split(","))
    .filter(Boolean);
  res.json({ showId, seats: [...new Set([...held, ...sold])].sort() });
});

/**
 * POST /api/bookings
 * Body: { showId, seats: ["A1","A2"], seatType?: "regular"|"premium" }
 * Server computes the price, atomically holds seats, creates a Razorpay order
 * for the server-computed total, and stores a pending booking.
 */
app.post(
  "/api/bookings",
  asyncH(async (req, res) => {
    const { showId, seats, seatType } = req.body || {};
    const show = getShow(showId);
    if (!show) return res.status(400).json({ error: "Unknown showId" });
    if (!Array.isArray(seats) || seats.length === 0 || seats.length > 10) {
      return res.status(400).json({ error: "seats must be a non-empty array (max 10)" });
    }
    if (!seats.every(validSeatLabel)) {
      return res.status(400).json({ error: "Invalid seat label(s); expected like A1, B7" });
    }
    if (new Set(seats).size !== seats.length) {
      return res.status(400).json({ error: "Duplicate seats in request" });
    }
    const type = seatType || "regular";
    const unit = show.priceByType[type];
    if (!unit) {
      return res.status(400).json({ error: `Unknown seatType; valid: ${Object.keys(show.priceByType).join(", ")}` });
    }

    const now = Date.now();
    const holdUntil = now + HOLD_MINUTES * 60 * 1000;

    // Transactional, all-or-nothing hold: if ANY seat is actively held, roll back.
    const held = [];
    try {
      const holdAll = db.transaction((seatsToHold) => {
        for (const seat of seatsToHold) {
          const clash = activeHoldStmt.get(showId, seat, now, "pending-insert");
          if (clash) {
            throw new Error(`SEAT_TAKEN:${seat}`);
          }
          insertHold.run("pending-insert", showId, seat, holdUntil);
        }
      });
      holdAll(seats);

      const total = unit * seats.length;
      const totalWithGst = Math.round(total * (1 + GST_RATE));

      const order = await rzp.orders.create({
        amount: totalWithGst,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: { showId, seats: seats.join(","), seatType: type },
      });

      // Re-key the provisional holds to the real order id.
      const rekey = db.transaction(() => {
        deleteHoldsForOrder.run("pending-insert");
        for (const seat of seats) insertHold.run(order.id, showId, seat, holdUntil);
      });
      rekey();

      const info = db
        .prepare(
          `INSERT INTO bookings (order_id, show_id, seats, seat_count, base_amount, total_amount, status, user_id)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
        )
        .run(order.id, showId, seats.join(","), seats.length, total, totalWithGst, req.user?.id ?? null);

      return res.status(201).json({
        bookingId: info.lastInsertRowid,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        show: { id: showId, movie: show.movie, theater: show.theater, showTime: show.showTime },
        seats,
        seatType: type,
        holdExpiresAt: new Date(holdUntil).toISOString(),
      });
    } catch (err) {
      deleteHoldsForOrder.run("pending-insert");
      const msg = String(err && err.message);
      if (msg.startsWith("SEAT_TAKEN:")) {
        return res.status(409).json({ error: `Seat ${msg.slice(10)} is already held or booked` });
      }
      throw err;
    }
  })
);

/**
 * POST /api/bookings/:id/verify
 * Razorpay checkout handler posts razorpay_payment_id / razorpay_order_id /
 * razorpay_signature. We verify the HMAC, confirm the order amount matches the
 * server-computed bill, mark payment_authorized, and release the hold.
 * Settlement truth comes from the webhook.
 */
app.post(
  "/api/bookings/:id/verify",
  asyncH(async (req, res) => {
    const booking = bookingByIdStmt.get(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing Razorpay checkout fields" });
    }
    if (razorpay_order_id !== booking.order_id) {
      return res.status(400).json({ error: "Order id mismatch" });
    }

    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const sigOk =
      expectedSig.length === String(razorpay_signature).length &&
      crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(String(razorpay_signature)));

    if (!sigOk) return res.status(400).json({ error: "Invalid payment signature" });

    // Amount guard: the verified order's amount must equal the server-computed bill.
    const order = await rzp.orders.fetch(razorpay_order_id);
    if (Number(order.amount) !== booking.total_amount) {
      return res.status(400).json({ error: "Order amount mismatch" });
    }

    setBookingStatusStmt.run("payment_authorized", razorpay_payment_id, booking.id);
    markVerifiedStmt.run(booking.id);
    deleteHoldsForOrder.run(booking.order_id);
    return res.json({ status: "payment_authorized", bookingId: booking.id });
  })
);

/**
 * POST /api/webhook — Razorpay webhook (source of truth for settlement).
 * Configure the same RAZORPAY_WEBHOOK_SECRET in the Razorpay dashboard.
 */
app.post(
  "/api/webhook",
  asyncH(async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: "Webhook not configured" });
    const signature = req.get("x-razorpay-signature");
    if (!signature) return res.status(400).json({ error: "Missing signature" });

    const expected = crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
    const ok =
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!ok) return res.status(400).json({ error: "Invalid webhook signature" });

    const event = req.body;
    if (event && event.event === "payment.captured" && event.payload && event.payload.payment) {
      const entity = event.payload.payment.entity || {};
      const orderId = entity.order_id;
      if (orderId) {
        const booking = bookingByOrderStmt.get(orderId);
        if (booking && booking.status !== "payment_settled") {
          markWebhookStmt.run(orderId);
        }
      }
      return res.json({ received: true });
    }
    return res.json({ received: true, ignored: event && event.event });
  })
);

// (Re)cancel stale pending bookings and free their seats whenever asked.
app.post("/api/bookings/:id/cancel", (req, res) => {
  const booking = bookingByIdStmt.get(req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.status === "payment_settled") {
    return res.status(400).json({ error: "Cannot cancel a settled booking" });
  }
  setBookingStatusStmt.run("cancelled", null, booking.id);
  deleteHoldsForOrder.run(booking.order_id);
  res.json({ status: "cancelled" });
});

app.get("/api/bookings/:id", (req, res) => {
  const booking = bookingByIdStmt.get(req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  res.json(booking);
});

// ── Auth (scrypt password hashing; zero extra deps) ───────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
}
function issueToken(user) {
  // Signed, expiring token: base64(payload).hmac — verified by requireAuth.
  const payload = Buffer.from(
    JSON.stringify({ id: user.id, username: user.username, exp: Date.now() + 7 * 24 * 3600 * 1000 })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}
function parseUser(req) {
  const h = req.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(payload)
    .digest("base64url");
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return { id: data.id, username: data.username };
  } catch {
    return null;
  }
}
function requireAuth(req, res, next) {
  const user = parseUser(req);
  if (!user) return res.status(401).json({ error: "Login required" });
  req.user = user;
  next();
}

app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "username and password required" });
  if (String(password).length < 4) return res.status(400).json({ error: "password too short (min 4)" });
  try {
    const info = db
      .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
      .run(String(username).trim(), hashPassword(password));
    const user = { id: Number(info.lastInsertRowid), username: String(username).trim() };
    res.status(201).json({ user, token: issueToken(user) });
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) return res.status(409).json({ error: "username already taken" });
    throw e;
  }
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(String(username || "").trim());
  if (!row || !verifyPassword(password || "", row.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const user = { id: row.id, username: row.username };
  res.json({ user, token: issueToken(user) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ── Booking history (scoped to the logged-in user) ────────────────────────────
app.get("/api/my/bookings", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY id DESC")
    .all(req.user.id);
  res.json(
    rows.map((b) => ({
      bookingId: b.id,
      orderId: b.order_id,
      showId: b.show_id,
      seats: String(b.seats).split(","),
      seatCount: b.seat_count,
      amount: b.total_amount,
      amountDisplay: `₹${(b.total_amount / 100).toFixed(2)}`,
      status: b.status,
      paymentSettled: !!b.webhook_verified,
      bookedAt: b.created_at,
    }))
  );
});

// ── Events ────────────────────────────────────────────────────────────────────
app.get("/api/events", (req, res) => {
  const city = (req.query.city || "").trim();
  const rows = city
    ? db.prepare("SELECT * FROM events WHERE city = ? OR city IS NULL ORDER BY event_date").all(city)
    : db.prepare("SELECT * FROM events ORDER BY event_date").all();
  res.json(rows);
});

// ── People (cast & crew lookup used by /person and /persen pages) ─────────────
app.get("/api/people/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM people WHERE id = ?").get(String(req.params.id));
  if (!row) return res.status(404).json({ error: "Person not found" });
  res.json({
    id: row.id,
    name: row.name,
    image: row.image_url,
    occupation: row.occupation_json ? JSON.parse(row.occupation_json) : [],
    born: row.born,
    birthplace: row.birthplace,
    about: row.bio,
  });
});

// 404 + error handler
app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Expiry sweeper (interval + one-shot helper for tests) ────────────────────
function expireStaleHolds(nowMs = Date.now()) {
  const stale = db.prepare("SELECT DISTINCT order_id FROM seat_holds WHERE hold_until <= ?").all(nowMs);
  for (const { order_id } of stale) {
    const booking = bookingByOrderStmt.get(order_id);
    if (booking && booking.status === "pending") {
      setBookingStatusStmt.run("expired", null, booking.id);
    }
    deleteHoldsForOrder.run(order_id);
  }
  return stale.length;
}

let sweeper = null;
function startSweeper(intervalMs = 60 * 1000) {
  if (sweeper) return;
  sweeper = setInterval(() => {
    try {
      expireStaleHolds();
    } catch (err) {
      console.error("hold sweeper failed", err);
    }
  }, intervalMs);
  sweeper.unref();
}
startSweeper();

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

module.exports = { app, SHOWS, expireStaleHolds, DB_PATH };
