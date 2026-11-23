"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { rowsFromWorkbook, rosterWorkbook } = require("./lib/sheet");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = "127.0.0.1";
const DATA = path.join(ROOT, "data");
const AUTH_FILE = path.join(DATA, "admin-auth.json");
const SETTINGS_FILE = path.join(DATA, "site-settings.json");
const PLAYERS_FILE = path.join(DATA, "players.json");
const ROSTER_FILE = path.join(DATA, "roster.json");
const PHOTO_DIR = path.join(DATA, "player-photos");
const TEMPLATE_FILE = path.join(DATA, "roster-template.xlsx");
const EVENTS_FILE = path.join(DATA, "events.json");
const TELEMETRY_FILE = path.join(DATA, "telemetry.json");
const SESSION_MS = 8 * 60 * 60 * 1000;
const IDLE_MS = 30 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const SCRYPT = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const PAGE_IDS = ["inicio", "sedes", "plantilla", "nosotras", "patrocinadores", "beneficios", "tienda"];
const LABELS = {
  inicio: "Inicio",
  sedes: "Sedes",
  plantilla: "Plantilla",
  nosotras: "Nosotras",
  patrocinadores: "Patrocinadores",
  beneficios: "Beneficios",
  tienda: "Tienda"
};
const PUBLIC_PAGES = {
  "/": "inicio",
  "/index.html": "inicio",
  "/sedes": "sedes",
  "/sedes.html": "sedes",
  "/plantilla": "plantilla",
  "/plantilla.html": "plantilla",
  "/nosotras": "nosotras",
  "/nosotras.html": "nosotras",
  "/patrocinadores": "patrocinadores",
  "/patrocinadores.html": "patrocinadores",
  "/beneficios": "beneficios",
  "/beneficios.html": "beneficios",
  "/tienda": "tienda",
  "/tienda.html": "tienda"
};
const FILES = {
  "/": "index.html",
  "/sedes": "sedes.html",
  "/plantilla": "plantilla.html",
  "/nosotras": "nosotras.html",
  "/patrocinadores": "patrocinadores.html",
  "/beneficios": "beneficios.html",
  "/tienda": "tienda.html",
  "/GFCCaliAdmin": "GFCCaliAdmin.html"
};
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2"
};
const POSITIONS = ["POR", "DEF", "CEN", "DEL"];
const ASSET = /^assets\/plantilla\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i;
const ID = /^[a-zA-Z0-9_-]{1,40}$/;
const PHOTO_NAME = /^[a-f0-9]{16}\.(jpg|png|webp)$/;
const STATUSES = ["active", "suspended", "pending", "late"];

const sessions = new Map();
const loginAttempts = new Map();
let settingsCache = null;

