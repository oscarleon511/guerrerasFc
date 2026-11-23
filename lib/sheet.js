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

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = (function () {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function zipFiles(files) {
  const locals = [];
  const central = [];
  let offset = 0;
  files.forEach(function (file) {
    const name = Buffer.from(file.name, "utf8");
    const raw = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf8");
    const data = zlib.deflateRawSync(raw);
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    const entry = Buffer.concat([local, name, data]);
    locals.push(entry);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(raw.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cen, name]));
    offset += entry.length;
  });
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat(locals.concat([directory, end]));
}

function xmlText(value) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function columnLetter(index) {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function reportDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function excelSerial(date) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc - Date.UTC(1899, 11, 30)) / 86400000);
}

function paymentWindow(dueIso, today) {
  const due = reportDate(dueIso);
  if (!due) return null;
  const dueDay = due.getDate();
  function startOf(year, month) {
    const last = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, Math.min(dueDay, last));
  }
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start = startOf(day.getFullYear(), day.getMonth() + 1);
  if (start > day) start = startOf(day.getFullYear(), day.getMonth());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4);
  const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const nextStart = startOf(nextMonth.getFullYear(), nextMonth.getMonth() + 1);
  return { start: start, end: end, nextStart: nextStart };
}

const STATUS_LABELS = {
  active: "Activa",
  suspended: "Suspendida",
  pending: "Pendiente",
  late: "Activa (tarde)"
};

function reportStatus(player, today) {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const stored = STATUS_LABELS[player.status] ? player.status : "active";
  if (stored === "suspended" || stored === "pending") return STATUS_LABELS[stored];
  const window = paymentWindow(player.paymentDue, day);
  if (!window) return stored === "late" ? STATUS_LABELS.late : STATUS_LABELS.active;
  const paidOn = reportDate(player.paidOn);
  const paid = Boolean(paidOn && paidOn >= window.start && paidOn < window.nextStart);
  return !paid && day > window.end ? STATUS_LABELS.late : STATUS_LABELS.active;
}

function plainNotes(value) {
  return String(value || "")
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const REPORT_COLUMNS = [
  ["name", "Nombre Completo", 28],
  ["nickname", "Apodo", 16],
  ["position", "Posición", 18],
  ["age", "Edad", 10],
  ["country", "Pais de Nacimiento", 22],
  ["city", "Lugar de Nacimiento", 24],
  ["phone", "Teléfono de Contacto", 22],
  ["sede", "Sede de Entrenamiento", 28],
  ["category", "Categoria", 14],
  ["extra", "Categorias Adicionales", 32],
  ["status", "Estado", 18],
  ["addedOn", "Agregada el", 16],
  ["paymentDue", "Vencimiento", 16],
  ["notes", "Notas", 42],
  ["photos", "Fotos", 16]
];

function reportCell(player, key, today) {
  if (key === "status") return { type: "text", value: reportStatus(player, today) };
  if (key === "photos") return { type: "text", value: Array.isArray(player.photos) && player.photos.length ? "Agregadas" : "No agregadas" };
  if (key === "notes") return { type: "text", value: plainNotes(player.notes) };
  if (key === "addedOn" || key === "paymentDue") {
    const date = reportDate(player[key]);
    return date ? { type: "date", value: excelSerial(date) } : { type: "text", value: "" };
  }
  if (key === "age") {
    const age = Number(player.age);
    return Number.isInteger(age) ? { type: "number", value: age } : { type: "text", value: "" };
  }
  return { type: "text", value: player[key] == null ? "" : String(player[key]) };
}

function worksheetXml(players) {
  const today = new Date();
  const lastColumn = columnLetter(REPORT_COLUMNS.length - 1);
  const lastRow = Math.max(1, players.length + 1);
  const cols = REPORT_COLUMNS.map(function (column, index) {
    return "<col min=\"" + (index + 1) + "\" max=\"" + (index + 1) + "\" width=\"" + column[2] + "\" customWidth=\"1\"/>";
  }).join("");
  const header = REPORT_COLUMNS.map(function (column, index) {
    return "<c r=\"" + columnLetter(index) + "1\" s=\"1\" t=\"inlineStr\"><is><t>" + xmlText(column[1]) + "</t></is></c>";
  }).join("");
  const body = players.map(function (player, rowIndex) {
    const row = rowIndex + 2;
    const cells = REPORT_COLUMNS.map(function (column, index) {
      const cell = reportCell(player, column[0], today);
      const ref = columnLetter(index) + row;
      if (cell.type === "date") return "<c r=\"" + ref + "\" s=\"2\"><v>" + cell.value + "</v></c>";
      if (cell.type === "number") return "<c r=\"" + ref + "\"><v>" + cell.value + "</v></c>";
      if (!cell.value) return "";
      return "<c r=\"" + ref + "\" t=\"inlineStr\"><is><t xml:space=\"preserve\">" + xmlText(cell.value) + "</t></is></c>";
    }).join("");
    return "<row r=\"" + row + "\">" + cells + "</row>";
  }).join("");
  return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
    "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" +
    "<dimension ref=\"A1:" + lastColumn + lastRow + "\"/>" +
    "<sheetViews><sheetView tabSelected=\"1\" workbookViewId=\"0\">" +
    "<pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/>" +
    "<selection pane=\"bottomLeft\" activeCell=\"A2\" sqref=\"A2\"/>" +
    "</sheetView></sheetViews>" +
    "<cols>" + cols + "</cols>" +
    "<sheetData><row r=\"1\" ht=\"22\" customHeight=\"1\">" + header + "</row>" + body + "</sheetData>" +
    "<autoFilter ref=\"A1:" + lastColumn + lastRow + "\"/>" +
    "</worksheet>";
}

function rosterWorkbook(players) {
  const list = Array.isArray(players) ? players : [];
  const styles = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
    "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" +
    "<numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"dd/mm/yyyy\"/></numFmts>" +
    "<fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts>" +
    "<fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills>" +
    "<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>" +
    "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>" +
    "<cellXfs count=\"3\">" +
    "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>" +
    "<xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyAlignment=\"1\"><alignment horizontal=\"center\" vertical=\"center\"/></xf>" +
    "<xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
    "</cellXfs></styleSheet>";
  const files = [
    { name: "[Content_Types].xml", data: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/></Types>" },
    { name: "_rels/.rels", data: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>" },
    { name: "xl/workbook.xml", data: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"Jugadoras\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>" },
    { name: "xl/_rels/workbook.xml.rels", data: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/><Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>" },
    { name: "xl/styles.xml", data: styles },
    { name: "xl/worksheets/sheet1.xml", data: worksheetXml(list) }
  ];
  return zipFiles(files);
}

module.exports = { rowsFromWorkbook, rosterWorkbook };
