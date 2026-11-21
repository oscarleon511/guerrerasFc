"use strict";

const zlib = require("zlib");

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, function (_, code) { return String.fromCharCode(Number(code)); })
    .replace(/&amp;/g, "&");
}

function unzip(buffer) {
  const files = {};
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.toString("utf8", nameStart, nameStart + nameLen).replace(/\\/g, "/");
    const dataStart = nameStart + nameLen + extraLen;
    const compressed = buffer.subarray(dataStart, dataStart + compSize);
    files[name] = method === 8 ? zlib.inflateRawSync(compressed) : compressed;
    offset = dataStart + compSize;
  }
  return files;
}

function sharedStrings(xml) {
  const values = [];
  const items = xml.match(/<si\b[\s\S]*?<\/si>/g) || [];
  items.forEach(function (item) {
    const texts = [];
    const pattern = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let match = pattern.exec(item);
    while (match) {
      texts.push(decodeXml(match[1]));
      match = pattern.exec(item);
    }
    values.push(texts.join(""));
  });
  return values;
}

function sheetRows(xml, strings) {
  const rows = [];
  const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch = rowPattern.exec(xml);
  while (rowMatch) {
    const cells = {};
    const cellPattern = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch = cellPattern.exec(rowMatch[1]);
    while (cellMatch) {
      const attrs = cellMatch[1];
      const body = cellMatch[2] || "";
      const ref = (attrs.match(/\br="([A-Z]+)\d+"/) || [])[1];
      if (ref) {
        const type = (attrs.match(/\bt="([^"]+)"/) || [])[1] || "";
        const raw = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        if (raw == null) cells[ref] = "";
        else if (type === "s") cells[ref] = strings[Number(raw)] || "";
        else cells[ref] = decodeXml(raw);
      }
      cellMatch = cellPattern.exec(rowMatch[1]);
    }
    rows.push(cells);
    rowMatch = rowPattern.exec(xml);
  }
  return rows;
}

function headerKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const HEADERS = {
  "nombre completo": "name",
  "apodo": "nickname",
  "posicion": "position",
  "edad": "age",
  "pais de nacimiento": "country",
  "lugar de nacimiento": "city",
  "telefono de contacto": "phone",
  "sede de entrenamiento": "sede",
  "categoria": "category",
  "categorias adicionales": "extra"
};

function rowsFromWorkbook(buffer) {
  const files = unzip(buffer);
  const sheetName = Object.keys(files).find(function (name) { return /xl\/worksheets\/sheet1\.xml$/.test(name); });
  const sharedName = Object.keys(files).find(function (name) { return /xl\/sharedStrings\.xml$/.test(name); });
  if (!sheetName) throw new Error("columns");
  const strings = sharedName ? sharedStrings(files[sharedName].toString("utf8")) : [];
  const rows = sheetRows(files[sheetName].toString("utf8"), strings);
  const header = rows.find(function (row) {
    return Object.keys(row).some(function (letter) { return headerKey(row[letter]) === "nombre completo"; });
  });
  if (!header) throw new Error("columns");
  const letters = {};
  Object.keys(header).forEach(function (letter) {
    const key = HEADERS[headerKey(header[letter])];
    if (key) letters[key] = letter;
  });
  if (Object.keys(HEADERS).some(function (label) { return !letters[HEADERS[label]]; })) throw new Error("columns");
  const start = rows.indexOf(header) + 1;
  const players = [];
  rows.slice(start).forEach(function (row) {
    const item = {};
    Object.keys(letters).forEach(function (key) { item[key] = String(row[letters[key]] || "").trim(); });
    if (!Object.keys(item).some(function (key) { return item[key]; })) return;
    if (item.age !== "" && Number.isFinite(Number(item.age))) item.age = Number(item.age);
    players.push(item);
  });
  return players;
}

module.exports = { rowsFromWorkbook };