const DUMMY_SALT = crypto.randomBytes(16);
const DUMMY_HASH = crypto.scryptSync("contrasena-de-relleno", DUMMY_SALT, 32, SCRYPT);

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(file, data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

function scryptKey(password, salt, params) {
  return new Promise(function (resolve, reject) {
    crypto.scrypt(password, salt, 32, {
      N: params.N || params.n,
      r: params.r,
      p: params.p,
      maxmem: SCRYPT.maxmem
    }, function (error, key) {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function ensureAuth() {
  fs.mkdirSync(DATA, { recursive: true });
  if (fs.existsSync(AUTH_FILE)) return readJson(AUTH_FILE, null);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 18; i += 1) password += alphabet[crypto.randomInt(alphabet.length)];
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32, SCRYPT);
  const record = {
    username: "admin",
    salt: salt.toString("hex"),
    hash: hash.toString("hex"),
    n: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p
  };
  writeJson(AUTH_FILE, record);
  console.log("GFC admin listo. Usuario: admin  Contraseña: " + password);
  console.log("Guarda la contraseña. No se volverá a mostrar.");
  return record;
}

let authRecord = ensureAuth();

function defaultSettings() {
  const pages = {};
  PAGE_IDS.forEach(function (id) { pages[id] = { visible: true }; });
  return { pages: pages };
}

function readSettings() {
  if (!settingsCache) {
    const stored = readJson(SETTINGS_FILE, null);
    settingsCache = stored && stored.pages ? stored : defaultSettings();
    PAGE_IDS.forEach(function (id) {
      if (!settingsCache.pages[id]) settingsCache.pages[id] = { visible: true };
    });
    settingsCache.pages.inicio.visible = true;
  }
  return settingsCache;
}

function clientIp(req) {
  const raw = req.socket.remoteAddress || "";
  return raw.replace(/^::ffff:/, "");
}

function cookies(req) {
  const out = {};
  String(req.headers.cookie || "").split(";").forEach(function (part) {
    const index = part.indexOf("=");
    if (index === -1) return;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  });
  return out;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || origin === "null") return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch (error) {
    return false;
  }
}

function sessionCookie(id, req, clear) {
  const secure = req.socket.encrypted ? "; Secure" : "";
  const age = clear ? 0 : Math.floor(SESSION_MS / 1000);
  return "gfc_session=" + (clear ? "" : id) + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + age + secure;
}

function getSession(req) {
  const id = cookies(req).gfc_session;
  if (!id || !sessions.has(id)) return null;
  const session = sessions.get(id);
  const now = Date.now();
  if (now - session.created > SESSION_MS || now - session.seen > IDLE_MS) {
    sessions.delete(id);
    return null;
  }
  session.seen = now;
  return session;
}

function csrfOk(req, session) {
  const sent = String(req.headers["x-csrf-token"] || "");
  const a = Buffer.from(sent);
  const b = Buffer.from(session.csrf);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function locked(ip) {
  const bucket = loginAttempts.get(ip);
  if (!bucket) return false;
  if (bucket.until && bucket.until > Date.now()) return true;
  if (bucket.until && bucket.until <= Date.now()) loginAttempts.delete(ip);
  return false;
}

function markFailure(ip) {
  const now = Date.now();
  const bucket = loginAttempts.get(ip) || { fails: 0, until: 0 };
  bucket.fails += 1;
  if (bucket.fails >= MAX_FAILS) {
    bucket.until = now + LOCK_MS;
    bucket.fails = 0;
  }
  loginAttempts.set(ip, bucket);
}

function baseHeaders(extra) {
  return Object.assign({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store"
  }, extra || {});
}

function sendJson(res, status, body, extra) {
  const payload = JSON.stringify(body);
  res.writeHead(status, baseHeaders(Object.assign({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload)
  }, extra)));
  res.end(payload);
}

function sendHtml(res, status, html, extra) {
  const payload = Buffer.from(html);
  res.writeHead(status, baseHeaders(Object.assign({
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": payload.length,
    "X-Robots-Tag": "noindex, nofollow"
  }, extra)));
  res.end(payload);
}

function unavailablePage() {
  return "<!DOCTYPE html><html lang=\"es-CO\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex\"><title>Sección no disponible | Guerreras FC</title><link rel=\"stylesheet\" href=\"css/styles.css\"></head><body><main class=\"section\"><div class=\"wrap\"><p class=\"index\">Guerreras FC</p><h1>Esta sección no está disponible</h1><p>El club ocultó esta parte del sitio.</p><p><a class=\"btn\" href=\"index.html\">Volver al inicio</a></p></div></main></body></html>";
}

function readBody(req, limit) {
  const max = limit || 100000;
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on("data", function (chunk) {
      size += chunk.length;
      if (size > max) {
        const error = new Error("too large");
        error.status = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", function () {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        const data = JSON.parse(raw);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          const error = new Error("bad json");
          error.status = 400;
          reject(error);
          return;
        }
        resolve(data);
      } catch (error) {
        error.status = 400;
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function cleanText(value, max) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return date.getUTCFullYear() === parts[0] && date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2];
}

function cleanDate(value) {
  const text = cleanText(value, 10);
  return validDate(text) ? text : "";
}

function uploadDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

function cleanStatus(value) {
  const text = cleanText(value, 20);
  return STATUSES.includes(text) ? text : "active";
}

function cleanNotes(value) {
  const allowed = { b: 1, strong: 1, i: 1, em: 1, u: 1, p: 1, br: 1, ul: 1, ol: 1, li: 1, div: 1 };
  let html = String(value == null ? "" : value).replace(/\0/g, "").slice(0, 24000);
  html = html.replace(/<\s*(script|style|iframe|object)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/<[^>]+>/g, function (tag) {
    const match = /^<\s*(\/)?\s*([a-z0-9]+)/i.exec(tag);
    if (!match) return "";
    const name = match[2].toLowerCase();
    if (!allowed[name]) return "";
    if (name === "br") return "<br>";
    return match[1] ? "</" + name + ">" : "<" + name + ">";
  });
  return html.trim();
}

function cleanPhotos(value) {
  if (!Array.isArray(value)) return [];
  const names = [];
  value.forEach(function (item) {
    const name = cleanText(item, 24);
    if (PHOTO_NAME.test(name) && names.indexOf(name) === -1) names.push(name);
  });
  return names.slice(0, 5);
}

function playerPhotoDir(id) {
  if (!ID.test(id)) return null;
  const dir = path.resolve(PHOTO_DIR, id);
  const relative = path.relative(PHOTO_DIR, dir);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return dir;
}

function imageKind(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer.toString("ascii", 1, 4) === "PNG") return "png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  return "";
}

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(function (entry) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) removeDir(full);
    else fs.unlinkSync(full);
  });
  fs.rmdirSync(dir);
}

