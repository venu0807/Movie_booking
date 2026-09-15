"use strict";
/**
 * Seed the CineBook SQLite database with a real movie catalogue.
 *
 * Source: the Recommendation_System Django backend (localhost:8000) which
 * proxies TMDB. If it is unreachable, falls back to a small built-in list so
 * the server always has bookable shows.
 *
 * Run: node seed.js [--force]
 *   --force  replace existing catalogue instead of skipping seeded movies
 */
const path = require("path");
const fs = require("fs");

// ── .env loader (same semantics as server.js) ────────────────────────────────
(function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
})();

const Database = require("better-sqlite3");
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "cinebook.sqlite3");
const RECSYS_BASE = process.env.RECSYS_API_URL || "http://127.0.0.1:8000";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const FORCE = process.argv.includes("--force");

// ── Theatres & pricing (paise) ───────────────────────────────────────────────
// City names match the frontend city dropdown (menubar.js).
const THEATERS = [
  { name: "PVR Nexus", screen: "Audi 2", city: "Bengalore", regular: 25000, premium: 45000 },
  { name: "INOX Gurgaon", screen: "Audi 1", city: "Hyderabad", regular: 22000, premium: 40000 },
  { name: "Cinepolis Mumbai", screen: "Audi 3", city: "Mumbai", regular: 20000, premium: 38000 },
];
const SHOW_HOURS = ["10:30", "13:45", "17:15", "19:30", "22:45"];
const SHOW_DAYS = 5; // today .. +4

const LANG_FULL = {
  en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada",
  ml: "Malayalam", mr: "Marathi", ja: "Japanese", ko: "Korean", fr: "French",
  es: "Spanish", de: "German", it: "Italian", pt: "Portuguese", zh: "Chinese",
};

const EVENTS = [
  { id: "ev_comedy_nite", eventname: "Comedy Nite Live", place: "Good Shepherd Auditorium", eventtype: "Stand up Comedy", price: 799, city: "Bengalore", event_date: 0 },
  { id: "ev_sunburn", eventname: "Sunburn Arena", place: "NICE Grounds", eventtype: "Concert", price: 2500, city: "Bengalore", event_date: 3 },
  { id: "ev_symphony", eventname: "Symphony Nights", place: "Hyderabad Convention Centre", eventtype: "Concert", price: 1500, city: "Hyderabad", event_date: 1 },
  { id: "ev_kids_workshop", eventname: "Kids Art Workshop", place: "Jawahar Kala Kendra", eventtype: "Kids", price: 499, city: "Hyderabad", event_date: 2 },
  { id: "ev_marathon", eventname: "City Marathon Expo", place: "Mumbai Race Course", eventtype: "Activities", price: 999, city: "Mumbai", event_date: 4 },
  { id: "ev_edtech", eventname: "Startup Summit 2026", place: "Bengaluru Tech Park", eventtype: "Education", price: 1999, city: "Bengalore", event_date: 5 },
];

const CERTIFICATE_BY_GENRE = {
  Horror: "A", Thriller: "UA", Action: "UA", Adventure: "UA", Drama: "UA",
  Comedy: "UA", Romance: "UA", Family: "U", Animation: "U", Fantasy: "UA",
  Science: "UA", Crime: "A", Mystery: "UA", History: "UA", War: "UA", Music: "U",
};

