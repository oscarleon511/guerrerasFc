(function () {
  var csrf = "";
  var tab = "inicio";
  var settings = null;
  var events = [];
  var players = [];
  var editingEvent = "";
  var eventUploads = null;
  var eventUploadBusy = false;
  var eventPreviewIndex = 0;
  var previewingSaved = "";
  var previewDismissed = false;
  var eventNoteLimit = 10000;
  var editingPlayer = "";
  var rosterOpen = false;
  var playerDraft = null;
  var collapseAddForm = false;
  var selectedPlayers = {};
  var pendingDeleteIds = [];
  var rosterFilters = {};
  var rosterSort = { key: "", dir: "" };
  var dragColumn = "";
  var infoDraft = null;

  var totpEnabled = false;
  var totpSetup = null;
  var loginTicket = "";
  var menuOpen = true;
  try { menuOpen = sessionStorage.getItem("gfc-admin-menu") !== "closed"; } catch (error) { menuOpen = true; }

  var login = document.getElementById("login");
  var app = document.getElementById("app");
  var panel = document.getElementById("panel");
  var title = document.getElementById("panel-title");
  var status = document.getElementById("save-status");
  var loginError = document.getElementById("login-error");

  var siteTabs = [
    { id: "inicio", label: "Inicio", copy: "Página de entrada del club. Presenta a Guerreras FC, las categorías A, B y C, las categorías Plus y la invitación a unirse." },
    { id: "sedes", label: "Sedes", copy: "Calendario y mapa de las cuatro sedes: Sur 1, Sur 2, Norte y Ciudad del Campo." },
    { id: "plantilla", label: "Plantilla", copy: "Jugadoras del equipo y el cuerpo técnico." },
    { id: "nosotras", label: "Nosotras", copy: "Visión, misión, categorías e historia del club." },
    { id: "patrocinadores", label: "Patrocinadores", copy: "Aliados, descuentos y el torneo." },
    { id: "beneficios", label: "Beneficios", copy: "Tarjeta VIP y los descuentos de los aliados." },
    { id: "tienda", label: "Tienda", copy: "Inscripción, mensualidad y uniformes. El pedido se envía por WhatsApp." }
  ];
  var clubTabs = [
    { id: "telemetria", label: "Telemetría" },
    { id: "eventos", label: "Eventos" },
    { id: "jugadoras", label: "Jugadoras" }
  ];

  function applyMenu() {
    app.classList.toggle("is-menu-collapsed", !menuOpen);
    var button = document.getElementById("side-toggle");
    if (!button) return;
    button.setAttribute("aria-expanded", menuOpen ? "true" : "false");
    button.setAttribute("aria-label", menuOpen ? "Ocultar el menú" : "Mostrar el menú");
  }

  document.getElementById("side-toggle").addEventListener("click", function () {
    menuOpen = !menuOpen;
    try { sessionStorage.setItem("gfc-admin-menu", menuOpen ? "open" : "closed"); } catch (error) {}
    applyMenu();
  });
  applyMenu();
  var positions = ["Arquera", "Defensora", "Mediocampista", "Delantera"];
  var sedes = ["Guerreras Sur 1", "Guerreras Sur 2", "Guerreras Norte", "Guerreras Ciudad del Cample", "N/A"];
  var categories = ["A", "B", "C"];
  var extras = ["All Stars", "Futbol 11", "La Seleccion", "All Stars + Futbol 11", "All Stars + Futbol 11 + Seleccion", "All Stars + Seleccion", "Futbol 11 + Seleccion", "No aplica"];
  var columns = [
    ["name", "Nombre Completo"],
    ["nickname", "Apodo"],
    ["position", "Posición"],
    ["age", "Edad"],
    ["country", "Pais de Nacimiento"],
    ["city", "Lugar de Nacimiento"],
    ["phone", "Teléfono de Contacto"],
    ["documentId", "Documento"],
    ["sede", "Sede de Entrenamiento"],
    ["category", "Categoria"],
    ["extra", "Categorias Adicionales"],
    ["status", "Estado"],
    ["addedOn", "Agregada el"],
    ["paymentDue", "Vencimiento"],
    ["notes", "Notas"],
    ["photos", "Fotos"]
  ];
  var statuses = [
    { id: "active", label: "Activa", hint: "Sin atrasos en el pago y actualmente activa." },
    { id: "suspended", label: "Suspendida", hint: "Medida disciplinaria del equipo, en cualquier sede." },
    { id: "pending", label: "Pendiente", hint: "Pendiente de revisión del entrenador principal para asignarla a una sede." },
    { id: "late", label: "Activa (tarde)", hint: "Atrasada en el pago de la mensualidad." }
  ];
  var columnOrder = columns.map(function (column) { return column[0]; });
  var hiddenColumns = {};
  var columnsOpen = true;
  try { columnsOpen = localStorage.getItem("gfc-admin-columns-open") !== "closed"; } catch (error) { columnsOpen = true; }
  var dragIcon = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.2\" stroke-linecap=\"round\"></path></svg>";

  function columnByKey(key) {
    for (var i = 0; i < columns.length; i += 1) {
      if (columns[i][0] === key) return columns[i];
    }
    return null;
  }

  function shownColumns() {
    return columnOrder.map(columnByKey).filter(function (column) {
      return column && !hiddenColumns[column[0]];
    });
  }

  function columnFiltered(key) {
    var value = rosterFilters[key];
    if (value && typeof value === "object") return Boolean(value.from || value.to);
    return String(value || "").trim() !== "";
  }

  function saveColumnPref() {
    try {
      localStorage.setItem("gfc-admin-columns", JSON.stringify({
        order: columnOrder,
        hidden: columnOrder.filter(function (key) { return hiddenColumns[key]; })
      }));
    } catch (error) {}
  }

  function loadColumnPref() {
    try {
      var saved = JSON.parse(localStorage.getItem("gfc-admin-columns") || "null");
      if (!saved) return;
      var known = {};
      columns.forEach(function (column) { known[column[0]] = true; });
      if (Array.isArray(saved.order)) {
        var next = [];
        saved.order.forEach(function (key) {
          if (known[key] && next.indexOf(key) < 0) next.push(key);
        });
        columnOrder.forEach(function (key) {
          if (next.indexOf(key) < 0) next.push(key);
        });
        columnOrder = next;
      }
      if (Array.isArray(saved.hidden)) {
        hiddenColumns = {};
        saved.hidden.forEach(function (key) {
          if (known[key]) hiddenColumns[key] = true;
        });
        if (!shownColumns().length) hiddenColumns = {};
      }
    } catch (error) {}
  }

  loadColumnPref();

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function api(path, method, body) {
    var headers = { Accept: "application/json" };
    if (body) headers["Content-Type"] = "application/json";
    if (csrf && method !== "GET") headers["X-CSRF-Token"] = csrf;
    return fetch(path, {
      method: method,
      headers: headers,
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        return { ok: response.ok, status: response.status, data: data };
      });
    });
  }

  function setStatus(message) {
    status.textContent = message || "";
  }

  function showError(node, message) {
    node.hidden = !message;
    node.textContent = message || "";
  }

  function tabMeta(id) {
    return siteTabs.concat(clubTabs).filter(function (item) { return item.id === id; })[0];
  }

  function navIcon(inner) {
    return "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">" + inner + "</svg>";
  }

  var navStroke = " fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
  var navIcons = {
    inicio: navIcon("<path d=\"M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1Z\"" + navStroke + "></path>"),
    sedes: navIcon("<path d=\"M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z\"" + navStroke + "></path><circle cx=\"12\" cy=\"10\" r=\"2\"" + navStroke + "></circle>"),
    plantilla: navIcon("<path d=\"M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a2.4 2.4 0 1 0 0-4.8A2.4 2.4 0 0 0 16 11ZM3.8 19c.5-2.5 2.6-4 4.7-4s4.2 1.5 4.7 4M14.8 15.2c1.4.2 2.7 1 3.5 2.2.5.8.9 1.6 1 2.6\"" + navStroke + "></path>"),
    nosotras: navIcon("<circle cx=\"12\" cy=\"12\" r=\"8\"" + navStroke + "></circle><path d=\"M12 11v5M12 8h.01\"" + navStroke + "></path>"),
    patrocinadores: navIcon("<path d=\"m12 3.8 2.1 4.4 4.8.7-3.5 3.4.8 4.8L12 14.8 7.8 17.1l.8-4.8L5.1 8.9l4.8-.7Z\"" + navStroke + "></path>"),
    beneficios: navIcon("<path d=\"M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10ZM3 7h18v3H3ZM12 7v13M12 7c0-2.2-1.6-3.5-3-3.5S7.2 5 8.4 6.4C9.4 7.6 12 7 12 7Zm0 0c0-2.2 1.6-3.5 3-3.5s1.8 1.5.6 2.9C14.6 7.6 12 7 12 7Z\"" + navStroke + "></path>"),
    tienda: navIcon("<path d=\"M6 8h12l-1 12H7L6 8ZM9 8V6.5a3 3 0 0 1 6 0V8\"" + navStroke + "></path>"),
    telemetria: navIcon("<path d=\"M4 19V11M12 19V5M20 19v-7M3 19h18\"" + navStroke + "></path>"),
    eventos: navIcon("<path d=\"M5 6h14v14H5V6ZM5 10h14M8 4v4M16 4v4\"" + navStroke + "></path>"),
    jugadoras: navIcon("<path d=\"M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.5 20c.7-3.2 3.2-5 6.5-5s5.8 1.8 6.5 5\"" + navStroke + "></path>")
  };

  function paintNav(container, items) {
    container.innerHTML = items.map(function (item) {
      var current = item.id === tab ? " aria-current=\"page\"" : "";
      return "<button type=\"button\" data-tab=\"" + item.id + "\"" + current + "><span class=\"nav-icon\">" + navIcons[item.id] + "</span><span class=\"nav-label\">" + escapeHtml(item.label) + "</span></button>";
    }).join("");
  }

  function paintNavs() {
    paintNav(document.getElementById("site-tabs"), siteTabs);
    paintNav(document.getElementById("club-tabs"), clubTabs);
    var settingsButton = document.getElementById("open-settings");
    if (settingsButton) settingsButton.setAttribute("aria-current", tab === "ajustes" ? "page" : "false");
    title.textContent = tab === "ajustes" ? "Ajustes" : tabMeta(tab).label;
  }

  function sitePanel(item) {
    if (item.id === "inicio") {
      return "<article class=\"panel-card\"><p>" + escapeHtml(item.copy) + "</p><p class=\"locked-note\">Inicio siempre está visible. No se puede ocultar.</p></article>";
    }
    var visible = settings.pages[item.id] && settings.pages[item.id].visible !== false;
    return "<article class=\"panel-card\"><p>" + escapeHtml(item.copy) + "</p><label class=\"switch\"><input type=\"checkbox\" data-visible=\"" + item.id + "\"" + (visible ? " checked" : "") + "><span class=\"switch-track\" aria-hidden=\"true\"></span><span>Visible en el menú y en la página</span></label></article>";
  }

  function telemetryPanel(report) {
    var max = 1;
    report.pages.forEach(function (page) { if (page.count > max) max = page.count; });
    var bars = report.pages.map(function (page) {
      var width = Math.round((page.count / max) * 100);
      return "<div><span>" + escapeHtml(page.label) + "</span><b><i style=\"width:" + width + "%\"></i></b><span>" + page.count + "</span></div>";
    }).join("");
    var recent = report.recent.length ? report.recent.map(function (visit) {
      var when = new Date(visit.at).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" });
      var label = tabMeta(visit.path);
      return "<li><span>" + escapeHtml(label ? label.label : visit.path) + "</span><span>" + escapeHtml(when) + "</span></li>";
    }).join("") : "<li>Todavía no hay visitas.</li>";
    return "<article class=\"panel-card\"><p>Visitas a las páginas públicas. No se guarda la dirección de quien entra.</p><div class=\"stat-row\"><article><strong>" + report.total + "</strong><span>Visitas guardadas</span></article><article><strong>" + report.today + "</strong><span>Hoy</span></article></div><div class=\"meter\">" + bars + "</div><ul class=\"visit-list\">" + recent + "</ul></article>";
  }

  function eventById(id) {
    return events.filter(function (item) { return item.id === id; })[0] || null;
  }

  function eventDraft() {
    if (editingEvent) {
      if (!eventUploads || eventUploads.id !== editingEvent) {
        var current = eventById(editingEvent) || {};
        eventUploads = {
          id: editingEvent,
          photos: (current.photos || []).slice(),
          video: current.video || "",
          mediaMode: current.mediaMode === "video" || current.mediaMode === "photos" ? current.mediaMode : "both",
          mediaOrder: (current.mediaOrder || []).slice(),
          videoFrame: copyVideoFrame(current.videoFrame),
          published: current.published === true,
          fresh: false
        };
      }
      return eventUploads;
    }
    if (!eventUploads || !eventUploads.fresh) {
      eventUploads = { id: "e-" + Date.now().toString(36), photos: [], video: "", mediaMode: "both", mediaOrder: [], videoFrame: copyVideoFrame(), published: false, fresh: true };
    }
    return eventUploads;
  }

  function copyVideoFrame(frame) {
    var source = frame || {};
    var ratio = eventPhotoRatios[source.ratio] ? source.ratio : "site";
    var zoom = Number(source.zoom);
    if (!isFinite(zoom)) zoom = 1;
    zoom = Math.min(3, Math.max(1, zoom));
    var x = Number(source.x);
    var y = Number(source.y);
    if (!isFinite(x)) x = 0;
    if (!isFinite(y)) y = 0;
    return {
      ratio: ratio,
      zoom: Math.round(zoom * 100) / 100,
      x: Math.min(80, Math.max(-80, Math.round(x * 10) / 10)),
      y: Math.min(80, Math.max(-80, Math.round(y * 10) / 10))
    };
  }

  function eventMediaOrder(record) {
    var photos = (record && record.photos) || [];
    var video = record && record.video;
    var order = [];
    ((record && record.mediaOrder) || []).forEach(function (token) {
      if (token === "video") {
        if (video && order.indexOf("video") === -1) order.push("video");
      } else if (photos.indexOf(token) !== -1 && order.indexOf(token) === -1) order.push(token);
    });
    if (video && order.indexOf("video") === -1) order.unshift("video");
    photos.forEach(function (file) {
      if (order.indexOf(file) === -1) order.push(file);
    });
    return order;
  }

  function eventSlides(record) {
    if (!record) return [];
    var mode = record.mediaMode || "both";
    if (!record.video) mode = "photos";
    else if (!record.photos || !record.photos.length) mode = "video";
    var slides = [];
    eventMediaOrder(record).forEach(function (token) {
      if (token === "video") {
        if (mode !== "photos") slides.push({ kind: "video", file: record.video });
      } else if (mode !== "video") slides.push({ kind: "photo", file: token });
    });
    return slides;
  }

  function frameAspect(ratio) {
    return { site: "16 / 10", instagram: "1 / 1", portrait: "4 / 5", story: "9 / 16", facebook: "1200 / 630" }[ratio] || "16 / 10";
  }

  function frameStyle(frame) {
    var fitted = copyVideoFrame(frame);
    return "--frame:" + frameAspect(fitted.ratio) + ";--zoom:" + fitted.zoom + ";--pan-x:" + fitted.x + "%;--pan-y:" + fitted.y + "%";
  }

  function eventMediaUrl(file, id) {
    var eventId = id || (eventUploads && eventUploads.id) || "";
    return "/api/admin/events/media?id=" + encodeURIComponent(eventId) + "&file=" + encodeURIComponent(file);
  }

  function activePreviewPhotos() {
    if (previewingSaved) {
      var saved = eventById(previewingSaved);
      if (saved && saved.photos) return saved.photos;
    }
    return (eventUploads && eventUploads.photos) || [];
  }

  function eventPhotoFigures(draft) {
    return draft.photos.map(function (file, index) {
      return "<figure><button type=\"button\" class=\"photo-thumb\" data-adjust-draft-photo=\"" + index + "\" aria-label=\"Recortar foto " + (index + 1) + "\"><img src=\"" + escapeHtml(eventMediaUrl(file)) + "\" alt=\"Foto " + (index + 1) + " del evento\"></button><button type=\"button\" data-remove-event-photo=\"" + index + "\">Quitar</button></figure>";
    }).join("");
  }

  function eventVideoBlock(draft) {
    if (!draft.video) return "";
    return "<video controls preload=\"metadata\" src=\"" + escapeHtml(eventMediaUrl(draft.video)) + "\"></video><button type=\"button\" data-remove-event-video>Quitar video</button>";
  }

  function eventShowOptions(draft) {
    if (!draft || !draft.video) return "";
    var mode = draft.mediaMode || "both";
    var choices = [["both", "Video y fotos"], ["video", "Solo el video"], ["photos", "Solo las fotos"]];
    var radios = choices.map(function (choice) {
      return "<label class=\"media-choice\"><input type=\"radio\" name=\"event-media-mode\" value=\"" + choice[0] + "\"" + (mode === choice[0] ? " checked" : "") + "><span>" + choice[1] + "</span></label>";
    }).join("");
    var mixed = eventSlides({ photos: draft.photos, video: draft.video, mediaMode: "both", mediaOrder: draft.mediaOrder });
    var order = "";
    if (mode === "both" && mixed.length > 1) {
      order = "<p class=\"field-hint\">El video queda primero. Sube o baja cada pieza para cambiar el orden del carrusel.</p><ol class=\"media-order\">" + mixed.map(function (slide, index) {
        var label = slide.kind === "video" ? "Video" : "Foto " + (draft.photos.indexOf(slide.file) + 1);
        return "<li><span>" + label + "</span><span class=\"media-order-actions\"><button type=\"button\" data-media-move=\"-1\" data-media-index=\"" + index + "\"" + (index === 0 ? " disabled" : "") + " aria-label=\"Subir " + label + "\">↑</button><button type=\"button\" data-media-move=\"1\" data-media-index=\"" + index + "\"" + (index === mixed.length - 1 ? " disabled" : "") + " aria-label=\"Bajar " + label + "\">↓</button></span></li>";
      }).join("") + "</ol>";
    }
    return "<div class=\"event-show-options\"><span class=\"field-label\">Qué se muestra en el sitio</span><div class=\"media-choices\">" + radios + "</div>" + order + "<p class=\"event-video-adjust\"><button type=\"button\" class=\"btn btn-ghost\" id=\"adjust-event-video\">Ajustar video</button></p></div>";
  }

  function paintEventMedia() {
    var draft = eventUploads;
    var list = document.getElementById("event-photo-list");
    var drop = document.getElementById("event-photo-drop");
    var lead = document.getElementById("event-photo-lead");
    var add = document.getElementById("event-photo-add");
    var preview = document.getElementById("event-video-preview");
    var videoLead = document.getElementById("event-video-lead");
    var videoAdd = document.getElementById("event-video-add");
    if (!draft || !list) return;
    var full = draft.photos.length >= 5;
    list.innerHTML = eventPhotoFigures(draft);
    if (drop) drop.classList.toggle("is-full", full);
    if (lead) lead.textContent = full ? "Ya hay 5 fotos. Quita una para agregar otra." : "Suelta las fotos aquí o elige archivos.";
    if (add) add.disabled = full;
    if (preview) preview.innerHTML = eventVideoBlock(draft);
    if (videoLead) videoLead.textContent = draft.video ? "Suelta otro video para reemplazarlo." : "Suelta el video aquí o elige un archivo.";
    if (videoAdd) videoAdd.textContent = draft.video ? "Cambiar video" : "Elegir video";
    var options = document.getElementById("event-show-options");
    if (options) options.innerHTML = eventShowOptions(draft);
    paintEventPreview();
  }

  function eventMediaStatus(id, message) {
    var node = document.getElementById(id);
    if (node) node.textContent = message || "";
    if (message) setStatus(message);
  }

  function savedEventFiles(id) {
    var item = eventById(id);
    return {
      photos: item && item.photos ? item.photos.slice() : [],
      video: item && item.video ? item.video : ""
    };
  }

  function releaseEventFile(id, file) {
    if (!file) return Promise.resolve();
    var saved = savedEventFiles(id);
    if (saved.photos.indexOf(file) !== -1 || saved.video === file) return Promise.resolve();
    return api("/api/admin/events/media/remove", "POST", { id: id, file: file });
  }

  function eventUploadsNeedCleanup(draft) {
    if (!draft) return false;
    var saved = savedEventFiles(draft.id);
    if (draft.video && draft.video !== saved.video) return true;
    return draft.photos.some(function (name) { return saved.photos.indexOf(name) === -1; });
  }

  function discardEventDraft() {
    var draft = eventUploads;
    eventUploads = null;
    editingEvent = "";
    if (!eventUploadsNeedCleanup(draft)) return Promise.resolve();
    return api("/api/admin/events", "PUT", { events: events }).then(function (result) {
      if (result.ok && result.data && result.data.events) events = result.data.events;
    });
  }

  function saveEventRecord() {
    return api("/api/admin/events", "PUT", { events: events }).then(function (result) {
      if (!result.ok) throw new Error((result.data && result.data.error) || "No se pudieron guardar las fotos.");
      events = result.data.events;
    });
  }

  function saveDraftMedia() {
    var draft = eventUploads;
    var saved = draft ? eventById(draft.id) : null;
    if (!saved) return Promise.resolve(false);
    saved.photos = draft.photos.slice();
    saved.video = draft.video || "";
    saved.mediaMode = draft.mediaMode || "both";
    saved.mediaOrder = eventMediaOrder(draft);
    saved.videoFrame = copyVideoFrame(draft.videoFrame);
    return saveEventRecord().then(function () {
      var fresh = eventById(draft.id);
      if (fresh && eventUploads && eventUploads.id === draft.id) {
        eventUploads.photos = fresh.photos.slice();
        eventUploads.video = fresh.video || "";
        eventUploads.mediaMode = fresh.mediaMode || "both";
        eventUploads.mediaOrder = (fresh.mediaOrder || []).slice();
        eventUploads.videoFrame = copyVideoFrame(fresh.videoFrame);
      }
      return true;
    });
  }

  function uploadEventPhoto(id, dataUrl) {
    var data = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",")[1] : dataUrl;
    return api("/api/admin/events/photo", "POST", { id: id, data: data }).then(function (result) {
      if (!result.ok) throw new Error((result.data && result.data.error) || "La foto no se pudo guardar.");
      return result.data.file;
    });
  }

  var eventPhotoRatios = {
    site: { name: "Sitio", outW: 1600, outH: 1000, hint: "Horizontal 16:10, como la foto en la página Eventos." },
    instagram: { name: "Instagram", outW: 1080, outH: 1080, hint: "Cuadrada, como una publicación de Instagram." },
    portrait: { name: "Vertical", outW: 1080, outH: 1350, hint: "Vertical 4:5, como una publicación de Instagram." },
    story: { name: "Historia", outW: 1080, outH: 1920, hint: "Historia 9:16, como Instagram o WhatsApp." },
    facebook: { name: "Facebook", outW: 1200, outH: 630, hint: "Horizontal ancha, como una publicación de Facebook." }
  };
  var eventPhotoMasters = {};
  var eventEditorImage = null;
  var eventEditorFile = "";
  var eventEditorEventId = "";
  var eventEditorIndex = -1;
  var eventEditorSource = "";
  var eventEditorRatio = "site";
  var eventEditorZoom = 1;
  var eventEditorX = 0;
  var eventEditorY = 0;
  var eventEditorDrag = null;

  function eventEditorFrame() {
    var ratio = eventPhotoRatios[eventEditorRatio] || eventPhotoRatios.site;
    var maxW = 320;
    var maxH = 360;
    var scale = Math.min(maxW / ratio.outW, maxH / ratio.outH);
    return { w: Math.max(1, Math.round(ratio.outW * scale)), h: Math.max(1, Math.round(ratio.outH * scale)), outW: ratio.outW, outH: ratio.outH };
  }

  function paintEventPhotoRatio() {
    document.querySelectorAll("[data-photo-ratio]").forEach(function (button) {
      var on = button.getAttribute("data-photo-ratio") === eventEditorRatio;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var hint = document.getElementById("event-photo-ratio-hint");
    var ratio = eventPhotoRatios[eventEditorRatio] || eventPhotoRatios.site;
    if (hint) hint.textContent = ratio.hint;
  }

  function paintEventPhotoEditor() {
    var canvas = document.getElementById("event-photo-canvas");
    if (!canvas || !eventEditorImage) return;
    var frame = eventEditorFrame();
    var context = canvas.getContext("2d");
    var pixel = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = frame.w * pixel;
    canvas.height = frame.h * pixel;
    canvas.style.width = frame.w + "px";
    canvas.style.height = frame.h + "px";
    context.setTransform(pixel, 0, 0, pixel, 0, 0);
    var cover = Math.max(frame.w / eventEditorImage.width, frame.h / eventEditorImage.height);
    var scale = cover * eventEditorZoom;
    var width = eventEditorImage.width * scale;
    var height = eventEditorImage.height * scale;
    var minX = frame.w - width;
    var minY = frame.h - height;
    if (eventEditorX > 0) eventEditorX = 0;
    if (eventEditorY > 0) eventEditorY = 0;
    if (eventEditorX < minX) eventEditorX = minX;
    if (eventEditorY < minY) eventEditorY = minY;
    context.fillStyle = "#121212";
    context.fillRect(0, 0, frame.w, frame.h);
    context.drawImage(eventEditorImage, eventEditorX, eventEditorY, width, height);
  }

  function setEventEditorZoom(next) {
    if (!eventEditorImage) return;
    var frame = eventEditorFrame();
    var zoom = Math.min(3, Math.max(1, next));
    var cover = Math.max(frame.w / eventEditorImage.width, frame.h / eventEditorImage.height);
    var oldScale = cover * eventEditorZoom;
    var nextScale = cover * zoom;
    var centerX = (frame.w / 2 - eventEditorX) / oldScale;
    var centerY = (frame.h / 2 - eventEditorY) / oldScale;
    eventEditorZoom = zoom;
    eventEditorX = frame.w / 2 - centerX * nextScale;
    eventEditorY = frame.h / 2 - centerY * nextScale;
    var slider = document.getElementById("event-photo-zoom");
    if (slider) slider.value = String(zoom);
    paintEventPhotoEditor();
  }

  function resetEventEditorFrame() {
    if (!eventEditorImage) return;
    var frame = eventEditorFrame();
    var cover = Math.max(frame.w / eventEditorImage.width, frame.h / eventEditorImage.height);
    eventEditorZoom = 1;
    eventEditorX = (frame.w - eventEditorImage.width * cover) / 2;
    eventEditorY = (frame.h - eventEditorImage.height * cover) / 2;
    var slider = document.getElementById("event-photo-zoom");
    if (slider) slider.value = "1";
    paintEventPhotoRatio();
    paintEventPhotoEditor();
  }

  function eventCropData() {
    var frame = eventEditorFrame();
    var cover = Math.max(frame.w / eventEditorImage.width, frame.h / eventEditorImage.height);
    var scale = cover * eventEditorZoom;
    var canvas = document.createElement("canvas");
    canvas.width = frame.outW;
    canvas.height = frame.outH;
    var context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, frame.outW, frame.outH);
    context.drawImage(eventEditorImage, Math.max(0, -eventEditorX / scale), Math.max(0, -eventEditorY / scale), frame.w / scale, frame.h / scale, 0, 0, frame.outW, frame.outH);
    var quality = 0.86;
    var data = canvas.toDataURL("image/jpeg", quality);
    while (quality > 0.52 && data.length > 3000000) {
      quality -= 0.08;
      data = canvas.toDataURL("image/jpeg", quality);
    }
    return data;
  }

  function previewPhotoTarget() {
    if (previewingSaved) {
      var saved = eventById(previewingSaved);
      if (saved) return { id: saved.id, photos: saved.photos || [], record: saved, source: "preview" };
    }
    return { id: eventUploads && eventUploads.id, photos: (eventUploads && eventUploads.photos) || [], record: eventUploads, source: "draft" };
  }

  function showEventPhotoEditor(image, file) {
    eventEditorImage = image;
    eventEditorFile = file;
    if (!eventPhotoMasters[file]) eventPhotoMasters[file] = image;
    eventEditorRatio = "site";
    var status = document.getElementById("event-photo-editor-status");
    if (status) status.textContent = "";
    var save = document.getElementById("apply-event-photo");
    if (save) save.disabled = false;
    resetEventEditorFrame();
    var dialog = document.getElementById("event-photo-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }

  function openEventPhotoEditor(eventId, index, source) {
    var photos = source === "draft" && eventUploads && eventUploads.id === eventId ? eventUploads.photos : ((eventById(eventId) || {}).photos || []);
    if (source === "preview") {
      var target = previewPhotoTarget();
      eventId = target.id;
      photos = target.photos;
      source = target.source;
    }
    var file = photos[index];
    if (!eventId || !file) return;
    if (eventUploads && eventUploads.id !== eventId && eventUploadsNeedCleanup(eventUploads)) {
      eventMediaStatus("event-photo-status", "Guarda o cancela el evento que estás escribiendo antes de recortar esta foto.");
      return;
    }
    eventEditorEventId = eventId;
    eventEditorIndex = index;
    eventEditorSource = source;
    var master = eventPhotoMasters[file];
    if (master) {
      showEventPhotoEditor(master, file);
      return;
    }
    var image = new Image();
    image.onload = function () { showEventPhotoEditor(image, file); };
    image.onerror = function () { eventMediaStatus("event-photo-status", "La foto no se pudo abrir."); };
    image.src = eventMediaUrl(file, eventId);
  }

  function closeEventPhotoEditor() {
    eventEditorImage = null;
    eventEditorDrag = null;
    eventEditorIndex = -1;
    var dialog = document.getElementById("event-photo-dialog");
    if (dialog && dialog.open) dialog.close();
  }

  function applyEventPhotoEdit() {
    if (!eventEditorImage || eventEditorIndex < 0 || !eventEditorEventId) return;
    var eventId = eventEditorEventId;
    var index = eventEditorIndex;
    var source = eventEditorSource;
    var previous = eventEditorFile;
    var save = document.getElementById("apply-event-photo");
    var status = document.getElementById("event-photo-editor-status");
    if (save) save.disabled = true;
    if (status) status.textContent = "Guardando…";
    uploadEventPhoto(eventId, eventCropData()).then(function (filename) {
      if (eventPhotoMasters[previous]) eventPhotoMasters[filename] = eventPhotoMasters[previous];
      var draft = eventUploads && eventUploads.id === eventId ? eventUploads : null;
      var saved = eventById(eventId);
      var previousPhotos = saved && saved.photos ? saved.photos.slice() : null;
      var previousVideo = saved ? (saved.video || "") : "";
      if (draft && draft.photos[index] !== undefined) draft.photos[index] = filename;
      else if (saved && saved.photos && saved.photos[index] !== undefined) saved.photos[index] = filename;
      var persist = saved ? (draft ? saveDraftMedia() : saveEventRecord()) : Promise.resolve(false);
      return persist.then(function () {
        return releaseEventFile(eventId, previous).then(function () { return filename; });
      }).catch(function (error) {
        if (draft && draft.photos[index] === filename) draft.photos[index] = previous;
        if (previousPhotos && saved) saved.photos = previousPhotos;
        if (saved) saved.video = previousVideo;
        return releaseEventFile(eventId, filename).then(function () { throw error; });
      });
    }).then(function () {
      closeEventPhotoEditor();
      var media = document.getElementById("event-preview-media");
      if (media) media.removeAttribute("data-media");
      if (source === "draft") showFormPreview();
      else paintEventPreview();
      if (eventUploads && eventUploads.id === eventId) paintEventMedia();
      eventMediaStatus("event-photo-status", "Foto recortada. La vista previa muestra cómo queda en la página.");
    }).catch(function (error) {
      if (save) save.disabled = false;
      if (status) status.textContent = error.message || "No se pudo guardar la foto.";
    });
  }

  function addEventPhotos(fileList) {
    var draft = eventDraft();
    if (eventUploadBusy) return;
    var incoming = Array.prototype.slice.call(fileList || []);
    var room = 5 - draft.photos.length;
    if (!incoming.length || room <= 0) {
      if (room <= 0) eventMediaStatus("event-photo-status", "Solo puedes tener 5 fotos.");
      return;
    }
    var rejected = incoming.filter(function (file) { return !acceptedPhoto(file); });
    var files = incoming.filter(acceptedPhoto);
    if (!files.length) {
      eventMediaStatus("event-photo-status", "La foto debe ser JPG, PNG o WebP.");
      return;
    }
    if (files.length > room) {
      eventMediaStatus("event-photo-status", "Solo puedes tener 5 fotos. Se agregaron las primeras " + room + ".");
      files = files.slice(0, room);
    } else if (rejected.length) eventMediaStatus("event-photo-status", "Algunas fotos no son JPG, PNG o WebP y no se agregaron.");
    else eventMediaStatus("event-photo-status", "Subiendo fotos…");
    var eventId = draft.id;
    eventUploadBusy = true;
    files.reduce(function (chain, file) {
      return chain.then(function () { return readPhotoFile(file); }).then(function (data) {
        if (!eventUploads || eventUploads.id !== eventId) return null;
        return uploadEventPhoto(eventId, data).then(function (filename) {
          if (!eventUploads || eventUploads.id !== eventId) return releaseEventFile(eventId, filename);
          if (eventUploads.photos.indexOf(filename) === -1) eventUploads.photos.push(filename);
          paintEventMedia();
        });
      });
    }, Promise.resolve()).then(function () {
      if (!eventUploads || eventUploads.id !== eventId) return;
      return saveDraftMedia().then(function (savedNow) {
        if (rejected.length) return;
        var saved = eventById(eventId);
        if (!savedNow) eventMediaStatus("event-photo-status", "Fotos guardadas. Se publican al guardar el evento.");
        else if (saved && saved.published && eventUploads.photos.length > 1) eventMediaStatus("event-photo-status", "Fotos guardadas. El sitio las muestra en un carrusel.");
        else if (saved && saved.published) eventMediaStatus("event-photo-status", "Foto guardada. Ya se ve en el sitio.");
        else eventMediaStatus("event-photo-status", "Fotos guardadas. Enciende En el sitio para mostrarlas.");
      });
    }).catch(function (error) {
      eventMediaStatus("event-photo-status", error.message || "La foto no se pudo leer.");
    }).then(function () {
      eventUploadBusy = false;
    });
  }

  function acceptedVideo(file) {
    var type = String(file.type || "").toLowerCase();
    var name = String(file.name || "");
    if (type === "video/mp4" || type === "video/webm") return true;
    return /\.(mp4|webm)$/i.test(name) && (!type || type === "application/octet-stream");
  }

  function addEventVideo(file) {
    var draft = eventDraft();
    if (eventUploadBusy || !file) return;
    var name = String(file.name || "");
    if (/\.(mov|m4v)$/i.test(name) || String(file.type || "").toLowerCase() === "video/quicktime") {
      eventMediaStatus("event-video-status", "El video debe ser MP4 o WebM.");
      return;
    }
    if (!acceptedVideo(file)) {
      eventMediaStatus("event-video-status", "El video debe ser MP4 o WebM.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      eventMediaStatus("event-video-status", "El video debe pesar menos de 30 MB.");
      return;
    }
    var eventId = draft.id;
    var previous = draft.video;
    eventUploadBusy = true;
    eventMediaStatus("event-video-status", "Subiendo video…");
    fetch("/api/admin/events/video?id=" + encodeURIComponent(eventId), {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-CSRF-Token": csrf
      },
      body: file
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) throw new Error(data.error || "El video no se pudo guardar.");
        return data.file;
      });
    }).then(function (filename) {
      if (!eventUploads || eventUploads.id !== eventId) return releaseEventFile(eventId, filename);
      eventUploads.video = filename;
      if (eventUploads.mediaOrder.indexOf("video") === -1) eventUploads.mediaOrder.unshift("video");
      if (!eventUploads.mediaMode) eventUploads.mediaMode = "both";
      paintEventMedia();
      var releasePrevious = previous && previous !== filename ? releaseEventFile(eventId, previous) : Promise.resolve();
      return releasePrevious.then(function () { return saveDraftMedia(); }).then(function () {
        eventMediaStatus("event-video-status", "Video guardado. Elige qué se muestra en el sitio.");
      });
    }).catch(function (error) {
      eventMediaStatus("event-video-status", error.message || "El video no se pudo guardar.");
    }).then(function () {
      eventUploadBusy = false;
    });
  }

  function eventForm() {
    var draft = eventDraft();
    var current = editingEvent ? (eventById(editingEvent) || {}) : {};
    var full = draft.photos.length >= 5;
    return [
      "<form id=\"event-form\" class=\"form-grid\">",
      "<label class=\"field wide\">Nombre<input name=\"name\" required maxlength=\"80\" value=\"" + escapeHtml(current.name || "") + "\"></label>",
      "<label class=\"field\">Fecha<input name=\"date\" type=\"date\" required value=\"" + escapeHtml(current.date || "") + "\"></label>",
      "<label class=\"field\">Hora<input name=\"time\" type=\"time\" value=\"" + escapeHtml(current.time || "") + "\"></label>",
      "<label class=\"field wide\">Lugar<input name=\"place\" maxlength=\"120\" value=\"" + escapeHtml(current.place || "") + "\"></label>",
      "<div class=\"wide notes-editor\"><span class=\"field-label\">Nota</span><div class=\"notes-tools\"><button type=\"button\" data-event-note-cmd=\"bold\">Negrita</button><button type=\"button\" data-event-note-cmd=\"italic\">Cursiva</button><button type=\"button\" data-event-note-cmd=\"underline\">Subrayado</button><button type=\"button\" data-event-note-cmd=\"insertUnorderedList\">Lista</button></div><div id=\"event-note-input\" class=\"notes-input\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Nota\"></div><p id=\"event-note-count\" class=\"notes-count\" aria-live=\"polite\">0 / 10000</p></div>",
      "<div class=\"wide\"><span class=\"field-label\">Fotos</span><div id=\"event-photo-drop\" class=\"photo-drop" + (full ? " is-full" : "") + "\"><p id=\"event-photo-lead\">" + (full ? "Ya hay 5 fotos. Quita una para agregar otra." : "Suelta las fotos aquí o elige archivos.") + "</p><p class=\"field-hint\">Hasta 5 fotos, en JPG, PNG o WebP. Si hay más de una, la página Eventos las muestra en un carrusel. Haz clic en una foto para recortarla.</p><button class=\"btn btn-ghost\" type=\"button\" id=\"event-photo-add\"" + (full ? " disabled" : "") + ">Elegir fotos</button><input id=\"event-photo-file\" type=\"file\" accept=\"image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp\" multiple hidden></div><div id=\"event-photo-list\" class=\"photo-list\">" + eventPhotoFigures(draft) + "</div><p id=\"event-photo-status\" class=\"photo-status\" role=\"status\"></p></div>",
      "<div class=\"wide\"><span class=\"field-label\">Video</span><div id=\"event-video-drop\" class=\"photo-drop\"><p id=\"event-video-lead\">" + (draft.video ? "Suelta otro video para reemplazarlo." : "Suelta el video aquí o elige un archivo.") + "</p><p class=\"field-hint\">Un solo video, en MP4 o WebM, de hasta 30 MB. Puedes encuadrarlo al formato del sitio o de una red social.</p><button class=\"btn btn-ghost\" type=\"button\" id=\"event-video-add\">" + (draft.video ? "Cambiar video" : "Elegir video") + "</button><input id=\"event-video-file\" type=\"file\" accept=\"video/mp4,video/webm,.mp4,.webm\" hidden></div><div id=\"event-video-preview\" class=\"event-video-preview\">" + eventVideoBlock(draft) + "</div><div id=\"event-show-options\">" + eventShowOptions(draft) + "</div><p id=\"event-video-status\" class=\"photo-status\" role=\"status\"></p></div>",
      "<div class=\"wide admin-actions\"><button class=\"btn\" type=\"submit\">" + (editingEvent ? "Guardar evento" : "Agregar evento") + "</button>" + (editingEvent ? "<button class=\"btn btn-ghost\" type=\"button\" id=\"cancel-event\">Cancelar</button>" : "") + "</div>",
      "</form>"
    ].join("");
  }

  function eventsPanel() {
    var list = events.length ? events.map(function (item) {
      var when = item.date + (item.time ? " · " + item.time : "");
      var flags = [];
      if (item.published) flags.push("En el sitio");
      var count = item.photos && item.photos.length ? item.photos.length : 0;
      if (count) flags.push(count + (count === 1 ? " foto" : " fotos"));
      if (item.video) flags.push("Video");
      var flagHtml = flags.length ? "<p class=\"record-flags\">" + flags.map(function (flag) { return "<span class=\"record-flag\">" + escapeHtml(flag) + "</span>"; }).join("") + "</p>" : "";
      return "<article class=\"record" + (previewingSaved === item.id ? " is-previewing" : "") + "\"><div><strong>" + escapeHtml(item.name) + "</strong><p>" + escapeHtml(when) + (item.place ? " · " + escapeHtml(item.place) : "") + "</p>" + flagHtml + "</div><div class=\"record-actions\"><label class=\"switch\"><input type=\"checkbox\" data-publish-event=\"" + escapeHtml(item.id) + "\"" + (item.published ? " checked" : "") + "><span class=\"switch-track\" aria-hidden=\"true\"></span><span>En el sitio</span></label><button class=\"btn btn-ghost\" type=\"button\" data-preview-event=\"" + escapeHtml(item.id) + "\">" + (previewingSaved === item.id ? "Cerrar vista" : "Vista previa") + "</button><button class=\"btn btn-ghost\" type=\"button\" data-edit-event=\"" + escapeHtml(item.id) + "\">Editar</button><button class=\"btn btn-ghost\" type=\"button\" data-delete-event=\"" + escapeHtml(item.id) + "\">Quitar</button></div></article>";
    }).join("") : "<p>No hay eventos.</p>";
    var pageOn = settings && settings.pages && settings.pages.eventos && settings.pages.eventos.visible !== false;
    var pageSwitch = "<article class=\"panel-card\"><p>Muestra u oculta la pestaña Eventos en el menú del sitio. Si está apagada, la página tampoco se abre.</p><label class=\"switch\"><input type=\"checkbox\" data-visible=\"eventos\"" + (pageOn ? " checked" : "") + "><span class=\"switch-track\" aria-hidden=\"true\"></span><span>Visible en el menú y en la página</span></label></article>";
    return pageSwitch + "<article class=\"panel-card events-panel\"><p>Los eventos con el interruptor encendido se ven en la página Eventos del sitio. Desde ahí se pueden compartir.</p><div class=\"event-workspace\"><div class=\"event-form-column\">" + eventForm() + "</div><aside class=\"event-preview-column\"><p class=\"field-label preview-heading\"><span>Vista previa</span><button type=\"button\" class=\"btn btn-ghost\" id=\"close-event-preview\"" + (previewingSaved ? "" : " hidden") + ">Cerrar</button></p><article class=\"event-preview-card\"><p id=\"event-preview-empty\" class=\"event-preview-empty\" hidden>Nada que previsualizar.</p><p id=\"event-preview-state\" class=\"field-hint\" hidden></p><h2 id=\"event-preview-title\">Nombre del evento</h2><p id=\"event-preview-when\">Fecha y hora</p><p id=\"event-preview-place\" hidden></p><div id=\"event-preview-media\"></div><p class=\"event-preview-adjust\"><button type=\"button\" class=\"btn btn-ghost\" id=\"event-preview-adjust\" hidden>Ajustar foto</button></p><div id=\"event-preview-note\" class=\"event-preview-note\" hidden></div><p class=\"event-preview-share\"><button type=\"button\" class=\"btn\" disabled>Compartir</button></p></article></aside></div><div class=\"record-list\">" + list + "</div></article>";
  }

  function eventNoteValue() {
    var input = document.getElementById("event-note-input");
    if (!input) return "";
    var html = sanitizeNotes(input.innerHTML);
    return notesText(html) ? html : "";
  }

  function showFormPreview() {
    previewDismissed = false;
    previewingSaved = "";
    document.querySelectorAll(".record.is-previewing").forEach(function (row) { row.classList.remove("is-previewing"); });
    document.querySelectorAll("[data-preview-event]").forEach(function (button) { button.textContent = "Vista previa"; });
    var closePreview = document.getElementById("close-event-preview");
    if (closePreview) closePreview.hidden = true;
    paintEventPreview();
  }

  function closeEventPreview() {
    previewingSaved = "";
    previewDismissed = true;
    document.querySelectorAll(".record.is-previewing").forEach(function (row) { row.classList.remove("is-previewing"); });
    document.querySelectorAll("[data-preview-event]").forEach(function (button) { button.textContent = "Vista previa"; });
    var closePreview = document.getElementById("close-event-preview");
    if (closePreview) closePreview.hidden = true;
    paintEventPreview();
  }

  function paintEventPreview() {
    var title = document.getElementById("event-preview-title");
    var when = document.getElementById("event-preview-when");
    var placeNode = document.getElementById("event-preview-place");
    var media = document.getElementById("event-preview-media");
    var noteNode = document.getElementById("event-preview-note");
    var state = document.getElementById("event-preview-state");
    var form = document.getElementById("event-form");
    if (!title || !form || !media) return;
    var card = title.closest(".event-preview-card");
    var emptyNode = document.getElementById("event-preview-empty");
    if (previewDismissed && !previewingSaved) {
      if (card) card.classList.add("is-empty");
      if (emptyNode) emptyNode.hidden = false;
      media.removeAttribute("data-media");
      return;
    }
    if (card) card.classList.remove("is-empty");
    if (emptyNode) emptyNode.hidden = true;
    var saved = previewingSaved ? eventById(previewingSaved) : null;
    var name = saved ? String(saved.name || "").trim() : String((form.querySelector("[name=name]") || {}).value || "").trim();
    var date = saved ? String(saved.date || "") : String((form.querySelector("[name=date]") || {}).value || "");
    var time = saved ? String(saved.time || "") : String((form.querySelector("[name=time]") || {}).value || "");
    var place = saved ? String(saved.place || "").trim() : String((form.querySelector("[name=place]") || {}).value || "").trim();
    var note = saved ? sanitizeNotes(saved.note || "") : eventNoteValue();
    var source = saved || eventUploads || { photos: [], video: "", mediaMode: "both", mediaOrder: [], videoFrame: copyVideoFrame() };
    var slides = eventSlides(source);
    var frame = copyVideoFrame(source.videoFrame);
    var mediaId = saved ? saved.id : (eventUploads && eventUploads.id);
    if (state) {
      state.hidden = !saved;
      state.textContent = saved ? (saved.published ? "Publicado en Eventos." : "No está en el sitio. Enciende En el sitio para publicarlo.") : "";
    }
    title.textContent = name || "Nombre del evento";
    title.classList.toggle("is-empty", !name);
    var whenText = "";
    var parts = date.split("-");
    if (parts.length === 3) {
      var parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() === Number(parts[0])) {
        whenText = parsed.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        whenText = whenText.charAt(0).toUpperCase() + whenText.slice(1);
      }
    }
    if (time) whenText = whenText ? whenText + " · " + time : time;
    when.textContent = whenText || "Fecha y hora";
    when.classList.toggle("is-empty", !whenText);
    placeNode.hidden = !place;
    placeNode.textContent = place;
    if (!notesText(note)) note = "";
    noteNode.hidden = !note;
    noteNode.innerHTML = note;
    var adjust = document.getElementById("event-preview-adjust");
    var currentSlide = slides[eventPreviewIndex] || slides[0] || null;
    if (adjust) {
      adjust.hidden = !currentSlide;
      adjust.textContent = currentSlide && currentSlide.kind === "video" ? "Ajustar video" : "Ajustar foto";
    }
    var signature = (mediaId || "form") + "|" + slides.map(function (slide) { return slide.kind + ":" + slide.file; }).join(",") + "|" + (source.mediaMode || "both") + "|" + frame.ratio + "|" + frame.zoom + "|" + frame.x + "|" + frame.y + "|" + eventPreviewIndex;
    if (media.getAttribute("data-media") === signature) return;
    media.setAttribute("data-media", signature);
    if (eventPreviewIndex >= slides.length) eventPreviewIndex = 0;
    currentSlide = slides[eventPreviewIndex] || null;
    function previewPiece(slide, index) {
      var on = index === eventPreviewIndex;
      if (slide.kind === "video") return "<div class=\"event-video-fit" + (on ? " is-on" : "") + "\" style=\"" + frameStyle(frame) + "\"><video controls preload=\"metadata\" src=\"" + escapeHtml(eventMediaUrl(slide.file, mediaId)) + "\"></video></div>";
      return "<img data-preview-photo src=\"" + escapeHtml(eventMediaUrl(slide.file, mediaId)) + "\" alt=\"Foto del evento. Pulsa para recortarla.\"" + (on ? " class=\"is-on\"" : "") + ">";
    }
    var html = "";
    if (slides.length === 1 && slides[0].kind === "photo") html = "<img class=\"event-preview-photo\" data-preview-photo src=\"" + escapeHtml(eventMediaUrl(slides[0].file, mediaId)) + "\" alt=\"Foto del evento. Pulsa para recortarla.\">";
    else if (slides.length === 1) html = previewPiece(slides[0], 0);
    else if (slides.length > 1) {
      var aspect = currentSlide && currentSlide.kind === "video" ? frameAspect(frame.ratio) : "16 / 10";
      html = "<div class=\"event-preview-carousel\"><div class=\"event-preview-slides\" style=\"aspect-ratio:" + aspect + "\">" + slides.map(previewPiece).join("") + "</div><button type=\"button\" class=\"event-preview-nav\" data-preview-step=\"-1\" aria-label=\"Anterior\">‹</button><button type=\"button\" class=\"event-preview-nav is-next\" data-preview-step=\"1\" aria-label=\"Siguiente\">›</button><div class=\"event-preview-dots\">" + slides.map(function (slide, index) {
        var photoCount = 0;
        slides.slice(0, index + 1).forEach(function (item) { if (item.kind === "photo") photoCount += 1; });
        var label = slide.kind === "video" ? "Video" : "Foto " + photoCount;
        return "<button type=\"button\" data-preview-dot=\"" + index + "\" aria-label=\"" + label + "\"" + (index === eventPreviewIndex ? " class=\"is-on\" aria-current=\"true\"" : "") + "></button>";
      }).join("") + "</div></div>";
    }
    media.innerHTML = html;
  }

  function bindEventEditor() {
    var input = document.getElementById("event-note-input");
    var current = editingEvent ? (eventById(editingEvent) || {}) : {};
    if (input) input.innerHTML = sanitizeNotes(current.note || "");
    bindRichField(input, document.getElementById("event-note-count"), eventNoteLimit, showFormPreview);
    var form = document.getElementById("event-form");
    if (form) {
      form.addEventListener("input", showFormPreview);
      form.addEventListener("change", function (event) {
        if (event.target.name === "event-media-mode" && eventUploads) {
          eventUploads.mediaMode = event.target.value;
          var box = document.getElementById("event-preview-media");
          if (box) box.removeAttribute("data-media");
          paintEventMedia();
          saveDraftMedia().catch(function () {});
          return;
        }
        showFormPreview();
      });
    }
    paintEventPreview();
  }

  function selectOptions(list, current) {
    var values = list.slice();
    if (current && values.indexOf(current) === -1) values.unshift(current);
    return "<option value=\"\">Seleccionar</option>" + values.map(function (item) {
      return "<option value=\"" + escapeHtml(item) + "\"" + (item === current ? " selected" : "") + ">" + escapeHtml(item) + "</option>";
    }).join("");
  }

  function rosterKey(item) {
    var name = String(item.name || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
    var age = Number(item.age);
    if (!name || !Number.isInteger(age)) return "";
    return name + "|" + age;
  }

  function playerAgeError(age) {
    if (!Number.isInteger(age) || age > 120) return "La edad debe ser un número entre 18 y 120.";
    if (age < 18) return "No se puede guardar una jugadora menor de 18 años.";
    return "";
  }

  function pad2(number) { return (number < 10 ? "0" : "") + number; }

  function todayIso() {
    var now = new Date();
    return now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
  }

  function parseIso(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function isoFromDate(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function formatDate(value) {
    var date = parseIso(value);
    if (!date) return "";
    return date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  }

  function statusById(id) {
    for (var i = 0; i < statuses.length; i += 1) {
      if (statuses[i].id === id) return statuses[i];
    }
    return statuses[0];
  }

  function statusOptions(current) {
    return statuses.map(function (item) {
      return "<option value=\"" + item.id + "\"" + (item.id === current ? " selected" : "") + ">" + escapeHtml(item.label) + "</option>";
    }).join("");
  }

  function paymentCycle(dueIso, today) {
    var due = parseIso(dueIso);
    if (!due) return null;
    var dueDay = due.getDate();
    function startOf(year, month) {
      var last = new Date(year, month, 0).getDate();
      return new Date(year, month - 1, Math.min(dueDay, last));
    }
    var day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var start = startOf(day.getFullYear(), day.getMonth() + 1);
    if (start > day) start = startOf(day.getFullYear(), day.getMonth());
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4);
    var nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    var nextStart = startOf(nextMonth.getFullYear(), nextMonth.getMonth() + 1);
    return { start: start, end: end, nextStart: nextStart };
  }

  function paymentState(item) {
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var cycle = paymentCycle(item.paymentDue, today);
    if (!cycle) return { late: false, paid: false, cycle: null };
    var paidOn = parseIso(item.paidOn);
    var paid = Boolean(paidOn && paidOn >= cycle.start && paidOn < cycle.nextStart);
    return { late: !paid && today > cycle.end, paid: paid, cycle: cycle };
  }

  function effectiveStatus(item) {
    var stored = statusById(item.status).id === item.status ? item.status : "active";
    if (stored === "suspended" || stored === "pending") return stored;
    if (!item.paymentDue) return stored === "late" ? "late" : "active";
    return paymentState(item).late ? "late" : "active";
  }

  function paymentLabel(item) {
    var date = formatDate(item.paymentDue);
    if (!date) return "";
    var cycle = paymentCycle(item.paymentDue, new Date());
    if (!cycle) return date;
    var sameMonth = cycle.start.getMonth() === cycle.end.getMonth();
    var windowText = sameMonth
      ? "días " + cycle.start.getDate() + "–" + cycle.end.getDate()
      : formatDate(isoFromDate(cycle.start)) + " – " + formatDate(isoFromDate(cycle.end));
    return date + " · " + windowText;
  }

  function sanitizeNotes(value) {
    var allowed = { b: 1, strong: 1, i: 1, em: 1, u: 1, p: 1, br: 1, ul: 1, ol: 1, li: 1, div: 1 };
    var html = String(value || "").replace(/\0/g, "").slice(0, 24000);
    html = html.replace(/<\s*(script|style|iframe|object)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
    return html.replace(/<[^>]+>/g, function (tag) {
      var match = /^<\s*(\/)?\s*([a-z0-9]+)/i.exec(tag);
      if (!match) return "";
      var name = match[2].toLowerCase();
      if (!allowed[name]) return "";
      if (name === "br") return "<br>";
      return match[1] ? "</" + name + ">" : "<" + name + ">";
    }).trim();
  }

  function notesText(value) {
    var box = document.createElement("div");
    box.innerHTML = sanitizeNotes(value);
    return String(box.textContent || "").replace(/\s+/g, " ").trim();
  }

  var notesLimit = 4000;

  function notesLength(node) {
    return String(node.textContent || "").length;
  }

  function bindRichField(input, count, limit, onChange) {
    if (!input || !count) return;
    function paint() {
      var used = notesLength(input);
      count.textContent = used + " / " + limit;
      count.classList.toggle("is-full", used >= limit);
      if (onChange) onChange();
    }
    var saved = input.innerHTML;
    input.addEventListener("beforeinput", function (event) {
      var kind = event.inputType || "";
      if (kind.indexOf("delete") === 0 || kind === "historyUndo" || kind === "historyRedo") return;
      var selected = window.getSelection() ? String(window.getSelection().toString() || "").length : 0;
      var extra = 0;
      if (kind === "insertParagraph" || kind === "insertLineBreak") extra = 1;
      else if (event.data != null) extra = String(event.data).length;
      else return;
      if (notesLength(input) - selected + extra > limit) event.preventDefault();
    });
    input.addEventListener("paste", function (event) {
      var text = event.clipboardData ? event.clipboardData.getData("text/plain") : "";
      var selected = window.getSelection() ? String(window.getSelection().toString() || "").length : 0;
      var room = limit - (notesLength(input) - selected);
      event.preventDefault();
      if (room <= 0 || !text) return;
      document.execCommand("insertText", false, text.slice(0, room));
    });
    input.addEventListener("input", function () {
      if (notesLength(input) > limit) input.innerHTML = saved;
      else saved = input.innerHTML;
      paint();
    });
    paint();
  }

  function limitNotesField() {
    bindRichField(document.getElementById("player-notes-input"), document.getElementById("player-notes-count"), notesLimit);
  }

  function readPlayerDraft(form) {
    if (!form || !form.elements) return null;
    return {
      name: form.elements.name.value,
      nickname: form.elements.nickname.value,
      position: form.elements.position.value,
      age: form.elements.age.value,
      country: form.elements.country.value,
      city: form.elements.city.value,
      phone: form.elements.phone.value,
      documentId: form.elements.documentId.value,
      sede: form.elements.sede.value,
      category: form.elements.category.value,
      extra: form.elements.extra.value,
      status: form.elements.status.value,
      addedOn: form.elements.addedOn.value,
      paymentDue: form.elements.paymentDue.value
    };
  }

  function draftInProgress(draft) {
    if (!draft) return false;
    var keys = ["name", "nickname", "position", "age", "country", "city", "phone", "documentId", "sede", "category", "extra", "paymentDue"];
    if (keys.some(function (key) { return String(draft[key] || "").trim(); })) return true;
    if (draft.status && draft.status !== "pending") return true;
    if (draft.addedOn && draft.addedOn !== todayIso()) return true;
    return false;
  }

  function capturePlayerDraft() {
    var form = document.getElementById("player-form");
    if (!form) return;
    var draft = readPlayerDraft(form);
    playerDraft = draftInProgress(draft) ? draft : null;
  }

  function playerForm() {
    var draft = playerDraft || {};
    var status = draft.status || "pending";
    var addedOn = draft.addedOn || todayIso();
    function val(key) { return escapeHtml(draft[key] || ""); }
    return "<form id=\"player-form\" class=\"form-grid roster-form\" novalidate><label class=\"field\">Nombre completo<input name=\"name\" required maxlength=\"80\" value=\"" + val("name") + "\"></label><label class=\"field\">Apodo<input name=\"nickname\" maxlength=\"40\" value=\"" + val("nickname") + "\"></label><label class=\"field\">Posición<select name=\"position\">" + selectOptions(positions, draft.position || "") + "</select></label><label class=\"field\">Edad<input name=\"age\" type=\"number\" min=\"18\" max=\"120\" required value=\"" + val("age") + "\"></label><label class=\"field\">País<input name=\"country\" maxlength=\"60\" value=\"" + val("country") + "\"></label><label class=\"field\">Ciudad<input name=\"city\" maxlength=\"80\" value=\"" + val("city") + "\"></label><label class=\"field\">Teléfono<input name=\"phone\" type=\"tel\" maxlength=\"40\" value=\"" + val("phone") + "\"></label><label class=\"field\">Documento<input name=\"documentId\" type=\"text\" maxlength=\"40\" spellcheck=\"false\" autocomplete=\"off\" value=\"" + val("documentId") + "\"></label><label class=\"field\">Sede de entrenamiento<select name=\"sede\">" + selectOptions(sedes, draft.sede || "") + "</select></label><label class=\"field\">Categoría<select name=\"category\">" + selectOptions(categories, draft.category || "") + "</select></label><label class=\"field\">Categorías adicionales<select name=\"extra\">" + selectOptions(extras, draft.extra || "") + "</select></label><label class=\"field\">Estado<select name=\"status\">" + statusOptions(status) + "</select></label><label class=\"field\">Agregada el<input name=\"addedOn\" type=\"date\" value=\"" + escapeHtml(addedOn) + "\"></label><label class=\"field\">Vencimiento de la mensualidad<input name=\"paymentDue\" type=\"date\" value=\"" + val("paymentDue") + "\"></label><div class=\"admin-actions\"><button class=\"btn\" type=\"submit\">Agregar jugadora</button></div></form>";
  }

  function rosterEditor(column, item) {
    var key = column[0];
    var value = item[key] == null ? "" : item[key];
    if (key === "position") return "<select class=\"roster-cell\" data-field=\"position\">" + selectOptions(positions, value) + "</select>";
    if (key === "sede") return "<select class=\"roster-cell\" data-field=\"sede\">" + selectOptions(sedes, value) + "</select>";
    if (key === "category") return "<select class=\"roster-cell\" data-field=\"category\">" + selectOptions(categories, value) + "</select>";
    if (key === "extra") return "<select class=\"roster-cell\" data-field=\"extra\">" + selectOptions(extras, value) + "</select>";
    if (key === "age") return "<input class=\"roster-cell\" data-field=\"age\" type=\"number\" min=\"18\" max=\"120\" required value=\"" + escapeHtml(value) + "\">";
    if (key === "status") return "<select class=\"roster-cell\" data-field=\"status\">" + statusOptions(item.status || "active") + "</select>";
    if (key === "addedOn" || key === "paymentDue") return "<input class=\"roster-cell\" data-field=\"" + key + "\" type=\"date\" value=\"" + escapeHtml(value) + "\">";
    if (key === "notes") return "<span class=\"notes-preview\">" + escapeHtml(notesText(item.notes) || "Sin notas") + "</span>";
    if (key === "photos") return cellHtml(item, "photos");
    var max = key === "name" ? 80 : key === "nickname" || key === "phone" || key === "documentId" ? 40 : key === "country" ? 60 : 80;
    var required = key === "name" ? " required" : "";
    return "<input class=\"roster-cell\" data-field=\"" + key + "\" type=\"" + (key === "phone" ? "tel" : "text") + "\" maxlength=\"" + max + "\"" + required + " value=\"" + escapeHtml(value) + "\">";
  }

  function foldText(value) {
    return String(value == null ? "" : value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  }

  function rosterSortState(key) {
    if (rosterSort.key !== key) return "none";
    return rosterSort.dir === "desc" ? "descending" : "ascending";
  }

  function rosterArrow(key) {
    var state = rosterSortState(key);
    if (state === "ascending") return "↑";
    if (state === "descending") return "↓";
    return "↕";
  }

  function filterKind(key) {
    if (key === "addedOn" || key === "paymentDue") return "date";
    if (key === "position" || key === "sede" || key === "category" || key === "extra" || key === "status" || key === "photos") return "list";
    return "text";
  }

  function filterChoices(key) {
    if (key === "photos") return [{ value: "yes", label: "Agregadas" }, { value: "no", label: "No agregadas" }];
    if (key === "status") {
      return statuses.map(function (item) { return { value: item.id, label: item.label }; });
    }
    var base = key === "position" ? positions : key === "sede" ? sedes : key === "category" ? categories : extras;
    var seen = {};
    var choices = [];
    function add(value) {
      var text = String(value || "").trim();
      if (!text || seen[foldText(text)]) return;
      seen[foldText(text)] = true;
      choices.push({ value: text, label: text });
    }
    base.forEach(add);
    players.forEach(function (item) { add(item[key]); });
    return choices;
  }

  function dateRange(key) {
    var value = rosterFilters[key];
    if (!value || typeof value !== "object") return { from: "", to: "" };
    return { from: value.from || "", to: value.to || "" };
  }

  function filterControl(column) {
    var key = column[0];
    var label = "Filtrar " + column[1];
    var current = rosterFilters[key] || "";
    if (filterKind(key) === "date") {
      var range = dateRange(key);
      return "<div class=\"roster-filter-range\"><label>Desde<input class=\"roster-filter\" data-filter=\"" + key + "\" data-range=\"from\" type=\"date\" aria-label=\"Desde " + escapeHtml(column[1]) + "\" value=\"" + escapeHtml(range.from) + "\"></label><label>Hasta<input class=\"roster-filter\" data-filter=\"" + key + "\" data-range=\"to\" type=\"date\" aria-label=\"Hasta " + escapeHtml(column[1]) + "\" value=\"" + escapeHtml(range.to) + "\"></label></div>";
    }
    if (filterKind(key) === "list") {
      var options = "<option value=\"\">Todas</option>" + filterChoices(key).map(function (choice) {
        return "<option value=\"" + escapeHtml(choice.value) + "\"" + (choice.value === current ? " selected" : "") + ">" + escapeHtml(choice.label) + "</option>";
      }).join("");
      return "<select class=\"roster-filter\" data-filter=\"" + key + "\" aria-label=\"" + escapeHtml(label) + "\">" + options + "</select>";
    }
    return "<input class=\"roster-filter\" data-filter=\"" + key + "\" type=\"search\" placeholder=\"Filtrar\" aria-label=\"" + escapeHtml(label) + "\" value=\"" + escapeHtml(current) + "\">";
  }

  function matchesFilter(item, key, query) {
    if (filterKind(key) === "date") {
      var range = dateRange(key);
      var start = range.from;
      var end = range.to;
      if (start && end && start > end) {
        var swap = start;
        start = end;
        end = swap;
      }
      var value = String(item[key] || "");
      if (!value) return false;
      if (start && value < start) return false;
      if (end && value > end) return false;
      return true;
    }
    if (key === "photos") {
      var count = Array.isArray(item.photos) ? item.photos.length : 0;
      return query === "yes" ? count > 0 : count === 0;
    }
    if (key === "status") return effectiveStatus(item) === query;
    if (filterKind(key) === "list") return foldText(item[key]) === foldText(query);
    return foldText(columnValue(item, key)).indexOf(foldText(query)) !== -1;
  }

  function columnValue(item, key) {
    if (key === "status") return statusById(effectiveStatus(item)).label;
    if (key === "photos") return String(Array.isArray(item.photos) ? item.photos.length : 0);
    if (key === "notes") return notesText(item.notes);
    if (key === "paymentDue") return paymentLabel(item);
    if (key === "addedOn") return formatDate(item.addedOn);
    return item[key];
  }

  function visiblePlayers() {
    var filtered = players.filter(function (item) {
      return columns.every(function (column) {
        if (!columnFiltered(column[0])) return true;
        return matchesFilter(item, column[0], String(rosterFilters[column[0]] || "").trim());
      });
    });
    if (!rosterSort.key) return filtered;
    var key = rosterSort.key;
    var dir = rosterSort.dir === "desc" ? -1 : 1;
    return filtered.slice().sort(function (a, b) {
      var aRaw = key === "addedOn" || key === "paymentDue" ? String(a[key] || "") : columnValue(a, key);
      var bRaw = key === "addedOn" || key === "paymentDue" ? String(b[key] || "") : columnValue(b, key);
      var aEmpty = String(aRaw == null ? "" : aRaw).trim() === "";
      var bEmpty = String(bRaw == null ? "" : bRaw).trim() === "";
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (key === "age") return (Number(a.age) - Number(b.age)) * dir;
      return String(aRaw).localeCompare(String(bRaw), "es", { sensitivity: "base", numeric: true }) * dir;
    });
  }

  function cellHtml(item, key) {
    if (key === "status") {
      var id = effectiveStatus(item);
      var meta = statusById(id);
      var hint = meta.hint;
      if (id === "late" && item.status !== "late") hint += " El pago no se registró durante los 5 días de vencimiento.";
      return "<span class=\"status-pill status-" + id + "\" title=\"" + escapeHtml(hint) + "\">" + escapeHtml(meta.label) + "</span>";
    }
    if (key === "name") return escapeHtml(item.name);
    if (key === "addedOn") return escapeHtml(formatDate(item.addedOn));
    if (key === "paymentDue") return escapeHtml(paymentLabel(item));
    if (key === "notes") {
      var text = notesText(item.notes);
      var preview = text.length > 72 ? text.slice(0, 72) + "…" : text;
      return "<button type=\"button\" class=\"notes-preview" + (text ? "" : " is-empty") + "\" data-open-notes=\"" + escapeHtml(item.id) + "\" title=\"Doble clic para ver las notas\">" + escapeHtml(preview || "Sin notas") + "</button>";
    }
    if (key === "photos") {
      var added = Array.isArray(item.photos) && item.photos.length;
      return "<span class=\"photo-state" + (added ? " is-added" : "") + "\">" + (added ? "Agregadas" : "No agregadas") + "</span>";
    }
    return escapeHtml(item[key] == null ? "" : item[key]);
  }

  function rosterRowHtml(rows) {
    var counts = {};
    players.forEach(function (item) {
      var key = rosterKey(item);
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return rows.map(function (item) {
      var duplicate = counts[rosterKey(item)] > 1;
      var editing = item.id === editingPlayer;
      var selected = Boolean(selectedPlayers[item.id]);
      var classes = [];
      if (editing) classes.push("is-editing");
      if (selected) classes.push("is-selected");
      var cells = shownColumns().map(function (column) {
        var marked = duplicate && (column[0] === "name" || column[0] === "age");
        var content = editing ? rosterEditor(column, item) : cellHtml(item, column[0]);
        var notes = column[0] === "notes" ? " data-open-notes=\"" + escapeHtml(item.id) + "\"" : "";
        var classes = [];
        if (marked) classes.push("is-duplicate");
        if (column[0] === "notes") classes.push("roster-notes");
        return "<td" + (classes.length ? " class=\"" + classes.join(" ") + "\"" : "") + (marked ? " title=\"Nombre y edad repetidos\"" : "") + notes + ">" + content + "</td>";
      }).join("");
      var photoCount = Array.isArray(item.photos) ? item.photos.length : 0;
      var actions = editing
        ? "<button class=\"btn\" type=\"button\" data-save-player=\"" + escapeHtml(item.id) + "\">Guardar</button><button class=\"btn btn-ghost\" type=\"button\" data-cancel-edit>Cancelar</button>"
        : "<button class=\"btn btn-ghost\" type=\"button\" data-info-player=\"" + escapeHtml(item.id) + "\"" + (photoCount ? " title=\"" + photoCount + (photoCount === 1 ? " foto guardada" : " fotos guardadas") + "\"" : "") + ">Info" + (photoCount ? " (" + photoCount + ")" : "") + "</button><button class=\"btn btn-ghost\" type=\"button\" data-edit-player=\"" + escapeHtml(item.id) + "\">Editar</button><button class=\"btn btn-ghost\" type=\"button\" data-delete-player=\"" + escapeHtml(item.id) + "\">Quitar</button>";
      var check = "<td class=\"roster-check\"><input type=\"checkbox\" data-select-player=\"" + escapeHtml(item.id) + "\" aria-label=\"Seleccionar a " + escapeHtml(item.name) + "\"" + (selected ? " checked" : "") + "></td>";
      return "<tr" + (classes.length ? " class=\"" + classes.join(" ") + "\"" : "") + ">" + check + cells + "<td class=\"roster-actions\">" + actions + "</td></tr>";
    }).join("");
  }

  function syncRosterSelection() {
    var rows = visiblePlayers();
    var visibleSelected = rows.filter(function (item) { return selectedPlayers[item.id]; }).length;
    var all = document.getElementById("roster-select-all");
    if (all) {
      all.checked = rows.length > 0 && visibleSelected === rows.length;
      all.indeterminate = visibleSelected > 0 && visibleSelected < rows.length;
      all.disabled = rows.length === 0;
    }
    var alive = {};
    players.forEach(function (item) { alive[item.id] = true; });
    var count = 0;
    Object.keys(selectedPlayers).forEach(function (id) {
      if (alive[id]) count += 1;
      else delete selectedPlayers[id];
    });
    var bulk = document.getElementById("bulk-delete");
    if (bulk) {
      bulk.disabled = count === 0;
      bulk.textContent = count ? "Eliminar seleccionadas (" + count + ")" : "Eliminar seleccionadas";
    }
  }

  function paintRosterRows() {
    var tbody = document.getElementById("roster-rows");
    var empty = document.getElementById("roster-empty");
    if (!tbody || !empty) return;
    var rows = visiblePlayers();
    tbody.innerHTML = rosterRowHtml(rows);
    if (!players.length) {
      empty.hidden = false;
      empty.textContent = "No hay jugadoras.";
    } else if (!rows.length) {
      empty.hidden = false;
      empty.textContent = "Ninguna jugadora coincide con el filtro.";
    } else {
      empty.hidden = true;
    }
    syncRosterSelection();
    document.querySelectorAll("[data-sort]").forEach(function (button) {
      var key = button.getAttribute("data-sort");
      var state = rosterSortState(key);
      var cell = button.closest("th");
      if (cell) cell.setAttribute("aria-sort", state);
      var arrow = button.querySelector(".roster-arrow");
      if (arrow) arrow.textContent = rosterArrow(key);
    });
  }

  function rosterHeadHtml() {
    var head = "<th class=\"roster-check\"><input type=\"checkbox\" id=\"roster-select-all\" aria-label=\"Seleccionar todas\"></th>";
    head += shownColumns().map(function (column) {
      var key = column[0];
      var filtered = columnFiltered(key);
      var classes = [];
      if (filtered) classes.push("is-filtered");
      if (filterKind(key) === "date") classes.push("is-date");
      if (key === "photos") classes.push("is-photos");
      return "<th data-column=\"" + key + "\" aria-sort=\"" + rosterSortState(key) + "\"" + (classes.length ? " class=\"" + classes.join(" ") + "\"" : "") + "><div class=\"roster-head-row\"><span class=\"roster-drag\" draggable=\"true\" data-drag-column=\"" + key + "\" role=\"button\" tabindex=\"0\" title=\"Arrastrar para mover\" aria-label=\"Mover " + escapeHtml(column[1]) + "\">" + dragIcon + "</span><button type=\"button\" class=\"roster-sort\" data-sort=\"" + key + "\"><span class=\"roster-filter-mark\" aria-hidden=\"true\"></span><span>" + escapeHtml(column[1]) + "</span><span class=\"roster-arrow\" aria-hidden=\"true\">" + rosterArrow(key) + "</span></button></div><span class=\"sr-only roster-filter-note\"" + (filtered ? "" : " hidden") + ">Filtro activo</span>" + filterControl(column) + "</th>";
    }).join("");
    return head + "<th class=\"roster-actions\">Acciones</th>";
  }

  function columnPickerItemsHtml() {
    return columnOrder.map(function (key) {
      var column = columnByKey(key);
      if (!column) return "";
      return "<li data-column=\"" + key + "\"" + (columnFiltered(key) ? " class=\"is-filtered\"" : "") + "><span class=\"roster-drag\" draggable=\"true\" data-drag-column=\"" + key + "\" role=\"button\" tabindex=\"0\" title=\"Arrastrar para mover\" aria-label=\"Mover " + escapeHtml(column[1]) + "\">" + dragIcon + "</span><label><input type=\"checkbox\" data-column-visible=\"" + key + "\"" + (hiddenColumns[key] ? "" : " checked") + ">" + escapeHtml(column[1]) + "</label><span class=\"roster-filter-mark\" title=\"Filtro activo\" aria-hidden=\"true\"></span></li>";
    }).join("");
  }

  function paintRosterTable(refreshPicker) {
    var head = document.getElementById("roster-head");
    if (head) head.innerHTML = rosterHeadHtml();
    if (refreshPicker) {
      var list = document.getElementById("roster-column-list");
      if (list) list.innerHTML = columnPickerItemsHtml();
    }
    paintRosterRows();
  }

  function moveColumn(fromKey, toKey, restoreFocus) {
    if (!fromKey || !toKey || fromKey === toKey) return;
    var order = columnOrder.slice();
    var fromIndex = order.indexOf(fromKey);
    if (fromIndex < 0 || order.indexOf(toKey) < 0) return;
    order.splice(fromIndex, 1);
    order.splice(order.indexOf(toKey), 0, fromKey);
    columnOrder = order;
    saveColumnPref();
    paintRosterTable(true);
    if (restoreFocus) {
      var handle = document.querySelector(restoreFocus + "[data-drag-column=\"" + fromKey + "\"]");
      if (handle) handle.focus();
    }
  }

  function columnTarget(node) {
    if (!node || !node.closest) return null;
    return node.closest("th[data-column], #roster-column-list li[data-column]");
  }

  function playersPanel() {
    var rows = visiblePlayers();
    var emptyText = !players.length ? "No hay jugadoras." : "Ninguna jugadora coincide con el filtro.";
    var emptyHidden = rows.length ? " hidden" : "";
    return "<section class=\"roster-layout" + (rosterOpen ? " is-open" : "") + "\"><div class=\"roster-side panel-card\"><button type=\"button\" class=\"roster-toggle\" id=\"roster-toggle\" aria-expanded=\"" + (rosterOpen ? "true" : "false") + "\" aria-controls=\"roster-body\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path></svg>Agregar jugadora</button><div id=\"roster-body\"" + (rosterOpen ? "" : " hidden") + "><p>La plantilla pública con fotos no cambia.</p>" + playerForm() + "<div class=\"drop-zone\" id=\"roster-drop\"><p>Suelta el Excel aquí o elige un archivo.</p><div class=\"admin-actions\"><label class=\"btn\" for=\"roster-file\">Elegir Excel</label><a class=\"btn btn-ghost\" href=\"/api/admin/roster/template\">Descargar plantilla</a></div><input id=\"roster-file\" type=\"file\" accept=\".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\" hidden></div></div></div><div class=\"roster-grid panel-card\"><div class=\"roster-toolbar\"><p>Las celdas en rojo repiten el mismo nombre completo y la misma edad.</p><div class=\"roster-toolbar-actions\"><a class=\"btn btn-ghost\" href=\"/api/admin/roster/report\">Generar reporte</a><button class=\"btn btn-danger\" type=\"button\" id=\"bulk-delete\" disabled>Eliminar seleccionadas</button></div></div><div class=\"roster-board\"><div class=\"roster-frame\"><div class=\"roster-scroll\"><table><thead><tr id=\"roster-head\">" + rosterHeadHtml() + "</tr></thead><tbody id=\"roster-rows\">" + rosterRowHtml(rows) + "</tbody></table></div><p id=\"roster-empty\" class=\"roster-empty\"" + emptyHidden + ">" + emptyText + "</p></div><aside class=\"roster-columns" + (columnsOpen ? "" : " is-collapsed") + "\" aria-labelledby=\"roster-columns-title\"><div class=\"roster-columns-head\"><button type=\"button\" class=\"columns-toggle\" id=\"columns-toggle\" aria-expanded=\"" + (columnsOpen ? "true" : "false") + "\" aria-controls=\"roster-column-body\" aria-label=\"" + (columnsOpen ? "Ocultar columnas" : "Mostrar columnas") + "\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M9 6l6 6-6 6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path></svg></button><p id=\"roster-columns-title\" class=\"roster-columns-title\">Columnas</p></div><div id=\"roster-column-body\"><p class=\"roster-columns-note\">Arrastra el icono para cambiar el orden de la tabla.</p><ul id=\"roster-column-list\">" + columnPickerItemsHtml() + "</ul></div></aside></div></div></section>";
  }

  function groupKey(value) {
    return String(value || "").replace(/(.{4})/g, "$1 ").trim();
  }

  function settingsPanel() {
    var codeField = totpEnabled ? "<label class=\"field\" for=\"password-code\">Código de verificación<input id=\"password-code\" inputmode=\"numeric\" autocomplete=\"one-time-code\" maxlength=\"8\" spellcheck=\"false\"></label>" : "";
    var password = "<article class=\"panel-card settings-card\"><h2>Contraseña</h2><p>La nueva contraseña necesita al menos 12 caracteres, con letras y números.</p><form id=\"password-form\" method=\"post\" action=\"/GFCCaliAdmin\" novalidate><p id=\"password-error\" class=\"form-error\" role=\"alert\" hidden></p><label class=\"field\" for=\"current-password\">Contraseña actual<input id=\"current-password\" type=\"password\" autocomplete=\"current-password\" maxlength=\"128\"></label><label class=\"field\" for=\"next-password\">Nueva contraseña<input id=\"next-password\" type=\"password\" autocomplete=\"new-password\" maxlength=\"128\"></label><label class=\"field\" for=\"confirm-password\">Confirmar contraseña<input id=\"confirm-password\" type=\"password\" autocomplete=\"new-password\" maxlength=\"128\"></label>" + codeField + "<div class=\"admin-actions\"><button class=\"btn\" type=\"submit\">Guardar contraseña</button></div></form></article>";
    var twoStep;
    if (totpSetup) {
      twoStep = "<article class=\"panel-card settings-card\"><h2>Verificación en dos pasos</h2><p>Abre tu app de autenticación y agrega una cuenta a mano con esta clave. Después escribe el código de 6 dígitos para activarla. Guárdala: la vas a necesitar si cambias de teléfono.</p><p class=\"setup-key\" id=\"totp-key\">" + escapeHtml(groupKey(totpSetup.secret)) + "</p><div class=\"admin-actions\"><button class=\"btn btn-ghost\" type=\"button\" id=\"copy-totp-key\">Copiar clave</button><button class=\"btn btn-ghost\" type=\"button\" id=\"copy-totp-link\">Copiar enlace</button></div><form id=\"totp-confirm-form\" method=\"post\" action=\"/GFCCaliAdmin\" novalidate><p id=\"totp-error\" class=\"form-error\" role=\"alert\" hidden></p><label class=\"field\" for=\"totp-confirm-code\">Código de la app<input id=\"totp-confirm-code\" inputmode=\"numeric\" autocomplete=\"one-time-code\" maxlength=\"8\" spellcheck=\"false\"></label><div class=\"admin-actions\"><button class=\"btn\" type=\"submit\">Activar</button><button class=\"btn btn-ghost\" type=\"button\" id=\"totp-cancel\">Cancelar</button></div></form></article>";
    } else if (totpEnabled) {
      twoStep = "<article class=\"panel-card settings-card\"><h2>Verificación en dos pasos</h2><p>Está activa. Cada vez que entres, el sitio pedirá un código de 6 dígitos de tu app.</p><form id=\"totp-disable-form\" method=\"post\" action=\"/GFCCaliAdmin\" novalidate><p id=\"totp-error\" class=\"form-error\" role=\"alert\" hidden></p><label class=\"field\" for=\"totp-disable-password\">Contraseña actual<input id=\"totp-disable-password\" type=\"password\" autocomplete=\"current-password\" maxlength=\"128\"></label><label class=\"field\" for=\"totp-disable-code\">Código de la app<input id=\"totp-disable-code\" inputmode=\"numeric\" autocomplete=\"one-time-code\" maxlength=\"8\" spellcheck=\"false\"></label><div class=\"admin-actions\"><button class=\"btn btn-danger\" type=\"submit\">Desactivar</button></div></form></article>";
    } else {
      twoStep = "<article class=\"panel-card settings-card\"><h2>Verificación en dos pasos</h2><p>Protege el acceso con un código de una app de autenticación, además de la contraseña.</p><form id=\"totp-start-form\" method=\"post\" action=\"/GFCCaliAdmin\" novalidate><p id=\"totp-error\" class=\"form-error\" role=\"alert\" hidden></p><label class=\"field\" for=\"totp-start-password\">Contraseña actual<input id=\"totp-start-password\" type=\"password\" autocomplete=\"current-password\" maxlength=\"128\"></label><div class=\"admin-actions\"><button class=\"btn\" type=\"submit\">Configurar</button></div></form></article>";
    }
    return "<div class=\"settings-layout\">" + password + twoStep + "</div>";
  }

  function copySetup(value, okText) {
    if (!value || !navigator.clipboard) {
      setStatus("Selecciona la clave y cópiala a mano.");
      return;
    }
    navigator.clipboard.writeText(value).then(function () {
      setStatus(okText);
    }).catch(function () {
      setStatus("Selecciona la clave y cópiala a mano.");
    });
  }

  function settingsError(form, message) {
    var node = form.querySelector(".form-error");
    if (node) showError(node, message);
  }

  function submitSettings(form) {
    var button = form.querySelector("button[type=\"submit\"]");
    if (form.id === "password-form") {
      var next = document.getElementById("next-password").value;
      var confirm = document.getElementById("confirm-password").value;
      if (next !== confirm) {
        settingsError(form, "La confirmación no coincide.");
        return;
      }
      var payload = {
        current: document.getElementById("current-password").value,
        next: next
      };
      var passwordCode = document.getElementById("password-code");
      if (passwordCode) payload.code = passwordCode.value;
      button.disabled = true;
      api("/api/admin/password", "POST", payload).then(function (result) {
        button.disabled = false;
        if (!result.ok) {
          settingsError(form, result.data.error || "No se pudo cambiar la contraseña.");
          return;
        }
        csrf = result.data.csrf;
        totpEnabled = Boolean(result.data.totpEnabled);
        totpSetup = null;
        setStatus("Contraseña actualizada.");
        render();
      }).catch(function () {
        button.disabled = false;
        settingsError(form, "No se pudo completar. Intenta de nuevo.");
      });
      return;
    }
    if (form.id === "totp-start-form") {
      button.disabled = true;
      api("/api/admin/totp/start", "POST", {
        password: document.getElementById("totp-start-password").value
      }).then(function (result) {
        button.disabled = false;
        if (!result.ok) {
          settingsError(form, result.data.error || "No se pudo preparar la verificación.");
          return;
        }
        totpSetup = { secret: result.data.secret, otpauth: result.data.otpauth };
        setStatus("");
        render();
        var code = document.getElementById("totp-confirm-code");
        if (code) code.focus();
      }).catch(function () {
        button.disabled = false;
        settingsError(form, "No se pudo completar. Intenta de nuevo.");
      });
      return;
    }
    if (form.id === "totp-confirm-form") {
      button.disabled = true;
      api("/api/admin/totp/confirm", "POST", {
        code: document.getElementById("totp-confirm-code").value
      }).then(function (result) {
        button.disabled = false;
        if (!result.ok) {
          settingsError(form, result.data.error || "El código no es válido.");
          return;
        }
        totpEnabled = true;
        totpSetup = null;
        setStatus("Verificación en dos pasos activada.");
        render();
      }).catch(function () {
        button.disabled = false;
        settingsError(form, "No se pudo completar. Intenta de nuevo.");
      });
      return;
    }
    if (form.id === "totp-disable-form") {
      button.disabled = true;
      api("/api/admin/totp/disable", "POST", {
        password: document.getElementById("totp-disable-password").value,
        code: document.getElementById("totp-disable-code").value
      }).then(function (result) {
        button.disabled = false;
        if (!result.ok) {
          settingsError(form, result.data.error || "No se pudo desactivar.");
          return;
        }
        totpEnabled = false;
        totpSetup = null;
        setStatus("Verificación en dos pasos desactivada.");
        render();
      }).catch(function () {
        button.disabled = false;
        settingsError(form, "No se pudo completar. Intenta de nuevo.");
      });
    }
  }

  function render() {
    if (tab === "jugadoras") {
      if (collapseAddForm) {
        playerDraft = null;
        rosterOpen = false;
        collapseAddForm = false;
      } else capturePlayerDraft();
    }
    paintNavs();
    var site = siteTabs.filter(function (item) { return item.id === tab; })[0];
    if (site) {
      panel.innerHTML = sitePanel(site);
      return;
    }
    if (tab === "ajustes") {
      panel.innerHTML = settingsPanel();
      return;
    }
    if (tab === "eventos") {
      panel.innerHTML = eventsPanel();
      bindEventEditor();
    }
    else if (tab === "jugadoras") {
      panel.innerHTML = playersPanel();
      syncRosterSelection();
    }
    else panel.innerHTML = "<article class=\"panel-card\"><p>Cargando visitas…</p></article>";
  }

  function openApp() {
    login.hidden = true;
    app.hidden = false;
    render();
    title.focus();
  }

  function resetLoginCode() {
    loginTicket = "";
    var field = document.getElementById("totp-field");
    var hint = document.getElementById("totp-hint");
    var code = document.getElementById("totp-code");
    if (field) field.hidden = true;
    if (hint) hint.hidden = true;
    if (code) code.value = "";
  }

  function openLogin() {
    app.hidden = true;
    login.hidden = false;
    csrf = "";
    totpSetup = null;
    document.getElementById("password").value = "";
    resetLoginCode();
  }

  function loadClub() {
    return Promise.all([
      api("/api/admin/settings", "GET"),
      api("/api/admin/events", "GET"),
      api("/api/admin/roster", "GET")
    ]).then(function (results) {
      if (!results[0].ok) throw new Error("session");
      settings = results[0].data;
      events = results[1].ok ? results[1].data.events || [] : [];
      players = results[2].ok ? results[2].data.players || [] : [];
    });
  }

  function showTelemetry() {
    api("/api/admin/telemetry", "GET").then(function (result) {
      if (!result.ok) return;
      if (tab === "telemetria") panel.innerHTML = telemetryPanel(result.data);
    });
  }

  var devButton = document.getElementById("dev-login");
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") devButton.hidden = false;
  devButton.addEventListener("click", function () {
    devButton.disabled = true;
    showError(loginError, "");
    api("/api/dev-login", "POST", {}).then(function (result) {
      devButton.disabled = false;
      if (!result.ok) {
        showError(loginError, "El modo desarrollo solo está disponible en esta computadora.");
        return;
      }
      csrf = result.data.csrf;
      totpEnabled = Boolean(result.data.totpEnabled);
      return loadClub().then(openApp);
    }).catch(function () {
      devButton.disabled = false;
      showError(loginError, "No se pudo entrar. Intenta de nuevo.");
    });
  });

  document.getElementById("login-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var button = event.target.querySelector("button");
    button.disabled = true;
    showError(loginError, "");
    var payload;
    if (loginTicket) {
      payload = { ticket: loginTicket, code: document.getElementById("totp-code").value };
    } else {
      payload = {
        username: document.getElementById("username").value,
        password: document.getElementById("password").value
      };
    }
    api("/api/login", "POST", payload).then(function (result) {
      button.disabled = false;
      if (!result.ok) {
        var message = result.data.error || "Usuario o contraseña incorrectos.";
        if (loginTicket && message.indexOf("Vuelve a entrar") !== -1) resetLoginCode();
        showError(loginError, message);
        return;
      }
      if (result.data.totpRequired) {
        loginTicket = result.data.ticket;
        document.getElementById("totp-field").hidden = false;
        document.getElementById("totp-hint").hidden = false;
        document.getElementById("totp-code").focus();
        return;
      }
      csrf = result.data.csrf;
      totpEnabled = Boolean(result.data.totpEnabled);
      return loadClub().then(openApp);
    }).catch(function () {
      button.disabled = false;
      showError(loginError, "No se pudo entrar. Intenta de nuevo.");
    });
  });

  document.getElementById("logout").addEventListener("click", function () {
    api("/api/logout", "POST", {}).then(openLogin);
  });

  app.addEventListener("mousedown", function (event) {
    if (event.target.closest("[data-event-note-cmd]")) event.preventDefault();
  });

  app.addEventListener("click", function (event) {
    var noteCommand = event.target.closest("[data-event-note-cmd]");
    if (noteCommand) {
      var noteInput = document.getElementById("event-note-input");
      if (noteInput) noteInput.focus();
      document.execCommand(noteCommand.getAttribute("data-event-note-cmd"), false, null);
      var noteCount = document.getElementById("event-note-count");
      if (noteInput && noteCount) {
        noteCount.textContent = notesLength(noteInput) + " / " + eventNoteLimit;
        noteCount.classList.toggle("is-full", notesLength(noteInput) >= eventNoteLimit);
      }
      showFormPreview();
      return;
    }
    var draftPhoto = event.target.closest("[data-adjust-draft-photo]");
    if (draftPhoto && eventUploads) {
      openEventPhotoEditor(eventUploads.id, Number(draftPhoto.getAttribute("data-adjust-draft-photo")), "draft");
      return;
    }
    if (event.target.closest("[data-preview-photo], #event-preview-adjust")) {
      var shown = previewPhotoTarget();
      var shownSlides = eventSlides(shown.record);
      var shownSlide = shownSlides[eventPreviewIndex] || shownSlides[0];
      if (shownSlide && shownSlide.kind === "video") openEventVideoEditor(shown.record);
      else if (shownSlide) openEventPhotoEditor(shown.id, shown.photos.indexOf(shownSlide.file), shown.source === "preview" ? "preview" : "draft");
      return;
    }
    if (event.target.closest("#adjust-event-video") && eventUploads) {
      openEventVideoEditor(eventUploads);
      return;
    }
    var mediaMove = event.target.closest("[data-media-move]");
    if (mediaMove && eventUploads) {
      var moving = eventMediaOrder(eventUploads);
      var fromIndex = Number(mediaMove.getAttribute("data-media-index"));
      var toIndex = fromIndex + Number(mediaMove.getAttribute("data-media-move"));
      if (toIndex < 0 || toIndex >= moving.length) return;
      var moved = moving[fromIndex];
      moving.splice(fromIndex, 1);
      moving.splice(toIndex, 0, moved);
      eventUploads.mediaOrder = moving;
      eventUploads.photos = moving.filter(function (token) { return token !== "video"; });
      var movedMedia = document.getElementById("event-preview-media");
      if (movedMedia) movedMedia.removeAttribute("data-media");
      paintEventMedia();
      saveDraftMedia().catch(function () {});
      return;
    }
    var savedPreview = event.target.closest("[data-preview-event]");
    if (savedPreview) {
      var previewId = savedPreview.getAttribute("data-preview-event");
      if (previewingSaved === previewId) {
        closeEventPreview();
        return;
      }
      previewDismissed = false;
      previewingSaved = previewId;
      eventPreviewIndex = 0;
      var savedMedia = document.getElementById("event-preview-media");
      if (savedMedia) savedMedia.removeAttribute("data-media");
      document.querySelectorAll("[data-preview-event]").forEach(function (button) { button.textContent = "Vista previa"; });
      document.querySelectorAll(".record.is-previewing").forEach(function (row) { row.classList.remove("is-previewing"); });
      var savedRow = savedPreview.closest(".record");
      if (savedRow) savedRow.classList.add("is-previewing");
      savedPreview.textContent = "Cerrar vista";
      var closePreview = document.getElementById("close-event-preview");
      if (closePreview) closePreview.hidden = false;
      paintEventPreview();
      var previewColumn = document.querySelector(".event-preview-column");
      if (previewColumn) previewColumn.scrollIntoView({ block: "nearest" });
      return;
    }
    if (event.target.closest("#close-event-preview")) {
      closeEventPreview();
      return;
    }
    var previewStep = event.target.closest("[data-preview-step]");
    if (previewStep && eventSlides(previewPhotoTarget().record).length) {
      var previewCount = eventSlides(previewPhotoTarget().record).length;
      eventPreviewIndex = (eventPreviewIndex + Number(previewStep.getAttribute("data-preview-step")) + previewCount) % previewCount;
      var previewMedia = document.getElementById("event-preview-media");
      if (previewMedia) previewMedia.removeAttribute("data-media");
      paintEventPreview();
      return;
    }
    var previewDot = event.target.closest("[data-preview-dot]");
    if (previewDot) {
      eventPreviewIndex = Number(previewDot.getAttribute("data-preview-dot"));
      var dotMedia = document.getElementById("event-preview-media");
      if (dotMedia) dotMedia.removeAttribute("data-media");
      paintEventPreview();
      return;
    }
    var removeEventPhoto = event.target.closest("[data-remove-event-photo]");
    if (removeEventPhoto && eventUploads) {
      var photoIndex = Number(removeEventPhoto.getAttribute("data-remove-event-photo"));
      var removedPhoto = eventUploads.photos[photoIndex];
      var removeId = eventUploads.id;
      eventUploads.photos.splice(photoIndex, 1);
      eventUploads.mediaOrder = (eventUploads.mediaOrder || []).filter(function (token) { return token !== removedPhoto; });
      paintEventMedia();
      saveDraftMedia().catch(function () {}).then(function () { return releaseEventFile(removeId, removedPhoto); });
      eventMediaStatus("event-photo-status", "Foto quitada.");
      return;
    }
    if (event.target.closest("[data-remove-event-video]") && eventUploads) {
      var removedVideo = eventUploads.video;
      var videoId = eventUploads.id;
      eventUploads.video = "";
      eventUploads.mediaOrder = (eventUploads.mediaOrder || []).filter(function (token) { return token !== "video"; });
      paintEventMedia();
      saveDraftMedia().catch(function () {}).then(function () { return releaseEventFile(videoId, removedVideo); });
      eventMediaStatus("event-video-status", "Video quitado.");
      return;
    }
    var eventPhotoDrop = event.target.closest("#event-photo-drop");
    if (eventPhotoDrop && eventUploads && eventUploads.photos.length < 5 && event.target.id !== "event-photo-file") {
      var photoInput = document.getElementById("event-photo-file");
      if (photoInput) photoInput.click();
      return;
    }
    var eventVideoDrop = event.target.closest("#event-video-drop");
    if (eventVideoDrop && eventUploads && event.target.id !== "event-video-file") {
      var videoInput = document.getElementById("event-video-file");
      if (videoInput) videoInput.click();
      return;
    }
    if (event.target.closest("#totp-cancel")) {
      totpSetup = null;
      api("/api/admin/totp/cancel", "POST", {}).then(function () { render(); });
      return;
    }
    if (event.target.closest("#copy-totp-key")) {
      copySetup(totpSetup && totpSetup.secret, "Clave copiada.");
      return;
    }
    if (event.target.closest("#copy-totp-link")) {
      copySetup(totpSetup && totpSetup.otpauth, "Enlace copiado.");
      return;
    }
    var tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      var nextTab = tabButton.getAttribute("data-tab");
      if (tab === "jugadoras" && nextTab !== "jugadoras") {
        capturePlayerDraft();
        if (!playerDraft && !pendingPlayer) rosterOpen = false;
      }
      if (nextTab === "jugadoras" && tab !== "jugadoras") rosterOpen = !!(playerDraft || pendingPlayer);
      if (tab === "eventos" && nextTab !== "eventos") discardEventDraft();
      tab = nextTab;
      if (nextTab !== "eventos") editingEvent = "";
      editingPlayer = "";
      setStatus("");
      render();
      if (tab === "telemetria") showTelemetry();
      return;
    }
    var editEvent = event.target.closest("[data-edit-event]");
    if (editEvent) {
      var nextEventId = editEvent.getAttribute("data-edit-event");
      var openEvent = function () {
        editingEvent = nextEventId;
        eventUploads = null;
        previewingSaved = "";
        render();
        var form = document.getElementById("event-form");
        if (form) form.scrollIntoView({ block: "nearest" });
      };
      if (eventUploads && eventUploads.id !== nextEventId) {
        discardEventDraft().then(openEvent);
        return;
      }
      openEvent();
      return;
    }
    var deleteEvent = event.target.closest("[data-delete-event]");
    if (deleteEvent) {
      var eventId = deleteEvent.getAttribute("data-delete-event");
      var found = events.filter(function (item) { return item.id === eventId; })[0];
      if (!found || !window.confirm("¿Quitar el evento " + found.name + "?")) return;
      if (previewingSaved === eventId) previewingSaved = "";
      events = events.filter(function (item) { return item.id !== eventId; });
      if (eventUploads && eventUploads.id === eventId) eventUploads = null;
      editingEvent = "";
      api("/api/admin/events", "PUT", { events: events }).then(function (result) {
        if (!result.ok) { setStatus(result.data.error || "No se pudo quitar."); return; }
        events = result.data.events;
        editingEvent = "";
        setStatus("Evento quitado.");
        render();
      });
      return;
    }
    if (event.target.id === "cancel-event") {
      discardEventDraft().then(function () { render(); });
      return;
    }
    var sortButton = event.target.closest("[data-sort]");
    if (sortButton) {
      var sortKey = sortButton.getAttribute("data-sort");
      if (rosterSort.key !== sortKey) rosterSort = { key: sortKey, dir: "asc" };
      else if (rosterSort.dir === "asc") rosterSort.dir = "desc";
      else rosterSort = { key: "", dir: "" };
      paintRosterRows();
      return;
    }
    var toggle = event.target.closest("#roster-toggle");
    if (toggle) {
      rosterOpen = !rosterOpen;
      var layout = document.querySelector(".roster-layout");
      var body = document.getElementById("roster-body");
      if (layout) layout.classList.toggle("is-open", rosterOpen);
      if (body) body.hidden = !rosterOpen;
      toggle.setAttribute("aria-expanded", rosterOpen ? "true" : "false");
      return;
    }
    var columnsToggle = event.target.closest("#columns-toggle");
    if (columnsToggle) {
      columnsOpen = !columnsOpen;
      try { localStorage.setItem("gfc-admin-columns-open", columnsOpen ? "open" : "closed"); } catch (error) {}
      var columnsPanel = document.querySelector(".roster-columns");
      if (columnsPanel) columnsPanel.classList.toggle("is-collapsed", !columnsOpen);
      columnsToggle.setAttribute("aria-expanded", columnsOpen ? "true" : "false");
      columnsToggle.setAttribute("aria-label", columnsOpen ? "Ocultar columnas" : "Mostrar columnas");
      return;
    }
    var infoPlayer = event.target.closest("[data-info-player]");
    if (infoPlayer) {
      openPlayerInfo(infoPlayer.getAttribute("data-info-player"));
      return;
    }
    var editPlayer = event.target.closest("[data-edit-player]");
    if (editPlayer) {
      editingPlayer = editPlayer.getAttribute("data-edit-player");
      paintRosterRows();
      var nameField = document.querySelector("#roster-rows tr.is-editing [data-field=\"name\"]");
      if (nameField) nameField.focus();
      return;
    }
    var cancelEdit = event.target.closest("[data-cancel-edit]");
    if (cancelEdit) {
      editingPlayer = "";
      paintRosterRows();
      return;
    }
    var savePlayer = event.target.closest("[data-save-player]");
    if (savePlayer) {
      var row = savePlayer.closest("tr");
      var playerId = savePlayer.getAttribute("data-save-player");
      var current = players.filter(function (item) { return item.id === playerId; })[0];
      if (!row || !current) return;
      var nextPlayer = {
        id: current.id,
        notes: current.notes || "",
        paidOn: current.paidOn || "",
        photos: Array.isArray(current.photos) ? current.photos.slice() : []
      };
      columns.forEach(function (column) {
        var input = row.querySelector("[data-field=\"" + column[0] + "\"]");
        nextPlayer[column[0]] = input ? String(input.value || "").trim() : current[column[0]];
      });
      if (!nextPlayer.name) { setStatus("Escribe el nombre completo."); return; }
      var age = Number(nextPlayer.age);
      var ageError = playerAgeError(age);
      if (ageError) { setStatus(ageError); return; }
      nextPlayer.age = age;
      var roster = players.map(function (item) { return item.id === playerId ? nextPlayer : item; });
      saveRoster(roster, "Jugadora guardada.");
      return;
    }
    if (event.target.id === "bulk-delete") {
      askDelete(Object.keys(selectedPlayers));
      return;
    }
    var deletePlayer = event.target.closest("[data-delete-player]");
    if (deletePlayer) askDelete([deletePlayer.getAttribute("data-delete-player")]);
  });

  function saveRoster(list, message) {
    return api("/api/admin/roster", "PUT", { players: list }).then(function (result) {
      if (!result.ok) { setStatus(result.data.error || "No se pudo guardar."); return result; }
      players = result.data.players;
      editingPlayer = "";
      if (message) {
        setStatus(message);
        render();
      }
      return result;
    });
  }

  function finishImport(result) {
    if (!result.ok) { setStatus(result.data.error || "No se pudo cargar el archivo."); return; }
    players = result.data.players;
    editingPlayer = "";
    var repeated = players.filter(function (item) { return item.duplicate; }).length;
    setStatus("Se cargaron " + result.data.added + " jugadoras." + (repeated ? " Hay nombres y edades repetidos, marcados en rojo." : ""));
    render();
  }

  function commitImport(base64) {
    return api("/api/admin/roster/import", "POST", { file: base64 }).then(finishImport);
  }

  function openImportDuplicates(base64, duplicates) {
    pendingImport = base64;
    var already = duplicates.some(function (item) { return item.inRoster; });
    var onlyInFile = duplicates.some(function (item) { return item.inFile && !item.inRoster; });
    var intro = "Estas jugadoras ya están en la lista. El nombre completo y la edad coinciden.";
    if (already && onlyInFile) intro = "Estas jugadoras ya están en la lista o se repiten dentro del archivo.";
    else if (!already) intro = "Estas jugadoras se repiten dentro del archivo.";
    document.getElementById("duplicate-upload-copy").textContent = intro + " Si agregas el archivo, las celdas del nombre y la edad quedarán en rojo.";
    document.getElementById("duplicate-upload-list").innerHTML = duplicates.map(function (item) {
      var note = item.inRoster && item.inFile
        ? "Ya está en la lista y se repite en el archivo."
        : item.inRoster ? "Ya está en la lista." : "Se repite en el archivo.";
      return "<li><strong>" + escapeHtml(item.name) + "</strong>, " + escapeHtml(item.age) + " años<span>" + note + "</span></li>";
    }).join("");
    if (!duplicateUploadDialog.open) duplicateUploadDialog.showModal();
  }

  function uploadRoster(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      setStatus("El archivo debe ser un Excel .xlsx.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var encoded = String(reader.result || "");
      var base64 = encoded.indexOf(",") >= 0 ? encoded.split(",")[1] : encoded;
      api("/api/admin/roster/import", "POST", { file: base64, preview: true }).then(function (result) {
        if (!result.ok) { setStatus(result.data.error || "No se pudo cargar el archivo."); return; }
        var duplicates = result.data.duplicates || [];
        if (duplicates.length) {
          openImportDuplicates(base64, duplicates);
          return;
        }
        commitImport(base64);
      });
    };
    reader.readAsDataURL(file);
  }

  app.addEventListener("dragover", function (event) {
    if (!event.target.closest("#roster-drop")) return;
    event.preventDefault();
    event.target.closest("#roster-drop").classList.add("is-over");
  });

  app.addEventListener("dragleave", function (event) {
    var zone = event.target.closest("#roster-drop");
    if (zone) zone.classList.remove("is-over");
  });

  app.addEventListener("drop", function (event) {
    var zone = event.target.closest("#roster-drop");
    if (!zone) return;
    event.preventDefault();
    zone.classList.remove("is-over");
    uploadRoster(event.dataTransfer.files && event.dataTransfer.files[0]);
  });

  function applyRosterFilter(filter) {
    var key = filter.getAttribute("data-filter");
    var bound = filter.getAttribute("data-range");
    if (bound) {
      var range = dateRange(key);
      range[bound] = filter.value;
      rosterFilters[key] = range.from || range.to ? range : "";
    } else {
      rosterFilters[key] = filter.value;
    }
    var on = columnFiltered(key);
    var cell = filter.closest("th");
    if (cell) cell.classList.toggle("is-filtered", on);
    var note = cell ? cell.querySelector(".roster-filter-note") : null;
    if (note) note.hidden = !on;
    var item = document.querySelector("[data-column-visible=\"" + key + "\"]");
    if (item && item.closest("li")) item.closest("li").classList.toggle("is-filtered", on);
    paintRosterRows();
  }

  app.addEventListener("input", function (event) {
    var filter = event.target.closest("[data-filter]");
    if (filter) applyRosterFilter(filter);
  });

  app.addEventListener("change", function (event) {
    var filter = event.target.closest("select[data-filter], input[type=\"date\"][data-filter]");
    if (filter) applyRosterFilter(filter);
  });

  app.addEventListener("dragstart", function (event) {
    var handle = event.target.closest("[data-drag-column]");
    if (!handle) return;
    dragColumn = handle.getAttribute("data-drag-column");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragColumn);
    }
    var cell = handle.closest("th, li");
    if (cell) cell.classList.add("is-dragging");
  });

  app.addEventListener("dragover", function (event) {
    var cell = columnTarget(event.target);
    if (!cell || !dragColumn) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".is-drop-target").forEach(function (el) {
      if (el !== cell) el.classList.remove("is-drop-target");
    });
    if (cell.getAttribute("data-column") !== dragColumn) cell.classList.add("is-drop-target");
  });

  app.addEventListener("dragleave", function (event) {
    var cell = columnTarget(event.target);
    if (!cell || cell.contains(event.relatedTarget)) return;
    cell.classList.remove("is-drop-target");
  });

  app.addEventListener("drop", function (event) {
    var cell = columnTarget(event.target);
    if (!cell || !dragColumn) return;
    event.preventDefault();
    var from = dragColumn;
    dragColumn = "";
    moveColumn(from, cell.getAttribute("data-column"), false);
  });

  app.addEventListener("dragend", function () {
    dragColumn = "";
    document.querySelectorAll(".is-dragging, .is-drop-target").forEach(function (el) {
      el.classList.remove("is-dragging", "is-drop-target");
    });
  });

  app.addEventListener("keydown", function (event) {
    var handle = event.target.closest("[data-drag-column]");
    if (!handle) return;
    var inList = Boolean(handle.closest("#roster-column-list"));
    var backward = inList ? "ArrowUp" : "ArrowLeft";
    var forward = inList ? "ArrowDown" : "ArrowRight";
    if (event.key !== backward && event.key !== forward) return;
    var key = handle.getAttribute("data-drag-column");
    var keys = inList ? columnOrder.slice() : shownColumns().map(function (column) { return column[0]; });
    var index = keys.indexOf(key);
    var next = event.key === backward ? index - 1 : index + 1;
    if (index < 0 || next < 0 || next >= keys.length) return;
    event.preventDefault();
    moveColumn(key, keys[next], inList ? "#roster-column-list " : "th ");
  });

  app.addEventListener("change", function (event) {
    var input = event.target.closest("[data-column-visible]");
    if (!input) return;
    var key = input.getAttribute("data-column-visible");
    if (!columnByKey(key)) return;
    if (!input.checked && shownColumns().length <= 1) {
      input.checked = true;
      setStatus("Deja al menos una columna visible.");
      return;
    }
    if (input.checked) delete hiddenColumns[key];
    else hiddenColumns[key] = true;
    saveColumnPref();
    if (status.textContent === "Deja al menos una columna visible.") setStatus("");
    paintRosterTable(false);
  });

  function askDelete(ids) {
    var list = ids.filter(function (id) {
      return players.some(function (item) { return item.id === id; });
    });
    if (!list.length) return;
    pendingDeleteIds = list;
    var title = document.getElementById("delete-player-title");
    var copy = document.getElementById("delete-player-copy");
    var note = document.getElementById("delete-player-note");
    if (list.length === 1) {
      var player = players.filter(function (item) { return item.id === list[0]; })[0];
      title.textContent = "Eliminar jugadora";
      copy.textContent = "¿Eliminar a " + player.name + "?";
      note.textContent = "Esta acción borra a la jugadora de forma permanente. No se podrá recuperar.";
    } else {
      title.textContent = "Eliminar jugadoras";
      copy.textContent = "¿Eliminar " + list.length + " jugadoras seleccionadas?";
      note.textContent = "Esta acción las borra de forma permanente. No se podrán recuperar.";
    }
    document.getElementById("delete-player-dialog").showModal();
  }

  app.addEventListener("change", function (event) {
    var box = event.target.closest("[data-select-player]");
    if (box) {
      var id = box.getAttribute("data-select-player");
      if (box.checked) selectedPlayers[id] = true;
      else delete selectedPlayers[id];
      var row = box.closest("tr");
      if (row) row.classList.toggle("is-selected", box.checked);
      syncRosterSelection();
      return;
    }
    if (event.target.id !== "roster-select-all") return;
    var mark = event.target.checked;
    visiblePlayers().forEach(function (item) {
      if (mark) selectedPlayers[item.id] = true;
      else delete selectedPlayers[item.id];
    });
    paintRosterRows();
  });

  app.addEventListener("change", function (event) {
    if (event.target.id !== "roster-file") return;
    uploadRoster(event.target.files && event.target.files[0]);
    event.target.value = "";
  });

  app.addEventListener("change", function (event) {
    var input = event.target.closest("[data-visible]");
    if (!input) return;
    var id = input.getAttribute("data-visible");
    if (!settings.pages[id]) settings.pages[id] = { visible: true };
    var previous = settings.pages[id].visible;
    settings.pages[id].visible = input.checked;
    settings.pages.inicio.visible = true;
    api("/api/admin/settings", "PUT", { pages: settings.pages }).then(function (result) {
      if (!result.ok) {
        settings.pages[id].visible = previous;
        input.checked = previous;
        setStatus(result.data.error || "No se pudo guardar.");
        return;
      }
      settings = result.data;
      setStatus(input.checked ? "La sección quedó visible." : "La sección quedó oculta.");
    });
  });

  app.addEventListener("submit", function (event) {
    if (event.target.id === "password-form" || event.target.id === "totp-start-form" || event.target.id === "totp-confirm-form" || event.target.id === "totp-disable-form") {
      event.preventDefault();
      submitSettings(event.target);
      return;
    }
    if (event.target.id === "event-form") {
      event.preventDefault();
      if (eventUploadBusy) { setStatus("Espera a que terminen las fotos o el video."); return; }
      var data = new FormData(event.target);
      var draft = eventDraft();
      var existing = eventById(draft.id);
      var next = {
        id: draft.id,
        name: String(data.get("name") || ""),
        date: String(data.get("date") || ""),
        time: String(data.get("time") || ""),
        place: String(data.get("place") || ""),
        note: eventNoteValue(),
        published: existing ? existing.published === true : false,
        photos: draft.photos.slice(),
        video: draft.video || "",
        mediaMode: draft.mediaMode || "both",
        mediaOrder: eventMediaOrder(draft),
        videoFrame: copyVideoFrame(draft.videoFrame)
      };
      var list = events.filter(function (item) { return item.id !== next.id; });
      list.push(next);
      api("/api/admin/events", "PUT", { events: list }).then(function (result) {
        if (!result.ok) { setStatus(result.data.error || "Revisa los datos del evento."); return; }
        events = result.data.events;
        editingEvent = "";
        eventUploads = null;
        previewingSaved = "";
        setStatus(next.published ? "Evento guardado." : "Evento guardado. Enciende En el sitio para publicarlo.");
        render();
      });
    }
    if (event.target.id === "player-form") {
      event.preventDefault();
      var form = new FormData(event.target);
      var nextPlayer = {
        id: "r-" + Date.now().toString(36),
        name: String(form.get("name") || ""),
        nickname: String(form.get("nickname") || ""),
        position: String(form.get("position") || ""),
        age: Number(form.get("age")),
        country: String(form.get("country") || ""),
        city: String(form.get("city") || ""),
        phone: String(form.get("phone") || ""),
        documentId: String(form.get("documentId") || ""),
        sede: String(form.get("sede") || ""),
        category: String(form.get("category") || ""),
        extra: String(form.get("extra") || ""),
        status: String(form.get("status") || "pending"),
        addedOn: String(form.get("addedOn") || todayIso()),
        paymentDue: String(form.get("paymentDue") || ""),
        paidOn: "",
        notes: "",
        photos: []
      };
      var addedAgeError = playerAgeError(nextPlayer.age);
      if (!String(nextPlayer.name || "").trim()) { setStatus("Escribe el nombre completo."); return; }
      if (addedAgeError) { setStatus(addedAgeError); return; }
      var key = rosterKey(nextPlayer);
      var duplicate = key && players.some(function (item) { return rosterKey(item) === key; });
      if (duplicate) {
        pendingPlayer = nextPlayer;
        document.getElementById("duplicate-player-copy").textContent = "Ya hay una jugadora con el mismo nombre completo y la misma edad (" + nextPlayer.name.trim().replace(/\s+/g, " ") + ", " + nextPlayer.age + " años).";
        document.getElementById("duplicate-player-dialog").showModal();
        return;
      }
      addPlayer(nextPlayer);
    }
  });

  function openNotes(id) {
    var item = players.filter(function (player) { return player.id === id; })[0];
    if (!item) return;
    document.getElementById("player-notes-title").textContent = "Notas de " + item.name;
    var view = document.getElementById("player-notes-view");
    var html = sanitizeNotes(item.notes);
    view.innerHTML = html || "<p class=\"notes-empty\">Esta jugadora no tiene notas.</p>";
    document.getElementById("player-notes-dialog").showModal();
  }

  function photoSrc(photo) {
    if (photo.data) return photo.data;
    return "/api/admin/roster/photo?id=" + encodeURIComponent(infoDraft.id) + "&file=" + encodeURIComponent(photo.file);
  }

  function renderInfoPhotos() {
    var box = document.getElementById("player-photo-list");
    var add = document.getElementById("player-photo-add");
    if (!box || !infoDraft) return;
    var full = infoDraft.photos.length >= 5;
    box.innerHTML = infoDraft.photos.map(function (photo, index) {
      return "<figure><button type=\"button\" class=\"photo-thumb\" data-edit-photo=\"" + index + "\"><img src=\"" + escapeHtml(photoSrc(photo)) + "\" alt=\"Editar foto " + (index + 1) + "\"></button><button type=\"button\" data-remove-photo=\"" + index + "\">Quitar</button></figure>";
    }).join("");
    var drop = document.getElementById("player-photo-drop");
    var lead = document.getElementById("player-photo-lead");
    var hint = document.getElementById("player-photo-edit-hint");
    if (drop) drop.classList.toggle("is-full", full);
    if (lead) lead.textContent = full ? "Ya hay 5 fotos. Quita una para agregar otra." : "Suelta las fotos aquí o elige archivos.";
    if (hint) hint.hidden = !infoDraft.photos.length;
    if (add) add.disabled = full;
    var list = document.getElementById("player-photo-list");
    if (list && infoDraft.photos.length) list.scrollIntoView({ block: "nearest" });
  }

  function photoStatus(message) {
    var node = document.getElementById("player-photo-status");
    if (node) node.textContent = message || "";
    if (message) setStatus(message);
  }

  function infoStatus(message) {
    var node = document.getElementById("player-info-status");
    if (node) node.textContent = message || "";
    if (message) setStatus(message);
  }

  function acceptedPhoto(file) {
    var type = String(file.type || "").toLowerCase();
    if (type === "image/jpg" || type === "image/pjpeg") type = "image/jpeg";
    if (type === "image/x-png") type = "image/png";
    if (/^image\/(jpeg|png|webp)$/.test(type)) return true;
    return /\.(jpe?g|png|webp)$/i.test(String(file.name || ""));
  }

  function photoNames() {
    return infoDraft.photos.map(function (photo) { return photo.file; }).filter(Boolean);
  }

  function uploadPhotoData(playerId, dataUrl) {
    var data = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",")[1] : dataUrl;
    return api("/api/admin/roster/photo", "POST", { id: playerId, data: data }).then(function (uploaded) {
      if (!uploaded.ok) throw new Error((uploaded.data && uploaded.data.error) || "No se pudo guardar la foto.");
      return uploaded.data.file;
    });
  }

  function storePlayerPhotos(playerId, names, message) {
    var roster = players.map(function (item) {
      if (item.id !== playerId) return item;
      var copy = {};
      Object.keys(item).forEach(function (key) { copy[key] = item[key]; });
      copy.photos = names.slice();
      return copy;
    });
    return saveRoster(roster, message);
  }

  function addPhotoFiles(fileList) {
    if (!infoDraft) return;
    var incoming = Array.prototype.slice.call(fileList || []);
    var room = 5 - infoDraft.photos.length;
    if (!incoming.length || room <= 0) {
      if (room <= 0) photoStatus("Solo puedes tener 5 fotos.");
      return;
    }
    var rejected = incoming.filter(function (file) { return !acceptedPhoto(file); });
    var files = incoming.filter(acceptedPhoto);
    if (!files.length) {
      photoStatus("La foto debe ser JPG, PNG o WebP.");
      return;
    }
    if (files.length > room) {
      photoStatus("Solo puedes tener 5 fotos. Se agregaron las primeras " + room + ".");
      files = files.slice(0, room);
    } else if (rejected.length) photoStatus("Algunas fotos no son JPG, PNG o WebP y no se agregaron.");
    else photoStatus("Subiendo fotos…");
    var playerId = infoDraft.id;
    var submit = document.querySelector("#player-info-form button[type=submit]");
    if (submit) submit.disabled = true;
    files.reduce(function (chain, file) {
      return chain.then(function () { return readPhotoFile(file); }).then(function (data) {
        if (!infoDraft || infoDraft.id !== playerId) return null;
        var slot = { data: data };
        infoDraft.photos.push(slot);
        renderInfoPhotos();
        return uploadPhotoData(playerId, data).then(function (filename) {
          if (!infoDraft || infoDraft.id !== playerId) return null;
          var names = photoNames();
          names.push(filename);
          return storePlayerPhotos(playerId, names, "Foto guardada.").then(function (result) {
            if (!result || !result.ok) throw new Error("No se pudo guardar la foto.");
            slot.file = filename;
            delete slot.data;
          });
        });
      });
    }, Promise.resolve()).then(function () {
      if (!infoDraft || infoDraft.id !== playerId) return;
      renderInfoPhotos();
      if (!rejected.length) photoStatus("Fotos guardadas. La columna Fotos muestra Agregadas.");
    }).catch(function (error) {
      if (infoDraft && infoDraft.id === playerId) {
        infoDraft.photos = infoDraft.photos.filter(function (photo) { return photo.file; });
        renderInfoPhotos();
      }
      photoStatus(error.message || "La foto no se pudo leer.");
    }).then(function () {
      if (submit) submit.disabled = false;
    });
  }

  var editorImage = null;
  var editorIndex = -1;
  var editorZoom = 1;
  var editorX = 0;
  var editorY = 0;
  var editorDrag = null;
  var editorBox = 320;

  function editorCover() {
    return Math.max(editorBox / editorImage.width, editorBox / editorImage.height);
  }

  function paintPhotoEditor() {
    var canvas = document.getElementById("photo-editor-canvas");
    if (!canvas || !editorImage) return;
    var context = canvas.getContext("2d");
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = editorBox * ratio;
    canvas.height = editorBox * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    var scale = editorCover() * editorZoom;
    var width = editorImage.width * scale;
    var height = editorImage.height * scale;
    var minX = editorBox - width;
    var minY = editorBox - height;
    if (editorX > 0) editorX = 0;
    if (editorY > 0) editorY = 0;
    if (editorX < minX) editorX = minX;
    if (editorY < minY) editorY = minY;
    context.fillStyle = "#121212";
    context.fillRect(0, 0, editorBox, editorBox);
    context.drawImage(editorImage, editorX, editorY, width, height);
  }

  function setEditorZoom(next) {
    if (!editorImage) return;
    var zoom = Math.min(3, Math.max(1, next));
    var oldScale = editorCover() * editorZoom;
    var nextScale = editorCover() * zoom;
    var centerX = (editorBox / 2 - editorX) / oldScale;
    var centerY = (editorBox / 2 - editorY) / oldScale;
    editorZoom = zoom;
    editorX = editorBox / 2 - centerX * nextScale;
    editorY = editorBox / 2 - centerY * nextScale;
    var slider = document.getElementById("photo-editor-zoom");
    if (slider) slider.value = String(zoom);
    paintPhotoEditor();
  }

  function openPhotoEditor(index) {
    var photo = infoDraft && infoDraft.photos[index];
    if (!photo) return;
    var image = new Image();
    image.onload = function () {
      editorImage = image;
      editorIndex = index;
      editorZoom = 1;
      editorX = 0;
      editorY = 0;
      paintPhotoEditor();
      var slider = document.getElementById("photo-editor-zoom");
      if (slider) slider.value = "1";
      var status = document.getElementById("photo-editor-status");
      if (status) status.textContent = "";
      var save = document.getElementById("apply-photo-edit");
      if (save) save.disabled = false;
      document.getElementById("player-photo-editor").hidden = false;
      infoDialog.classList.add("is-editing-photo");
    };
    image.onerror = function () { photoStatus("La foto no se pudo abrir."); };
    image.src = photoSrc(photo);
  }

  function closePhotoEditor() {
    editorImage = null;
    editorIndex = -1;
    editorDrag = null;
    var panel = document.getElementById("player-photo-editor");
    if (panel) panel.hidden = true;
    infoDialog.classList.remove("is-editing-photo");
  }

  function applyPhotoEdit() {
    if (!editorImage || editorIndex < 0 || !infoDraft) return;
    var scale = editorCover() * editorZoom;
    var sourceX = Math.max(0, -editorX / scale);
    var sourceY = Math.max(0, -editorY / scale);
    var sourceSize = editorBox / scale;
    var output = 1200;
    var canvas = document.createElement("canvas");
    canvas.width = output;
    canvas.height = output;
    var context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, output, output);
    context.drawImage(editorImage, sourceX, sourceY, sourceSize, sourceSize, 0, 0, output, output);
    var data = canvas.toDataURL("image/jpeg", 0.8);
    var index = editorIndex;
    var playerId = infoDraft.id;
    var previous = infoDraft.photos[index] && infoDraft.photos[index].file;
    var save = document.getElementById("apply-photo-edit");
    var editorStatus = document.getElementById("photo-editor-status");
    if (save) save.disabled = true;
    if (editorStatus) editorStatus.textContent = "Guardando…";
    var atCap = previous && photoNames().length >= 5;
    var prepare = atCap ? storePlayerPhotos(playerId, photoNames().filter(function (name) { return name !== previous; }), "") : Promise.resolve({ ok: true });
    prepare.then(function (result) {
      if (atCap && (!result || !result.ok)) throw new Error("No se pudo guardar la foto.");
      return uploadPhotoData(playerId, data);
    }).then(function (filename) {
      if (!infoDraft || infoDraft.id !== playerId) return null;
      infoDraft.photos[index] = { file: filename };
      return storePlayerPhotos(playerId, photoNames(), "Foto actualizada.");
    }).then(function (result) {
      if (save) save.disabled = false;
      if (!result || !result.ok) throw new Error("No se pudo guardar la foto.");
      if (!infoDraft || infoDraft.id !== playerId) return;
      closePhotoEditor();
      renderInfoPhotos();
      photoStatus("Foto actualizada.");
    }).catch(function (error) {
      if (save) save.disabled = false;
      if (editorStatus) editorStatus.textContent = error.message || "No se pudo guardar la foto.";
    });
  }

  function statusHintText() {
    var form = document.getElementById("player-info-form");
    if (!form) return "";
    var sample = {
      status: form.elements.status.value,
      paymentDue: form.elements.paymentDue.value,
      paidOn: form.elements.paidOn.value
    };
    var id = effectiveStatus(sample);
    var text = statusById(id).hint;
    if (id === "late" && sample.status !== "late") text += " El pago no se registró durante los 5 días de vencimiento.";
    return text;
  }

  function paintStatusHint() {
    var hint = document.getElementById("player-status-hint");
    if (hint) hint.textContent = statusHintText();
  }

  function infoField(label, control) {
    return "<label class=\"field\">" + label + control + "</label>";
  }

  function openPlayerInfo(id) {
    var item = players.filter(function (player) { return player.id === id; })[0];
    if (!item) return;
    infoDraft = {
      id: item.id,
      photos: (Array.isArray(item.photos) ? item.photos : []).map(function (file) { return { file: file }; })
    };
    document.getElementById("player-info-title").textContent = item.name;
    infoStatus("");
    document.getElementById("player-info-fields").innerHTML = [
      "<div class=\"wide\"><span class=\"field-label\">Fotos</span><div id=\"player-photo-drop\" class=\"photo-drop\"><p id=\"player-photo-lead\">Suelta las fotos aquí o elige archivos.</p><p class=\"field-hint\">Hasta 5 fotos, en JPG, PNG o WebP. Se guardan al elegirlas y la columna Fotos muestra Agregadas.</p><button class=\"btn btn-ghost\" type=\"button\" id=\"player-photo-add\">Elegir fotos</button><input id=\"player-photo-file\" type=\"file\" accept=\"image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp\" multiple hidden></div><div id=\"player-photo-list\" class=\"photo-list\"></div><p id=\"player-photo-status\" class=\"photo-status\" role=\"status\"></p><p id=\"player-photo-edit-hint\" class=\"field-hint\" hidden>Haz clic en una foto para acercarla y recortarla.</p></div>",
      infoField("Nombre completo", "<input name=\"name\" required maxlength=\"80\" value=\"" + escapeHtml(item.name) + "\">"),
      infoField("Apodo", "<input name=\"nickname\" maxlength=\"40\" value=\"" + escapeHtml(item.nickname) + "\">"),
      infoField("Posición", "<select name=\"position\">" + selectOptions(positions, item.position) + "</select>"),
      infoField("Edad", "<input name=\"age\" type=\"number\" min=\"18\" max=\"120\" required value=\"" + escapeHtml(item.age) + "\">"),
      infoField("País", "<input name=\"country\" maxlength=\"60\" value=\"" + escapeHtml(item.country) + "\">"),
      infoField("Ciudad", "<input name=\"city\" maxlength=\"80\" value=\"" + escapeHtml(item.city) + "\">"),
      infoField("Teléfono", "<input name=\"phone\" type=\"tel\" maxlength=\"40\" value=\"" + escapeHtml(item.phone) + "\">"),
      infoField("Documento", "<input name=\"documentId\" type=\"text\" maxlength=\"40\" spellcheck=\"false\" autocomplete=\"off\" value=\"" + escapeHtml(item.documentId || "") + "\">"),
      infoField("Sede de entrenamiento", "<select name=\"sede\">" + selectOptions(sedes, item.sede) + "</select>"),
      infoField("Categoría", "<select name=\"category\">" + selectOptions(categories, item.category) + "</select>"),
      infoField("Categorías adicionales", "<select name=\"extra\">" + selectOptions(extras, item.extra) + "</select>"),
      infoField("Estado", "<select name=\"status\">" + statusOptions(item.status || "active") + "</select>"),
      infoField("Agregada el", "<input name=\"addedOn\" type=\"date\" value=\"" + escapeHtml(item.addedOn || "") + "\">"),
      infoField("Vencimiento de la mensualidad", "<input name=\"paymentDue\" type=\"date\" value=\"" + escapeHtml(item.paymentDue || "") + "\">"),
      infoField("Pago recibido", "<input name=\"paidOn\" type=\"date\" value=\"" + escapeHtml(item.paidOn || "") + "\">"),
      "<p id=\"player-status-hint\" class=\"field-hint wide\"></p>",
      "<div class=\"wide notes-editor\"><span class=\"field-label\">Notas</span><div class=\"notes-tools\"><button type=\"button\" data-note-cmd=\"bold\">Negrita</button><button type=\"button\" data-note-cmd=\"italic\">Cursiva</button><button type=\"button\" data-note-cmd=\"underline\">Subrayado</button><button type=\"button\" data-note-cmd=\"insertUnorderedList\">Lista</button></div><div id=\"player-notes-input\" class=\"notes-input\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Notas\"></div><p id=\"player-notes-count\" class=\"notes-count\" aria-live=\"polite\">0 / 4000</p></div>"
    ].join("");
    document.getElementById("player-notes-input").innerHTML = sanitizeNotes(item.notes);
    limitNotesField();
    renderInfoPhotos();
    paintStatusHint();
    var dialog = document.getElementById("player-info-dialog");
    if (!dialog.open) dialog.showModal();
    var name = dialog.querySelector("[name=name]");
    if (name) name.focus();
  }

  function compressPhoto(src, maxEdge, quality) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        var edge = maxEdge || 1400;
        var scale = Math.min(1, edge / Math.max(image.width, image.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        var context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality || 0.8));
      };
      image.onerror = function () { reject(new Error("La foto no se pudo leer.")); };
      image.src = src;
    });
  }

  function readPhotoFile(file) {
    return new Promise(function (resolve, reject) {
      if (!acceptedPhoto(file)) {
        reject(new Error("La foto debe ser JPG, PNG o WebP."));
        return;
      }
      if (file.size > 12000000) {
        reject(new Error("La foto debe pesar menos de 12 MB."));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        compressPhoto(String(reader.result || "")).then(resolve, reject);
      };
      reader.onerror = function () { reject(new Error("La foto no se pudo leer.")); };
      reader.readAsDataURL(file);
    });
  }

  function playerFromInfo(form, photos) {
    return {
      id: infoDraft.id,
      name: String(form.get("name") || ""),
      nickname: String(form.get("nickname") || ""),
      position: String(form.get("position") || ""),
      age: Number(form.get("age")),
      country: String(form.get("country") || ""),
      city: String(form.get("city") || ""),
      phone: String(form.get("phone") || ""),
      documentId: String(form.get("documentId") || ""),
      sede: String(form.get("sede") || ""),
      category: String(form.get("category") || ""),
      extra: String(form.get("extra") || ""),
      status: String(form.get("status") || "active"),
      addedOn: String(form.get("addedOn") || ""),
      paymentDue: String(form.get("paymentDue") || ""),
      paidOn: String(form.get("paidOn") || ""),
      notes: sanitizeNotes(document.getElementById("player-notes-input").innerHTML),
      photos: photos
    };
  }

  var infoDialog = document.getElementById("player-info-dialog");
  infoDialog.addEventListener("mousedown", function (event) {
    if (event.target.closest("[data-note-cmd]")) event.preventDefault();
  });
  infoDialog.addEventListener("click", function (event) {
    var command = event.target.closest("[data-note-cmd]");
    if (command) {
      document.getElementById("player-notes-input").focus();
      document.execCommand(command.getAttribute("data-note-cmd"), false, null);
      return;
    }
    var removePhoto = event.target.closest("[data-remove-photo]");
    if (removePhoto && infoDraft) {
      var playerId = infoDraft.id;
      infoDraft.photos.splice(Number(removePhoto.getAttribute("data-remove-photo")), 1);
      renderInfoPhotos();
      storePlayerPhotos(playerId, photoNames(), "Foto eliminada.").then(function (result) {
        if (!result || !result.ok) photoStatus("No se pudo quitar la foto.");
        else photoStatus("Foto eliminada.");
      });
      return;
    }
    var editPhoto = event.target.closest("[data-edit-photo]");
    if (editPhoto && infoDraft) {
      openPhotoEditor(Number(editPhoto.getAttribute("data-edit-photo")));
      return;
    }
    var drop = event.target.closest("#player-photo-drop");
    if (drop && infoDraft && infoDraft.photos.length < 5 && event.target.id !== "player-photo-file") {
      document.getElementById("player-photo-file").click();
    }
  });
  infoDialog.addEventListener("dragover", function (event) {
    var zone = event.target.closest("#player-photo-drop");
    if (!zone || !infoDraft) return;
    event.preventDefault();
    if (infoDraft.photos.length < 5) zone.classList.add("is-over");
  });
  infoDialog.addEventListener("dragleave", function (event) {
    var zone = event.target.closest("#player-photo-drop");
    if (!zone || zone.contains(event.relatedTarget)) return;
    zone.classList.remove("is-over");
  });
  infoDialog.addEventListener("drop", function (event) {
    var zone = event.target.closest("#player-photo-drop");
    if (!zone || !infoDraft) return;
    event.preventDefault();
    zone.classList.remove("is-over");
    addPhotoFiles(event.dataTransfer && event.dataTransfer.files);
  });
  infoDialog.addEventListener("change", function (event) {
    paintStatusHint();
    if (event.target.id !== "player-photo-file" || !infoDraft) return;
    var picked = Array.prototype.slice.call(event.target.files || []);
    event.target.value = "";
    addPhotoFiles(picked);
  });
  app.addEventListener("change", function (event) {
    if (event.target.matches("[data-publish-event]")) {
      var publishId = event.target.getAttribute("data-publish-event");
      var savedEvent = eventById(publishId);
      if (!savedEvent) return;
      if (eventUploads && eventUploads.id === publishId) {
        savedEvent.photos = eventUploads.photos.slice();
        savedEvent.video = eventUploads.video || "";
        savedEvent.mediaMode = eventUploads.mediaMode || "both";
        savedEvent.mediaOrder = eventMediaOrder(eventUploads);
        savedEvent.videoFrame = copyVideoFrame(eventUploads.videoFrame);
      }
      var wantPublished = event.target.checked;
      var wasPublished = savedEvent.published === true;
      savedEvent.published = wantPublished;
      var publishBox = event.target;
      api("/api/admin/events", "PUT", { events: events }).then(function (result) {
        if (!result.ok) {
          savedEvent.published = wasPublished;
          publishBox.checked = wasPublished;
          setStatus(result.data.error || "No se pudo guardar.");
          return;
        }
        events = result.data.events;
        setStatus(wantPublished ? "Evento publicado en el sitio." : "El evento ya no se muestra en el sitio.");
        var flagHost = publishBox.closest(".record");
        var item = eventById(publishId) || savedEvent;
        if (flagHost) {
          var flags = flagHost.querySelector(".record-flags");
          var bits = [];
          if (item.published) bits.push("En el sitio");
          var photoCount = item.photos && item.photos.length ? item.photos.length : 0;
          if (photoCount) bits.push(photoCount + (photoCount === 1 ? " foto" : " fotos"));
          if (item.video) bits.push("Video");
          if (!bits.length) {
            if (flags) flags.remove();
          } else {
            if (!flags) {
              flags = document.createElement("p");
              flags.className = "record-flags";
              var copy = flagHost.querySelector("div");
              if (copy) copy.appendChild(flags);
            }
            flags.innerHTML = bits.map(function (flag) { return "<span class=\"record-flag\">" + escapeHtml(flag) + "</span>"; }).join("");
          }
        }
        if (previewingSaved === publishId) paintEventPreview();
      });
      return;
    }
    if (event.target.id === "event-photo-file") {
      var pickedPhotos = Array.prototype.slice.call(event.target.files || []);
      event.target.value = "";
      addEventPhotos(pickedPhotos);
      return;
    }
    if (event.target.id === "event-video-file") {
      var pickedVideo = event.target.files && event.target.files[0];
      event.target.value = "";
      addEventVideo(pickedVideo);
    }
  });
  function eventDropZone(target) {
    var node = target && target.closest ? target : (target && target.parentElement);
    return node && node.closest ? node.closest("#event-photo-drop, #event-video-drop") : null;
  }
  app.addEventListener("dragover", function (event) {
    var zone = eventDropZone(event.target);
    if (!zone || !eventUploads) return;
    event.preventDefault();
    if (zone.id === "event-photo-drop" && eventUploads.photos.length >= 5) return;
    zone.classList.add("is-over");
  });
  app.addEventListener("dragleave", function (event) {
    var zone = eventDropZone(event.target);
    if (!zone || zone.contains(event.relatedTarget)) return;
    zone.classList.remove("is-over");
  });
  app.addEventListener("drop", function (event) {
    var zone = eventDropZone(event.target);
    if (!zone || !eventUploads) return;
    event.preventDefault();
    zone.classList.remove("is-over");
    var dropped = event.dataTransfer && event.dataTransfer.files;
    if (zone.id === "event-photo-drop") addEventPhotos(dropped);
    else addEventVideo(dropped && dropped[0]);
  });
  infoDialog.addEventListener("input", paintStatusHint);
  var photoCanvas = document.getElementById("photo-editor-canvas");
  photoCanvas.addEventListener("pointerdown", function (event) {
    if (!editorImage) return;
    editorDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: editorX, oy: editorY };
    photoCanvas.setPointerCapture(event.pointerId);
  });
  photoCanvas.addEventListener("pointermove", function (event) {
    if (!editorDrag || event.pointerId !== editorDrag.id) return;
    editorX = editorDrag.ox + (event.clientX - editorDrag.x);
    editorY = editorDrag.oy + (event.clientY - editorDrag.y);
    paintPhotoEditor();
  });
  photoCanvas.addEventListener("pointerup", function () { editorDrag = null; });
  photoCanvas.addEventListener("pointercancel", function () { editorDrag = null; });
  document.getElementById("photo-editor-zoom").addEventListener("input", function (event) {
    setEditorZoom(Number(event.target.value) || 1);
  });
  document.getElementById("photo-zoom-out").addEventListener("click", function () { setEditorZoom(editorZoom - 0.15); });
  document.getElementById("photo-zoom-in").addEventListener("click", function () { setEditorZoom(editorZoom + 0.15); });
  document.getElementById("apply-photo-edit").addEventListener("click", applyPhotoEdit);
  document.getElementById("close-photo-editor").addEventListener("click", closePhotoEditor);
  var eventPhotoDialog = document.getElementById("event-photo-dialog");
  var eventPhotoCanvas = document.getElementById("event-photo-canvas");
  eventPhotoDialog.addEventListener("click", function (event) {
    var ratioButton = event.target.closest("[data-photo-ratio]");
    if (!ratioButton) return;
    eventEditorRatio = ratioButton.getAttribute("data-photo-ratio");
    resetEventEditorFrame();
  });
  eventPhotoDialog.addEventListener("close", function () {
    eventEditorImage = null;
    eventEditorDrag = null;
    eventEditorIndex = -1;
  });
  eventPhotoCanvas.addEventListener("pointerdown", function (event) {
    if (!eventEditorImage) return;
    eventEditorDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: eventEditorX, oy: eventEditorY };
    eventPhotoCanvas.setPointerCapture(event.pointerId);
  });
  eventPhotoCanvas.addEventListener("pointermove", function (event) {
    if (!eventEditorDrag || event.pointerId !== eventEditorDrag.id) return;
    eventEditorX = eventEditorDrag.ox + (event.clientX - eventEditorDrag.x);
    eventEditorY = eventEditorDrag.oy + (event.clientY - eventEditorDrag.y);
    paintEventPhotoEditor();
  });
  eventPhotoCanvas.addEventListener("pointerup", function () { eventEditorDrag = null; });
  eventPhotoCanvas.addEventListener("pointercancel", function () { eventEditorDrag = null; });
  document.getElementById("event-photo-zoom").addEventListener("input", function (event) {
    setEventEditorZoom(Number(event.target.value) || 1);
  });
  document.getElementById("event-photo-zoom-out").addEventListener("click", function () { setEventEditorZoom(eventEditorZoom - 0.15); });
  document.getElementById("event-photo-zoom-in").addEventListener("click", function () { setEventEditorZoom(eventEditorZoom + 0.15); });
  document.getElementById("apply-event-photo").addEventListener("click", applyEventPhotoEdit);
  document.getElementById("close-event-photo").addEventListener("click", closeEventPhotoEditor);
  var videoAdjustRatio = "site";
  var videoAdjustZoom = 1;
  var videoAdjustX = 0;
  var videoAdjustY = 0;
  var videoAdjustDrag = null;
  var videoAdjustRecord = null;
  function paintVideoAdjust() {
    var box = document.getElementById("event-video-frame");
    var stage = document.getElementById("event-video-stage");
    if (!box || !stage) return;
    var parts = frameAspect(videoAdjustRatio).split("/").map(function (part) { return Number(part); });
    var maxW = 320;
    var maxH = 360;
    var width = maxW;
    var height = maxW * parts[1] / parts[0];
    if (height > maxH) {
      height = maxH;
      width = maxH * parts[0] / parts[1];
    }
    box.style.width = Math.round(width) + "px";
    box.style.height = Math.round(height) + "px";
    stage.style.setProperty("--zoom", String(videoAdjustZoom));
    stage.style.setProperty("--pan-x", videoAdjustX + "%");
    stage.style.setProperty("--pan-y", videoAdjustY + "%");
    document.querySelectorAll("[data-video-ratio]").forEach(function (button) {
      var on = button.getAttribute("data-video-ratio") === videoAdjustRatio;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var hint = document.getElementById("event-video-ratio-hint");
    var ratio = eventPhotoRatios[videoAdjustRatio];
    if (hint && ratio) hint.textContent = ratio.hint;
    var slider = document.getElementById("event-video-zoom");
    if (slider) slider.value = String(videoAdjustZoom);
  }
  function setVideoAdjustZoom(zoom) {
    videoAdjustZoom = Math.min(3, Math.max(1, zoom));
    paintVideoAdjust();
  }
  function openEventVideoEditor(record) {
    if (!record || !record.video) return;
    videoAdjustRecord = record;
    var frame = copyVideoFrame(record.videoFrame);
    videoAdjustRatio = frame.ratio;
    videoAdjustZoom = frame.zoom;
    videoAdjustX = frame.x;
    videoAdjustY = frame.y;
    var stage = document.getElementById("event-video-stage");
    stage.src = eventMediaUrl(record.video, record.id);
    stage.muted = true;
    stage.loop = true;
    stage.play().catch(function () {});
    paintVideoAdjust();
    var dialog = document.getElementById("event-video-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
  function closeEventVideoEditor() {
    videoAdjustDrag = null;
    videoAdjustRecord = null;
    var stage = document.getElementById("event-video-stage");
    if (stage) {
      stage.pause();
      stage.removeAttribute("src");
      stage.load();
    }
    var dialog = document.getElementById("event-video-dialog");
    if (dialog && dialog.open) dialog.close();
  }
  function applyVideoAdjust() {
    if (!videoAdjustRecord) return;
    var frame = copyVideoFrame({ ratio: videoAdjustRatio, zoom: videoAdjustZoom, x: videoAdjustX, y: videoAdjustY });
    videoAdjustRecord.videoFrame = frame;
    if (eventUploads && videoAdjustRecord.id && eventUploads.id === videoAdjustRecord.id) eventUploads.videoFrame = frame;
    var saved = videoAdjustRecord.id ? eventById(videoAdjustRecord.id) : null;
    if (saved && saved !== videoAdjustRecord) saved.videoFrame = frame;
    var box = document.getElementById("event-preview-media");
    if (box) box.removeAttribute("data-media");
    paintEventPreview();
    var persist = saved && eventUploads && eventUploads.id === saved.id ? saveDraftMedia() : (saved ? saveEventRecord() : Promise.resolve());
    persist.then(function () {
      eventMediaStatus("event-video-status", "Encuadre guardado. La página Eventos muestra el video así.");
      closeEventVideoEditor();
    }).catch(function (error) {
      eventMediaStatus("event-video-status", error.message || "No se pudo guardar el encuadre.");
    });
  }
  var videoFrameBox = document.getElementById("event-video-frame");
  document.getElementById("event-video-dialog").addEventListener("click", function (event) {
    var ratioButton = event.target.closest("[data-video-ratio]");
    if (!ratioButton) return;
    videoAdjustRatio = ratioButton.getAttribute("data-video-ratio");
    paintVideoAdjust();
  });
  videoFrameBox.addEventListener("pointerdown", function (event) {
    if (!videoAdjustRecord) return;
    videoAdjustDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: videoAdjustX, oy: videoAdjustY };
    videoFrameBox.setPointerCapture(event.pointerId);
  });
  videoFrameBox.addEventListener("pointermove", function (event) {
    if (!videoAdjustDrag || event.pointerId !== videoAdjustDrag.id) return;
    var rect = videoFrameBox.getBoundingClientRect();
    videoAdjustX = Math.min(80, Math.max(-80, videoAdjustDrag.ox + ((event.clientX - videoAdjustDrag.x) / rect.width) * 100));
    videoAdjustY = Math.min(80, Math.max(-80, videoAdjustDrag.oy + ((event.clientY - videoAdjustDrag.y) / rect.height) * 100));
    paintVideoAdjust();
  });
  videoFrameBox.addEventListener("pointerup", function () { videoAdjustDrag = null; });
  videoFrameBox.addEventListener("pointercancel", function () { videoAdjustDrag = null; });
  document.getElementById("event-video-zoom").addEventListener("input", function (event) {
    setVideoAdjustZoom(Number(event.target.value) || 1);
  });
  document.getElementById("event-video-zoom-out").addEventListener("click", function () { setVideoAdjustZoom(videoAdjustZoom - 0.15); });
  document.getElementById("event-video-zoom-in").addEventListener("click", function () { setVideoAdjustZoom(videoAdjustZoom + 0.15); });
  document.getElementById("apply-event-video").addEventListener("click", applyVideoAdjust);
  document.getElementById("close-event-video").addEventListener("click", closeEventVideoEditor);
  infoDialog.addEventListener("cancel", function (event) {
    if (!document.getElementById("player-photo-editor").hidden) {
      event.preventDefault();
      closePhotoEditor();
      return;
    }
    infoDraft = null;
  });
  document.getElementById("close-player-info").addEventListener("click", function () {
    closePhotoEditor();
    infoDraft = null;
    infoDialog.close();
  });
  document.getElementById("player-info-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!infoDraft) return;
    var form = new FormData(event.target);
    var age = Number(form.get("age"));
    if (!String(form.get("name") || "").trim()) { infoStatus("Escribe el nombre completo."); return; }
    var ageError = playerAgeError(age);
    if (ageError) { infoStatus(ageError); return; }
    var kept = infoDraft.photos.filter(function (photo) { return photo.file; }).map(function (photo) { return photo.file; });
    var fresh = infoDraft.photos.filter(function (photo) { return photo.data; });
    var next = playerFromInfo(form, kept);
    var button = event.target.querySelector("button[type=submit]");
    var playerId = infoDraft.id;
    button.disabled = true;
    infoStatus("Guardando…");
    saveRoster(players.map(function (item) { return item.id === playerId ? next : item; }), fresh.length ? "" : "Jugadora guardada.").then(function (result) {
      if (!result || !result.ok) { button.disabled = false; infoStatus("No se pudo guardar la jugadora."); return null; }
      if (!fresh.length) {
        infoDraft = null;
        infoDialog.close();
        return null;
      }
      return fresh.reduce(function (chain, photo) {
        return chain.then(function (names) {
          var data = photo.data.indexOf(",") >= 0 ? photo.data.split(",")[1] : photo.data;
          return api("/api/admin/roster/photo", "POST", { id: playerId, data: data }).then(function (uploaded) {
            if (!uploaded.ok) throw new Error((uploaded.data && uploaded.data.error) || "No se pudo guardar la foto.");
            names.push(uploaded.data.file);
            return names;
          });
        });
      }, Promise.resolve(kept.slice()));
    }).then(function (names) {
      if (!names) return;
      next.photos = names;
      return saveRoster(players.map(function (item) { return item.id === playerId ? next : item; }), "Jugadora guardada.");
    }).then(function (result) {
      button.disabled = false;
      if (!result || !result.ok) return;
      infoDraft = null;
      infoDialog.close();
    }).catch(function (error) {
      button.disabled = false;
      infoStatus(error.message || "No se pudo guardar la foto.");
    });
  });

  var notesDialog = document.getElementById("player-notes-dialog");
  document.getElementById("close-player-notes").addEventListener("click", function () { notesDialog.close(); });
  document.addEventListener("dblclick", function (event) {
    var node = event.target;
    if (node && node.nodeType !== 1) node = node.parentElement;
    var cell = node && node.closest("[data-open-notes]");
    if (!cell) return;
    openNotes(cell.getAttribute("data-open-notes"));
  });

  function addPlayer(nextPlayer) {
    var roster = players.filter(function (item) { return item.id !== nextPlayer.id; });
    roster.push(nextPlayer);
    collapseAddForm = true;
    saveRoster(roster, "Jugadora agregada.").then(function (result) {
      if (result && result.ok) return;
      collapseAddForm = false;
      playerDraft = {
        name: nextPlayer.name,
        nickname: nextPlayer.nickname,
        position: nextPlayer.position,
        age: nextPlayer.age,
        country: nextPlayer.country,
        city: nextPlayer.city,
        phone: nextPlayer.phone,
        documentId: nextPlayer.documentId,
        sede: nextPlayer.sede,
        category: nextPlayer.category,
        extra: nextPlayer.extra,
        status: nextPlayer.status,
        addedOn: nextPlayer.addedOn,
        paymentDue: nextPlayer.paymentDue
      };
      rosterOpen = true;
      if (tab === "jugadoras") render();
    });
  }

  var pendingImport = "";
  var duplicateUploadDialog = document.getElementById("duplicate-upload-dialog");
  document.getElementById("cancel-duplicate-upload").addEventListener("click", function () {
    pendingImport = "";
    duplicateUploadDialog.close();
    setStatus("Se canceló la carga del archivo.");
  });
  duplicateUploadDialog.addEventListener("cancel", function () {
    pendingImport = "";
    setStatus("Se canceló la carga del archivo.");
  });
  document.getElementById("confirm-duplicate-upload").addEventListener("click", function () {
    var base64 = pendingImport;
    pendingImport = "";
    duplicateUploadDialog.close();
    if (!base64) return;
    commitImport(base64);
  });

  var pendingPlayer = null;
  var duplicateDialog = document.getElementById("duplicate-player-dialog");
  document.getElementById("cancel-duplicate-player").addEventListener("click", function () {
    pendingPlayer = null;
    duplicateDialog.close();
  });
  duplicateDialog.addEventListener("cancel", function () { pendingPlayer = null; });
  document.getElementById("confirm-duplicate-player").addEventListener("click", function () {
    var nextPlayer = pendingPlayer;
    pendingPlayer = null;
    duplicateDialog.close();
    if (!nextPlayer) return;
    addPlayer(nextPlayer);
  });
  var deleteDialog = document.getElementById("delete-player-dialog");
  document.getElementById("cancel-delete-player").addEventListener("click", function () {
    pendingDeleteIds = [];
    deleteDialog.close();
  });
  deleteDialog.addEventListener("cancel", function () { pendingDeleteIds = []; });
  document.getElementById("confirm-delete-player").addEventListener("click", function () {
    var ids = pendingDeleteIds;
    pendingDeleteIds = [];
    deleteDialog.close();
    if (!ids.length) return;
    ids.forEach(function (id) { delete selectedPlayers[id]; });
    var message = ids.length === 1 ? "Jugadora eliminada." : "Se eliminaron " + ids.length + " jugadoras.";
    saveRoster(players.filter(function (item) { return ids.indexOf(item.id) === -1; }), message);
  });

  api("/api/session", "GET").then(function (result) {
    if (!result.ok) return;
    csrf = result.data.csrf;
    totpEnabled = Boolean(result.data.totpEnabled);
    loadClub().then(openApp).catch(openLogin);
  });
})();