function syncRosterPhotos(players) {
  const keep = {};
  players.forEach(function (player) {
    keep[player.id] = {};
    player.photos.forEach(function (name) { keep[player.id][name] = true; });
  });
  if (!fs.existsSync(PHOTO_DIR)) return;
  fs.readdirSync(PHOTO_DIR).forEach(function (entry) {
    const dir = playerPhotoDir(entry);
    if (!dir || !fs.statSync(dir).isDirectory()) return;
    if (!keep[entry]) {
      removeDir(dir);
      return;
    }
    fs.readdirSync(dir).forEach(function (file) {
      if (!keep[entry][file]) fs.unlinkSync(path.join(dir, file));
    });
  });
}

function validPlayers(list) {
  if (!Array.isArray(list) || list.length > 60) return null;
  const ids = new Set();
  const players = [];
  for (const item of list) {
    if (!item || typeof item !== "object") return null;
    const name = cleanText(item.name, 40);
    const id = cleanText(item.id, 40);
    const position = String(item.position || "");
    const number = Number(item.number);
    const card = String(item.card || "");
    const portrait = String(item.portrait || "");
    if (!ID.test(id) || ids.has(id) || !/^[\p{L}\p{M} .'-]{1,40}$/u.test(name)) return null;
    if (!POSITIONS.includes(position) || !Number.isInteger(number) || number < 1 || number > 99) return null;
    if (!ASSET.test(card) || !ASSET.test(portrait)) return null;
    ids.add(id);
    players.push({
      id: id,
      name: name,
      number: number,
      position: position,
      card: card,
      cardWidth: Math.max(1, Math.min(2000, Number(item.cardWidth) || 240)),
      cardHeight: Math.max(1, Math.min(2000, Number(item.cardHeight) || 560)),
      portrait: portrait,
      visible: item.visible !== false
    });
  }
  return players;
}

function rosterKey(item) {
  const name = cleanText(item.name, 80).replace(/\s+/g, " ").toLocaleLowerCase("es");
  const age = Number(item.age);
  if (!name || !Number.isInteger(age)) return "";
  return name + "|" + age;
}

function withDuplicates(list) {
  const counts = {};
  list.forEach(function (item) {
    const key = rosterKey(item);
    if (key) counts[key] = (counts[key] || 0) + 1;
  });
  return list.map(function (item) {
    const key = rosterKey(item);
    return Object.assign({}, item, { duplicate: Boolean(key && counts[key] > 1) });
  });
}

function parsedImport(body) {
  const raw = String(body && body.file || "").replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(raw) || raw.length < 20) return { error: "El archivo no se pudo leer." };
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length < 4 || buffer.length > 2500000 || buffer.readUInt32LE(0) !== 0x04034b50) {
    return { error: "El archivo no se pudo leer." };
  }
  let rows;
  try {
    rows = rowsFromWorkbook(buffer);
  } catch (error) {
    return {
      error: error && error.message === "columns"
        ? "El archivo no tiene las columnas de la plantilla."
        : "El archivo no se pudo leer."
    };
  }
  if (!rows.length) return { error: "El archivo no tiene jugadoras." };
  const addedOn = uploadDate();
  const incoming = validRoster(rows.map(function (row) {
    return Object.assign({ id: "r-" + crypto.randomBytes(6).toString("hex") }, row, { addedOn: addedOn });
  }));
  if (!incoming) return { error: "Revisa los datos del archivo." };
  return { incoming: incoming };
}