// ── Fetch real movies (TMDB via the Recommendation_System proxy) ─────────────
async function fetchRealMovies() {
  const endpoints = ["popular", "now_playing", "top_rated", "upcoming"];
  const byTmdbId = new Map();
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${RECSYS_BASE}/movie/${ep}/`);
      if (!res.ok) { console.error(`  ! ${ep}: HTTP ${res.status}`); continue; }
      const list = await res.json();
      if (!Array.isArray(list)) { console.error(`  ! ${ep}: unexpected payload`); continue; }
      for (const m of list) {
        if (m.tmdb_id && m.title && !byTmdbId.has(m.tmdb_id)) byTmdbId.set(m.tmdb_id, m);
      }
      console.log(`  ✔ ${ep}: ${list.length} movies`);
    } catch (e) {
      console.error(`  ! ${ep}: ${e.message}`);
    }
  }
  return [...byTmdbId.values()];
}

function toCatalogueMovie(m) {
  const genres = (m.genres || []).map((g) => g.name).join(", ");
  const cert =
    (m.genres || []).map((g) => CERTIFICATE_BY_GENRE[g.name]).find(Boolean) || "UA";
  const cast = (m.cast || []).slice(0, 10).map((c) => ({
    id: c.id,
    actor_name: c.name || c.original_name,
    actor_image: c.profile_path ? `${TMDB_IMG}/w185${c.profile_path}` : null,
    role_name: c.character || "Cast",
  }));
  const crew = (m.crew || [])
    .filter((c) => ["Director", "Producer", "Music", "Screenplay", "Story"].includes(c.job))
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      crew_member_name: c.name || c.original_name,
      crew_member_image: c.profile_path ? `${TMDB_IMG}/w185${c.profile_path}` : null,
      occupation: [c.job],
    }));
  return {
    id: `tmdb_${m.tmdb_id}`,
    title: m.title,
    poster_url: m.poster_path ? `${TMDB_IMG}/w500${m.poster_path}` : null,
    backdrop_url: m.backdrop_path ? `${TMDB_IMG}/w1280${m.backdrop_path}` : null,
    genre: genres || "Movies",
    certificate: cert,
    rating: m.vote_average ? Number(m.vote_average) : null,
    runtime: m.runtime || null,
    languages: LANG_FULL[(m.original_language || "").toLowerCase()] || (m.original_language || "").toUpperCase(),
    about: m.overview || "",
    release_date: m.release_date || null,
    cast_json: JSON.stringify(cast),
    crew_json: JSON.stringify(crew),
  };
}

// ── Fallback catalogue (works fully offline) ─────────────────────────────────
const FALLBACK = [
  {
    id: "demo_1",
    title: "Test Movie",
    poster_url: null, backdrop_url: null,
    genre: "Action, Thriller", certificate: "UA", rating: 7.8, runtime: 128,
    languages: "English", about: "The classic CineBook demo feature.", release_date: "2026-09-20",
    cast_json: JSON.stringify([{ id: 1, actor_name: "Demo Actor", actor_image: null, role_name: "Lead" }]),
    crew_json: JSON.stringify([{ id: 2, crew_member_name: "Demo Director", crew_member_image: null, occupation: ["Director"] }]),
  },
  {
    id: "demo_2",
    title: "Another Movie",
    poster_url: null, backdrop_url: null,
    genre: "Comedy, Drama", certificate: "U", rating: 7.1, runtime: 112,
    languages: "English", about: "The second CineBook demo feature.", release_date: "2026-09-21",
    cast_json: "[]", crew_json: "[]",
  },
];

// ── Seed ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`Seeding ${DB_PATH}${FORCE ? " (--force)" : ""}`);
  console.log(`Fetching movies from ${RECSYS_BASE} …`);

  let real = await fetchRealMovies();
  let source = "tmdb";
  if (real.length === 0) {
    console.log("  No TMDB data reachable — using fallback demo movies.");
    real = FALLBACK.map((f) => ({ ...f }));
    source = "fallback";
  }
  const movies = real.slice(0, 20).map(toCatalogueMovie);
  console.log(`→ ${movies.length} movies (${source})`);

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='movies'")
    .get();
  if (!exists) {
    console.error("movies table missing — start the server once to create the schema, then seed.");
    process.exit(1);
  }

  const insertEvent = db.prepare(`
    INSERT INTO events (id, eventname, image_url, place, eventtype, price, city, event_date)
    VALUES (@id, @eventname, @image_url, @place, @eventtype, @price, @city, @event_date)
    ON CONFLICT(id) DO UPDATE SET
      eventname=excluded.eventname, image_url=excluded.image_url, place=excluded.place,
      eventtype=excluded.eventtype, price=excluded.price, city=excluded.city, event_date=excluded.event_date
  `);
  const insertPeople = db.prepare(`
    INSERT INTO people (id, name, image_url, occupation_json, born, birthplace, bio)
    VALUES (@id, @name, @image_url, @occupation_json, @born, @birthplace, @bio)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, image_url=excluded.image_url,
      occupation_json=excluded.occupation_json
  `);
  const insertMovie = db.prepare(`
    INSERT INTO movies (id, title, poster_url, backdrop_url, genre, certificate, rating,
                        runtime, languages, about, release_date, cast_json, crew_json)
    VALUES (@id, @title, @poster_url, @backdrop_url, @genre, @certificate, @rating,
            @runtime, @languages, @about, @release_date, @cast_json, @crew_json)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, poster_url=excluded.poster_url, backdrop_url=excluded.backdrop_url,
      genre=excluded.genre, certificate=excluded.certificate, rating=excluded.rating,
      runtime=excluded.runtime, languages=excluded.languages, about=excluded.about,
      release_date=excluded.release_date, cast_json=excluded.cast_json, crew_json=excluded.crew_json
  `);
  const deleteShowsFor = db.prepare("DELETE FROM shows WHERE movie_id = ?");
  const insertShow = db.prepare(`
    INSERT INTO shows (id, movie_id, theater, city, screen, show_time, price_regular, price_premium)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    if (FORCE) {
      db.prepare("DELETE FROM shows").run();
      db.prepare("DELETE FROM movies").run();
    }
    let showCount = 0;
    const today = new Date();
    movies.forEach((movie, mi) => {
      insertMovie.run(movie);
      deleteShowsFor.run(movie.id);
      // Give each movie 1–2 theaters and a couple of showtimes across 5 days.
      const t1 = THEATERS[mi % THEATERS.length];
      const t2 = THEATERS[(mi + 1) % THEATERS.length];
      const theaters = mi % 3 === 0 ? [t1, t2] : [t1];
      for (const t of theaters) {
        for (let d = 0; d < SHOW_DAYS; d++) {
          const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
          // Local-date string (NOT toISOString — that shifts the day in IST).
          const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
          const hours = SHOW_HOURS.slice(mi % 2, (mi % 2) + 3); // 3 slots per day
          for (const hhmm of hours) {
            const iso = `${dayStr}T${hhmm}:00`;
            const showId = `s_${movie.id}_${t.name.replace(/\W+/g, "").toLowerCase()}_${d}_${hhmm.replace(":", "")}`;
            insertShow.run(showId, movie.id, t.name, t.city, t.screen, iso, t.regular, t.premium);
            showCount++;
          }
        }
      }
    });
    return showCount;
  });

  // Keep the legacy show_101/show_102 demo shows so old tests & links work.
  const keepLegacy = db.transaction(() => {
    const has = db.prepare("SELECT id FROM movies WHERE id = 'demo_1'").get();
    if (!has && movies.length > 0) {
      insertMovie.run(FALLBACK[0]);
      insertShow.run("show_101", "demo_1", "PVR Nexus", "Bengalore", "Audi 2", "2026-09-20T19:30:00", 25000, 45000);
    }
  });

  // Events + people (cast/crew) so the Events & person pages work.
  const seedExtras = db.transaction(() => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('events','people')")
      .all()
      .map((r) => r.name);
    if (tables.includes("events")) {
      for (const ev of EVENTS) {
        const d = new Date();
        d.setDate(d.getDate() + ev.event_date);
        insertEvent.run({
          ...ev,
          image_url: null,
          event_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        });
      }
    }
    if (tables.includes("people")) {
      const seen = new Set();
      for (const m of movies) {
        for (const c of JSON.parse(m.cast_json || "[]")) {
          if (!c.id || seen.has(`c${c.id}`)) continue;
          seen.add(`c${c.id}`);
          insertPeople.run({
            id: `c${c.id}`, name: c.actor_name, image_url: c.actor_image,
            occupation_json: JSON.stringify(["Actor"]), born: null, birthplace: null, bio: null,
          });
        }
        for (const c of JSON.parse(m.crew_json || "[]")) {
          if (!c.id || seen.has(`k${c.id}`)) continue;
          seen.add(`k${c.id}`);
          insertPeople.run({
            id: `k${c.id}`, name: c.crew_member_name, image_url: c.crew_member_image,
            occupation_json: JSON.stringify(c.occupation || []), born: null, birthplace: null, bio: null,
          });
        }
      }
    }
  });

  const showCount = seedAll();
  keepLegacy();
  seedExtras();
  const totals = {
    movies: db.prepare("SELECT COUNT(*) n FROM movies").get().n,
    shows: db.prepare("SELECT COUNT(*) n FROM shows").get().n,
    events: db.prepare("SELECT COUNT(*) n FROM events").get().n,
    people: db.prepare("SELECT COUNT(*) n FROM people").get().n,
  };
  db.close();

  console.log(`✔ Inserted/updated ${movies.length} movies, ${showCount} new shows`);
  console.log(`✔ DB now has ${totals.movies} movies, ${totals.shows} shows, ${totals.events} events, ${totals.people} people`);
  console.log("Restart the CineBook server to load the new catalogue.");
})().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