function importDuplicates(current, incoming) {
  const existing = {};
  current.forEach(function (item) {
    const key = rosterKey(item);
    if (key) existing[key] = true;
  });
  const fileCounts = {};
  incoming.forEach(function (item) {
    const key = rosterKey(item);
    if (key) fileCounts[key] = (fileCounts[key] || 0) + 1;
  });
  const seen = {};
  const duplicates = [];
  incoming.forEach(function (item) {
    const key = rosterKey(item);
    if (!key || seen[key]) return;
    const inRoster = Boolean(existing[key]);
    const inFile = fileCounts[key] > 1;
    if (!inRoster && !inFile) return;
    seen[key] = true;
    duplicates.push({ name: item.name, age: item.age, inRoster: inRoster, inFile: inFile });
  });
  return duplicates;
}

function validRoster(list) {
  if (!Array.isArray(list) || list.length > 500) return null;
  const ids = new Set();
  const players = [];
  for (const item of list) {
    if (!item || typeof item !== "object") return null;
    let id = cleanText(item.id, 40);
    if (!ID.test(id) || ids.has(id)) id = "r-" + crypto.randomBytes(6).toString("hex");
    if (ids.has(id)) return null;
    const name = cleanText(item.name, 80).replace(/\s+/g, " ");
    if (!name) return null;
    let age = "";
    if (item.age !== "" && item.age != null) {
      const number = Number(item.age);
      if (!Number.isInteger(number) || number < 1 || number > 120) return null;
      age = number;
    }
    ids.add(id);
    players.push({
      id: id,
      name: name,
      nickname: cleanText(item.nickname, 40),
      position: cleanText(item.position, 40),
      age: age,
      country: cleanText(item.country, 60),
      city: cleanText(item.city, 80),
      phone: cleanText(item.phone, 40),
      sede: cleanText(item.sede, 60),
      category: cleanText(item.category, 20),
      extra: cleanText(item.extra, 80),
      status: cleanStatus(item.status),
      addedOn: cleanDate(item.addedOn),
      paymentDue: cleanDate(item.paymentDue),
      paidOn: cleanDate(item.paidOn),
      notes: cleanNotes(item.notes),
      photos: cleanPhotos(item.photos)
    });
  }
  return players;
}

function validEvents(list) {
  if (!Array.isArray(list) || list.length > 100) return null;
  const ids = new Set();
  const events = [];
  for (const item of list) {
    if (!item || typeof item !== "object") return null;
    const id = cleanText(item.id, 40);
    const name = cleanText(item.name, 80);
    const date = cleanText(item.date, 10);
    const time = cleanText(item.time, 5);
    const place = cleanText(item.place, 120);
    const note = cleanText(item.note, 500);
    if (!ID.test(id) || ids.has(id) || name.length < 1 || !validDate(date)) return null;
    if (time && !/^\d{2}:\d{2}$/.test(time)) return null;
    ids.add(id);
    events.push({ id: id, name: name, date: date, time: time, place: place, note: note });
  }
  return events;
}

function passwordOk(password) {
  if (password.length < 12 || password.length > 128) return false;
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) return false;
  const weak = ["guerrerasfc", "guerreras", "password", "contrasena", "administrador"];
  return !weak.includes(password.toLowerCase());
}

function bogotaDay(iso) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(iso));
}

function recordVisit(page) {
  const stored = readJson(TELEMETRY_FILE, { visits: [] });
  const visits = Array.isArray(stored.visits) ? stored.visits : [];
  visits.push({ path: page, at: new Date().toISOString() });
  writeJson(TELEMETRY_FILE, { visits: visits.slice(-2000) });
}

function telemetryReport() {
  const stored = readJson(TELEMETRY_FILE, { visits: [] });
  const visits = Array.isArray(stored.visits) ? stored.visits : [];
  const today = bogotaDay(new Date().toISOString());
  const counts = {};
  PAGE_IDS.forEach(function (id) { counts[id] = 0; });
  let todayCount = 0;
  visits.forEach(function (visit) {
    if (counts[visit.path] != null) counts[visit.path] += 1;
    if (bogotaDay(visit.at) === today) todayCount += 1;
  });
  return {
    total: visits.length,
    today: todayCount,
    pages: PAGE_IDS.map(function (id) { return { id: id, label: LABELS[id], count: counts[id] }; }),
    recent: visits.slice(-15).reverse()
  };
}

function publicPlayers() {
  const players = readJson(PLAYERS_FILE, []);
  return (Array.isArray(players) ? players : []).filter(function (player) {
    return player && player.visible !== false;
  }).map(function (player) {
    return {
      id: player.id,
      name: player.name,
      number: player.number,
      position: player.position,
      card: player.card,
      cardWidth: player.cardWidth,
      cardHeight: player.cardHeight,
      portrait: player.portrait,
      visible: true
    };
  });
}

async function login(req, res) {
  if (!sameOrigin(req)) return sendJson(res, 403, { error: "Solicitud rechazada." });
  const ip = clientIp(req);
  if (locked(ip)) return sendJson(res, 429, { error: "Demasiados intentos. Espera unos minutos." });
  const body = await readBody(req);
  const username = String(body.username || "");
  const password = String(body.password || "");
  if (username.length > 64 || password.length < 1 || password.length > 128) {
    markFailure(ip);
    return sendJson(res, 401, { error: "Usuario o contraseña incorrectos." });
  }
  const givenUser = Buffer.from(username);
  const knownUser = Buffer.from(authRecord.username);
  const matchUser = givenUser.length === knownUser.length && crypto.timingSafeEqual(givenUser, knownUser);
  const salt = matchUser ? Buffer.from(authRecord.salt, "hex") : DUMMY_SALT;
  const expected = matchUser ? Buffer.from(authRecord.hash, "hex") : DUMMY_HASH;
  const params = matchUser ? { n: authRecord.n, r: authRecord.r, p: authRecord.p } : SCRYPT;
  const actual = await scryptKey(password, salt, params);
  const matchPass = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  if (!matchUser || !matchPass) {
    markFailure(ip);
    return sendJson(res, 401, { error: "Usuario o contraseña incorrectos." });
  }
  loginAttempts.delete(ip);
  startSession(req, res);
}

function startSession(req, res) {
  const id = crypto.randomBytes(32).toString("hex");
  const csrf = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessions.set(id, { id: id, username: authRecord.username, csrf: csrf, created: now, seen: now });
  sendJson(res, 200, { username: authRecord.username, csrf: csrf }, { "Set-Cookie": sessionCookie(id, req) });
}

function devLogin(req, res) {
  const ip = clientIp(req);
  const local = ip === "127.0.0.1" || ip === "::1";
  if (process.env.NODE_ENV === "production" || !local || !sameOrigin(req)) {
    return sendJson(res, 404, { error: "No encontrada." });
  }
  startSession(req, res);
}

function logout(req, res) {
  const session = getSession(req);
  if (session) sessions.delete(session.id);
  sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", req, true) });
}

async function changePassword(req, res, session) {
  const body = await readBody(req);
  const current = String(body.current || "");
  const next = String(body.next || "");
  if (current.length < 1 || current.length > 128) return sendJson(res, 400, { error: "No se pudo cambiar la contraseña." });
  if (!passwordOk(next)) return sendJson(res, 400, { error: "La nueva contraseña debe tener al menos 12 caracteres, con letras y números." });
  const salt = Buffer.from(authRecord.salt, "hex");
  const expected = Buffer.from(authRecord.hash, "hex");
  const actual = await scryptKey(current, salt, { n: authRecord.n, r: authRecord.r, p: authRecord.p });
  const match = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  if (!match) return sendJson(res, 401, { error: "La contraseña actual no coincide." });
  const nextSalt = crypto.randomBytes(16);
  const nextHash = await scryptKey(next, nextSalt, SCRYPT);
  authRecord = {
    username: authRecord.username,
    salt: nextSalt.toString("hex"),
    hash: nextHash.toString("hex"),
    n: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p
  };
  writeJson(AUTH_FILE, authRecord);
  sessions.clear();
  const id = crypto.randomBytes(32).toString("hex");
  const csrf = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessions.set(id, { id: id, username: authRecord.username, csrf: csrf, created: now, seen: now });
  sendJson(res, 200, { ok: true, csrf: csrf }, { "Set-Cookie": sessionCookie(id, req) });
}

async function handleApi(req, res, pathname) {
  if (req.method === "POST" && pathname === "/api/dev-login") return devLogin(req, res);
  if (req.method === "POST" && pathname === "/api/login") {
    const type = String(req.headers["content-type"] || "");
    if (!type.includes("application/json")) return sendJson(res, 415, { error: "Solicitud rechazada." });
    return login(req, res);
  }
  if (req.method === "POST" && pathname === "/api/logout") {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: "Solicitud rechazada." });
    return logout(req, res);
  }
  if (req.method === "GET" && pathname === "/api/session") {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { error: "Debes iniciar sesión." });
    return sendJson(res, 200, { username: session.username, csrf: session.csrf });
  }

  if (!pathname.startsWith("/api/admin")) return sendJson(res, 404, { error: "No encontrada." });
  const session = getSession(req);
  if (!session) return sendJson(res, 401, { error: "Debes iniciar sesión." });
  const writing = req.method === "PUT" || req.method === "POST";
  if (writing) {
    const type = String(req.headers["content-type"] || "");
    if (!type.includes("application/json")) return sendJson(res, 415, { error: "Solicitud rechazada." });
    if (!sameOrigin(req) || !csrfOk(req, session)) return sendJson(res, 403, { error: "Solicitud rechazada." });
  } else if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Método no permitido." });
  }

  if (req.method === "GET" && pathname === "/api/admin/settings") return sendJson(res, 200, readSettings());
  if (req.method === "PUT" && pathname === "/api/admin/settings") {
    const body = await readBody(req);
    const current = readSettings();
    const pages = {};
    PAGE_IDS.forEach(function (id) {
      const incoming = body.pages && body.pages[id];
      const visible = id === "inicio" ? true : incoming && typeof incoming.visible === "boolean" ? incoming.visible : current.pages[id].visible;
      pages[id] = { visible: visible };
    });
    settingsCache = { pages: pages };
    writeJson(SETTINGS_FILE, settingsCache);
    return sendJson(res, 200, settingsCache);
  }
  if (req.method === "GET" && pathname === "/api/admin/events") return sendJson(res, 200, { events: readJson(EVENTS_FILE, []) });
  if (req.method === "PUT" && pathname === "/api/admin/events") {
    const body = await readBody(req);
    const events = validEvents(body.events);
    if (!events) return sendJson(res, 400, { error: "Revisa los datos del evento." });
    writeJson(EVENTS_FILE, events);
    return sendJson(res, 200, { events: events });
  }
  if (req.method === "GET" && pathname === "/api/admin/roster/report") {
    const stored = readJson(ROSTER_FILE, []);
    const file = rosterWorkbook(Array.isArray(stored) ? stored : []);
    const stamp = uploadDate();
    res.writeHead(200, baseHeaders({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=\"Jugadoras-" + stamp + ".xlsx\"",
      "Content-Length": file.length,
      "X-Robots-Tag": "noindex, nofollow"
    }));
    return res.end(file);
  }
  if (req.method === "GET" && pathname === "/api/admin/roster/template") {
    if (!fs.existsSync(TEMPLATE_FILE)) return sendJson(res, 404, { error: "No encontrada." });
    const file = fs.readFileSync(TEMPLATE_FILE);
    res.writeHead(200, baseHeaders({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=\"Guerreras-FC.xlsx\"; filename*=UTF-8''Guerreras%20FC.xlsx",
      "Content-Length": file.length,
      "X-Robots-Tag": "noindex, nofollow"
    }));
    return res.end(file);
  }
  if (req.method === "GET" && pathname === "/api/admin/roster") {
    const stored = readJson(ROSTER_FILE, []);
    return sendJson(res, 200, { players: withDuplicates(Array.isArray(stored) ? stored : []) });
  }
  if (req.method === "GET" && pathname === "/api/admin/roster/photo") {
    const query = new URL(req.url, "http://127.0.0.1").searchParams;
    const id = cleanText(query.get("id"), 40);
    const file = cleanText(query.get("file"), 24);
    const dir = playerPhotoDir(id);
    if (!dir || !PHOTO_NAME.test(file)) return sendJson(res, 404, { error: "No encontrada." });
    const full = path.join(dir, file);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return sendJson(res, 404, { error: "No encontrada." });
    const kind = path.extname(file).slice(1);
    const type = kind === "png" ? "image/png" : kind === "webp" ? "image/webp" : "image/jpeg";
    const bytes = fs.readFileSync(full);
    res.writeHead(200, baseHeaders({
      "Content-Type": type,
      "Content-Length": bytes.length,
      "X-Robots-Tag": "noindex, nofollow"
    }));
    return res.end(bytes);
  }
  if (req.method === "POST" && pathname === "/api/admin/roster/photo") {
    const body = await readBody(req, 5000000);
    const id = cleanText(body.id, 40);
    const dir = playerPhotoDir(id);
    const roster = readJson(ROSTER_FILE, []);
    const known = Array.isArray(roster) && roster.some(function (item) { return item && item.id === id; });
    if (!dir || !known) return sendJson(res, 404, { error: "No se encontró la jugadora." });
    const stored = fs.existsSync(dir) ? fs.readdirSync(dir).filter(function (name) { return PHOTO_NAME.test(name); }) : [];
    if (stored.length >= 5) return sendJson(res, 400, { error: "La jugadora ya tiene 5 fotos." });
    const raw = String(body.data || "").replace(/\s/g, "");
    const base64 = raw.indexOf(",") >= 0 ? raw.split(",").pop() : raw;
    if (!/^[A-Za-z0-9+/=]+$/.test(base64)) return sendJson(res, 400, { error: "La foto no se pudo leer." });
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length < 32 || buffer.length > 2500000) return sendJson(res, 400, { error: "La foto debe pesar menos de 2.5 MB." });
    const kind = imageKind(buffer);
    if (!kind) return sendJson(res, 400, { error: "La foto debe ser JPG, PNG o WebP." });
    const filename = crypto.randomBytes(8).toString("hex") + "." + kind;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buffer);
    return sendJson(res, 200, { file: filename });
  }
  if (req.method === "PUT" && pathname === "/api/admin/roster") {
    const body = await readBody(req, 1000000);
    const players = validRoster(body.players);
    if (!players) return sendJson(res, 400, { error: "Revisa los datos de la jugadora." });
    writeJson(ROSTER_FILE, players);
    syncRosterPhotos(players);
    return sendJson(res, 200, { players: withDuplicates(players) });
  }
  if (req.method === "POST" && pathname === "/api/admin/roster/import") {
    const body = await readBody(req, 4000000);
    const parsed = parsedImport(body);
    if (parsed.error) return sendJson(res, 400, { error: parsed.error });
    const current = readJson(ROSTER_FILE, []);
    const stored = Array.isArray(current) ? current : [];
    const players = validRoster(stored.concat(parsed.incoming));
    if (!players) return sendJson(res, 400, { error: "La lista superó el límite de jugadoras." });
    if (body.preview === true) {
      return sendJson(res, 200, {
        preview: true,
        total: parsed.incoming.length,
        duplicates: importDuplicates(stored, parsed.incoming)
      });
    }
    writeJson(ROSTER_FILE, players);
    return sendJson(res, 200, { players: withDuplicates(players), added: parsed.incoming.length });
  }
  if (req.method === "GET" && pathname === "/api/admin/players") return sendJson(res, 200, { players: readJson(PLAYERS_FILE, []) });
  if (req.method === "PUT" && pathname === "/api/admin/players") {
    const body = await readBody(req);
    const players = validPlayers(body.players);
    if (!players) return sendJson(res, 400, { error: "Revisa los datos de la jugadora." });
    writeJson(PLAYERS_FILE, players);
    return sendJson(res, 200, { players: players });
  }
  if (req.method === "GET" && pathname === "/api/admin/telemetry") return sendJson(res, 200, telemetryReport());
  if (req.method === "POST" && pathname === "/api/admin/password") return changePassword(req, res, session);
  sendJson(res, 404, { error: "No encontrada." });
}

function safeFile(pathname) {
  let rel = pathname;
  if (FILES[pathname]) rel = "/" + FILES[pathname];
  const decoded = decodeURIComponent(rel);
  if (decoded.includes("\0")) return null;
  const full = path.normalize(path.join(ROOT, decoded));
  const fromRoot = path.relative(ROOT, full);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) return null;
  const portable = fromRoot.split(path.sep).join("/");
  if (!portable || portable === "." || portable.startsWith(".") || portable.startsWith("data/") || portable === "server.js") return null;
  return full;
}

function serveStatic(req, res, pathname) {
  const file = safeFile(pathname);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    sendHtml(res, 404, unavailablePage().replace("Esta sección no está disponible", "Página no encontrada").replace("El club ocultó esta parte del sitio.", "Esa dirección no existe."));
    return;
  }
  const pageKey = PUBLIC_PAGES[pathname];
  if (pageKey && pageKey !== "inicio" && readSettings().pages[pageKey].visible === false) {
    sendHtml(res, 404, unavailablePage());
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const body = fs.readFileSync(file);
  const headers = baseHeaders({
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
  });
  if (pageKey) headers["Cache-Control"] = "no-cache";
  if (pathname === "/GFCCaliAdmin" || file.endsWith("GFCCaliAdmin.html")) headers["X-Robots-Tag"] = "noindex, nofollow";
  res.writeHead(200, headers);
  res.end(body);
  if (pageKey && req.method === "GET") {
    try { recordVisit(pageKey); } catch (error) { console.error(error); }
  }
}

async function handle(req, res) {
  let pathname = "/";
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  } catch (error) {
    return sendJson(res, 400, { error: "Solicitud rechazada." });
  }
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  if (pathname.toLowerCase() === "/gfccaliadmin") pathname = "/GFCCaliAdmin";
  if (pathname.toLowerCase() === "/gfccaliadmin.html") pathname = "/GFCCaliAdmin.html";
  if (pathname === "/data/site-settings.json" && req.method === "GET") return sendJson(res, 200, readSettings());
  if (pathname === "/data/players.json" && req.method === "GET") return sendJson(res, 200, publicPlayers());
  if (pathname.startsWith("/api/")) return handleApi(req, res, pathname);
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "Método no permitido." });
  serveStatic(req, res, pathname);
}

const server = http.createServer(function (req, res) {
  handle(req, res).catch(function (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, error.status || 500, { error: "No se pudo completar la solicitud." });
  });
});

server.listen(PORT, HOST, function () {
  console.log("Guerreras FC en http://localhost:" + PORT);
  console.log("Administración en http://localhost:" + PORT + "/GFCCaliAdmin");
});
