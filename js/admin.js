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
  var benefits = [];
  var benefitFormOpen = false;
  var editingBenefit = "";
  var benefitDraft = null;
  var benefitUploadBusy = false;
  var benefitFilters = { name: "", link: "", photo: "" };
  var selectedBenefits = {};
  var sponsors = [];
  var sponsorFormOpen = false;
  var editingSponsor = "";
  var sponsorDraft = null;
  var sponsorUploadBusy = false;
  var sponsorFilters = { name: "", link: "", photo: "" };
  var selectedSponsors = {};
  var locations = [];
  var locationFormOpen = false;
  var editingLocation = "";
  var locationDraft = null;
  var locationSaveBusy = false;
  var locationFilters = { team: "", field: "", address: "", day: "", time: "" };
  var skipLocationCapture = false;
  var cups = [];
  var cupTeams = [];
  var cupMatches = [];
  var tournamentSheet = "torneos";
  var editingCup = "";
  var editingCupTeam = "";
  var editingCupMatch = "";
  var teamLogoData = "";
  var teamLogoRemoved = false;
  var teamFormOpen = false;
  var cupFormOpen = false;
  var selectedCupTeams = {};
  var selectedBracketTournament = "";
  var matchToolsOpen = false;
  var matchView = "lista";
  var bracketCup = "";
  var matchFilters = { tournament: "", stage: "", team1: "", team2: "", field: "", date: "", time: "" };
  var matchColumnDefs = [
    ["tournament", "Torneo"],
    ["stage", "Fase"],
    ["team1", "Equipo 1"],
    ["team2", "Equipo 2"],
    ["field", "Cancha"],
    ["date", "Fecha"],
    ["time", "Hora"],
    ["score", "Marcador"],
    ["actions", "Acciones"]
  ];
  var hiddenMatchColumns = {};
  var matchColumnsOpen = true;
  try { matchColumnsOpen = localStorage.getItem("gfc-admin-match-columns") !== "closed"; } catch (error) { matchColumnsOpen = true; }
  try {
    var storedMatchColumns = JSON.parse(localStorage.getItem("gfc-admin-match-hidden") || "{}");
    matchColumnDefs.forEach(function (column) {
      if (storedMatchColumns[column[0]]) hiddenMatchColumns[column[0]] = true;
    });
    if (matchColumnDefs.every(function (column) { return hiddenMatchColumns[column[0]]; })) hiddenMatchColumns = {};
  } catch (error) { hiddenMatchColumns = {}; }
  var cupSaveBusy = false;
  var cupStages = {
    group: "Fase de grupos",
    r16: "Octavos de final",
    quarter: "Cuartos de final",
    semi: "Semifinal",
    final: "Final",
    third: "Tercer puesto",
    match: "Partido"
  };
  var locationDays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  var locationDayOrder = [1, 2, 3, 4, 5, 6, 0];
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
  var dragPartner = null;
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
    { id: "sedes", label: "Sedes", copy: "Mapa y horarios de entrenamiento. Cada sede guardada aparece en el mapa." },
    { id: "plantilla", label: "Plantilla", copy: "Jugadoras del equipo y el cuerpo técnico." },
    { id: "nosotras", label: "Nosotras", copy: "Visión, misión, categorías e historia del club." },
    { id: "patrocinadores", label: "Patrocinadores", copy: "Aliados, descuentos y el torneo." },
    { id: "beneficios", label: "Beneficios", copy: "Tarjeta VIP y los descuentos de los aliados." },
    { id: "torneos", label: "Torneos", copy: "Torneos, equipos y partidos. Si está visible, la página Torneos del sitio muestra el cuadro." },
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
  var squadSheets = [
    { id: "cat-a", label: "A", group: "category", match: "A" },
    { id: "cat-b", label: "B", group: "category", match: "B" },
    { id: "cat-c", label: "C", group: "category", match: "C" },
    { id: "all-stars", label: "All Stars", group: "extra", match: "All Stars" },
    { id: "futbol-11", label: "Futbol 11", group: "extra", match: "Futbol 11" },
    { id: "seleccion", label: "La Seleccion", group: "extra", match: "La Seleccion" },
    { id: "no-aplica", label: "No aplica", group: "extra", match: "No aplica", exact: true }
  ];
  var squadSheet = "cat-a";
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
    torneos: navIcon("<path d=\"M8 4h8v2a4 4 0 0 1-8 0V4Z\"" + navStroke + "></path><path d=\"M8 5H5.5A2.5 2.5 0 0 0 8 8.5M16 5h2.5A2.5 2.5 0 0 1 16 8.5M12 10v2.2M9.5 20h5M10 14.5h4V20h-4Z\"" + navStroke + "></path>"),
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

  function analyticsValue() {
    var analytics = settings && settings.analytics ? settings.analytics : {};
    return {
      googleId: analytics.googleId || "",
      googleOn: analytics.googleOn === true,
      facebookId: analytics.facebookId || "",
      facebookOn: analytics.facebookOn === true
    };
  }

  function analyticsSettingsCard() {
    var current = analyticsValue();
    return "<article class=\"panel-card\"><form id=\"analytics-form\">" +
      "<h2>Medición del sitio</h2>" +
      "<p>Estos datos activan Google Analytics y el píxel de Facebook en las páginas públicas. Esta administración no se mide.</p>" +
      "<section class=\"analytics-block\">" +
      "<h3>Google Analytics</h3>" +
      "<label class=\"switch\"><input type=\"checkbox\" name=\"googleOn\"" + (current.googleOn ? " checked" : "") + "><span class=\"switch-track\" aria-hidden=\"true\"></span><span>Activo en el sitio</span></label>" +
      "<label class=\"field\" for=\"google-measurement-id\">ID de medición<input id=\"google-measurement-id\" name=\"googleId\" value=\"" + escapeHtml(current.googleId) + "\" placeholder=\"G-XXXXXXXXXX\" maxlength=\"18\" autocomplete=\"off\" spellcheck=\"false\"></label>" +
      "<p class=\"field-hint\">En Google Analytics abre Administrar, luego Flujos de datos, y copia el ID de medición.</p>" +
      "<p class=\"analytics-links\"><a class=\"btn btn-ghost\" href=\"https://analytics.google.com/\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir Google Analytics</a></p>" +
      "</section>" +
      "<section class=\"analytics-block\">" +
      "<h3>Píxel de Facebook</h3>" +
      "<label class=\"switch\"><input type=\"checkbox\" name=\"facebookOn\"" + (current.facebookOn ? " checked" : "") + "><span class=\"switch-track\" aria-hidden=\"true\"></span><span>Activo en el sitio</span></label>" +
      "<label class=\"field\" for=\"facebook-pixel-id\">ID del píxel<input id=\"facebook-pixel-id\" name=\"facebookId\" value=\"" + escapeHtml(current.facebookId) + "\" placeholder=\"123456789012345\" maxlength=\"20\" inputmode=\"numeric\" autocomplete=\"off\" spellcheck=\"false\"></label>" +
      "<p class=\"field-hint\">En el Administrador de eventos abre el píxel y copia su identificador numérico.</p>" +
      "<p class=\"analytics-links\"><a class=\"btn btn-ghost\" href=\"https://business.facebook.com/events_manager2\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir el píxel de Facebook</a></p>" +
      "</section>" +
      "<p id=\"analytics-error\" class=\"form-error\" role=\"alert\" hidden></p>" +
      "<div class=\"admin-actions\"><button class=\"btn\" type=\"submit\">Guardar medición</button></div>" +
      "</form></article>";
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

  function rosterViewOnly() {
    return tab === "plantilla";
  }

  function playerOnSheet(item, sheet) {
    if (sheet.group === "category") return String(item.category || "").trim() === sheet.match;
    var extra = String(item.extra || "");
    if (sheet.exact) return foldText(extra) === foldText(sheet.match);
    return foldText(extra).indexOf(foldText(sheet.match)) !== -1;
  }

  function currentSquadSheet() {
    for (var i = 0; i < squadSheets.length; i += 1) {
      if (squadSheets[i].id === squadSheet) return squadSheets[i];
    }
    return squadSheets[0];
  }

  function visiblePlayers() {
    var source = players;
    if (rosterViewOnly()) source = players.filter(function (item) { return playerOnSheet(item, currentSquadSheet()); });
    var filtered = source.filter(function (item) {
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
      var editing = !rosterViewOnly() && item.id === editingPlayer;
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
      var check = rosterViewOnly() ? "" : "<td class=\"roster-check\"><input type=\"checkbox\" data-select-player=\"" + escapeHtml(item.id) + "\" aria-label=\"Seleccionar a " + escapeHtml(item.name) + "\"" + (selected ? " checked" : "") + "></td>";
      var actionCell = rosterViewOnly() ? "" : "<td class=\"roster-actions\">" + actions + "</td>";
      return "<tr" + (classes.length ? " class=\"" + classes.join(" ") + "\"" : "") + ">" + check + cells + actionCell + "</tr>";
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
    var head = rosterViewOnly() ? "" : "<th class=\"roster-check\"><input type=\"checkbox\" id=\"roster-select-all\" aria-label=\"Seleccionar todas\"></th>";
    head += shownColumns().map(function (column) {
      var key = column[0];
      var filtered = columnFiltered(key);
      var classes = [];
      if (filtered) classes.push("is-filtered");
      if (filterKind(key) === "date") classes.push("is-date");
      if (key === "photos") classes.push("is-photos");
      return "<th data-column=\"" + key + "\" aria-sort=\"" + rosterSortState(key) + "\"" + (classes.length ? " class=\"" + classes.join(" ") + "\"" : "") + "><div class=\"roster-head-row\"><span class=\"roster-drag\" draggable=\"true\" data-drag-column=\"" + key + "\" role=\"button\" tabindex=\"0\" title=\"Arrastrar para mover\" aria-label=\"Mover " + escapeHtml(column[1]) + "\">" + dragIcon + "</span><button type=\"button\" class=\"roster-sort\" data-sort=\"" + key + "\"><span class=\"roster-filter-mark\" aria-hidden=\"true\"></span><span>" + escapeHtml(column[1]) + "</span><span class=\"roster-arrow\" aria-hidden=\"true\">" + rosterArrow(key) + "</span></button></div><span class=\"sr-only roster-filter-note\"" + (filtered ? "" : " hidden") + ">Filtro activo</span>" + filterControl(column) + "</th>";
    }).join("");
    return head + (rosterViewOnly() ? "" : "<th class=\"roster-actions\">Acciones</th>");
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

  function squadSheetButton(sheet) {
    var count = players.filter(function (item) { return playerOnSheet(item, sheet); }).length;
    var active = sheet.id === currentSquadSheet().id;
    return "<button type=\"button\" class=\"squad-sheet" + (active ? " is-active" : "") + "\" data-squad-sheet=\"" + sheet.id + "\" role=\"tab\" aria-selected=\"" + (active ? "true" : "false") + "\">" + escapeHtml(sheet.label) + "<span class=\"squad-count\">" + count + "</span></button>";
  }

  function squadPanel() {
    var page = siteTabs.filter(function (item) { return item.id === "plantilla"; })[0];
    var rows = visiblePlayers();
    var emptyText = !players.length ? "No hay jugadoras." : "Ninguna jugadora coincide con el filtro.";
    var emptyHidden = rows.length ? " hidden" : "";
    var categoryTabs = squadSheets.filter(function (sheet) { return sheet.group === "category"; }).map(squadSheetButton).join("");
    var extraTabs = squadSheets.filter(function (sheet) { return sheet.group === "extra"; }).map(squadSheetButton).join("");
    return sitePanel(page) +
      "<section class=\"roster-layout is-squad\"><div class=\"roster-grid panel-card\"><div class=\"roster-toolbar\"><p>Esta vista lee las jugadoras de la pestaña Jugadoras. Para editar o quitar, usa esa pestaña.</p><div class=\"roster-toolbar-actions\"><button class=\"btn\" type=\"button\" id=\"squad-refresh\">Actualizar</button></div></div><div class=\"squad-sheets\" role=\"tablist\" aria-label=\"Hojas de la plantilla\"><span class=\"squad-sheet-label\">Categoría</span>" + categoryTabs + "<span class=\"squad-sheet-label\">Adicionales</span>" + extraTabs + "</div><div class=\"roster-board\"><div class=\"roster-frame\"><div class=\"roster-scroll\"><table><thead><tr id=\"roster-head\">" + rosterHeadHtml() + "</tr></thead><tbody id=\"roster-rows\">" + rosterRowHtml(rows) + "</tbody></table></div><p id=\"roster-empty\" class=\"roster-empty\"" + emptyHidden + ">" + emptyText + "</p></div><aside class=\"roster-columns" + (columnsOpen ? "" : " is-collapsed") + "\" aria-labelledby=\"roster-columns-title\"><div class=\"roster-columns-head\"><button type=\"button\" class=\"columns-toggle\" id=\"columns-toggle\" aria-expanded=\"" + (columnsOpen ? "true" : "false") + "\" aria-controls=\"roster-column-body\" aria-label=\"" + (columnsOpen ? "Ocultar columnas" : "Mostrar columnas") + "\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M9 6l6 6-6 6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path></svg></button><p id=\"roster-columns-title\" class=\"roster-columns-title\">Columnas</p></div><div id=\"roster-column-body\"><p class=\"roster-columns-note\">Arrastra el icono para cambiar el orden de la tabla.</p><ul id=\"roster-column-list\">" + columnPickerItemsHtml() + "</ul></div></aside></div></div></section>";
  }

  function refreshSquad() {
    var button = document.getElementById("squad-refresh");
    if (button) button.disabled = true;
    setStatus("Actualizando la plantilla…");
    api("/api/admin/roster", "GET").then(function (result) {
      if (button) button.disabled = false;
      if (!result.ok) {
        setStatus(result.data.error || "No se pudo actualizar la plantilla.");
        return;
      }
      players = result.data.players || [];
      editingPlayer = "";
      setStatus("Plantilla actualizada.");
      render();
    }).catch(function () {
      if (button) button.disabled = false;
      setStatus("No se pudo actualizar la plantilla.");
    });
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

  function benefitById(id) {
    return benefits.filter(function (item) { return item.id === id; })[0] || null;
  }

  function benefitPhotoSrc(id, file) {
    return "/api/admin/benefits/media?id=" + encodeURIComponent(id) + "&file=" + encodeURIComponent(file);
  }

  function releaseBenefitFile(id, file) {
    if (!file) return Promise.resolve();
    var saved = benefitById(id);
    if (saved && saved.photo === file) return Promise.resolve();
    return api("/api/admin/benefits/media/remove", "POST", { id: id, file: file });
  }

  function discardBenefitDraft() {
    if (!benefitDraft) {
      benefitFormOpen = false;
      editingBenefit = "";
      return;
    }
    var draft = benefitDraft;
    var saved = benefitById(draft.id);
    var extra = draft.photo && (!saved || saved.photo !== draft.photo) ? draft.photo : "";
    benefitDraft = null;
    benefitFormOpen = false;
    editingBenefit = "";
    if (extra) releaseBenefitFile(draft.id, extra);
  }

  var benefitSaveGen = 0;
  var sponsorSaveGen = 0;

  function saveBenefitList(list, message) {
    captureBenefitEdits();
    var gen = ++benefitSaveGen;
    return api("/api/admin/benefits", "PUT", { benefits: list }).then(function (result) {
      if (gen !== benefitSaveGen) return result;
      if (result.ok) {
        benefits = result.data.benefits || [];
        rememberBenefits();
        document.querySelectorAll("[data-benefit-name]").forEach(function (input) {
          var item = benefitById(input.getAttribute("data-benefit-name"));
          if (item && input.value !== item.name) {
            item.name = input.value;
            benefitSaved[item.id] = "";
          }
        });
        document.querySelectorAll("[data-benefit-link]").forEach(function (input) {
          var item = benefitById(input.getAttribute("data-benefit-link"));
          if (item && input.value !== (item.link || "")) {
            item.link = input.value;
            benefitSaved[item.id] = "";
          }
        });
        setStatus(message || "");
      }
      return result;
    });
  }

  function benefitFormHtml() {
    var current = editingBenefit ? benefitById(editingBenefit) : null;
    var name = benefitDraft && benefitDraft.formName != null ? benefitDraft.formName : (current ? current.name : "");
    var link = benefitDraft && benefitDraft.formLink != null ? benefitDraft.formLink : (current ? current.link : "");
    var photo = editingBenefit
      ? "<div class=\"wide\"><span class=\"field-label\">Foto</span><div id=\"benefit-photo-drop\" class=\"photo-drop\"><p>Suelta la foto aquí o elige un archivo.</p><p class=\"field-hint\">Una foto, en JPG, PNG o WebP.</p><button class=\"btn btn-ghost\" type=\"button\" id=\"benefit-photo-add\">Elegir foto</button><input id=\"benefit-photo-file\" type=\"file\" accept=\"image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp\" hidden></div><div id=\"benefit-photo-list\" class=\"photo-list\">" + benefitPhotoFigure() + "</div><p id=\"benefit-photo-status\" class=\"photo-status\" role=\"status\"></p></div>"
      : "<div class=\"wide\"><span class=\"field-label\">Fotos</span><div id=\"benefit-photo-drop\" class=\"photo-drop\"><p>Suelta las fotos aquí o elige archivos.</p><p class=\"field-hint\">Cada foto agrega una fila oculta, con la imagen a la izquierda del nombre. Edita el nombre y el enlace en la fila. Lo escrito se conserva al agregar más fotos.</p><button class=\"btn btn-ghost\" type=\"button\" id=\"benefit-photo-add\">Elegir fotos</button><input id=\"benefit-photo-file\" type=\"file\" accept=\"image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp\" multiple hidden></div><p id=\"benefit-photo-status\" class=\"photo-status\" role=\"status\"></p></div>";
    return "<form id=\"benefit-form\" class=\"form-grid\">" +
      "<h2 class=\"wide\">" + (editingBenefit ? "Editar beneficio" : "Nuevo beneficio") + "</h2>" +
      "<p id=\"benefit-error\" class=\"form-error wide\" role=\"alert\" hidden></p>" +
      "<label class=\"field\">Nombre<input name=\"name\" required maxlength=\"80\" value=\"" + escapeHtml(name) + "\" placeholder=\"Nombre del beneficio\"></label>" +
      "<label class=\"field\">Enlace<input name=\"link\" type=\"url\" maxlength=\"300\" value=\"" + escapeHtml(link) + "\" placeholder=\"https://\"></label>" +
      photo +
      "<div class=\"admin-actions wide\"><button class=\"btn\" type=\"submit\">" + (editingBenefit ? "Guardar beneficio" : "Agregar beneficio") + "</button><button class=\"btn btn-ghost\" type=\"button\" id=\"cancel-benefit\">Cancelar</button></div>" +
      "</form>";
  }

  function benefitPhotoFigure() {
    if (!benefitDraft || !benefitDraft.photo) return "";
    return "<figure><img src=\"" + escapeHtml(benefitPhotoSrc(benefitDraft.id, benefitDraft.photo)) + "\" alt=\"\"><button type=\"button\" data-remove-benefit-photo>Quitar</button></figure>";
  }

  function paintBenefitPhoto() {
    var list = document.getElementById("benefit-photo-list");
    if (list) list.innerHTML = benefitPhotoFigure();
  }

  function visibleBenefits() {
    var name = benefitFilters.name.trim().toLowerCase();
    var link = benefitFilters.link.trim().toLowerCase();
    return benefits.filter(function (item) {
      if (name && item.name.toLowerCase().indexOf(name) === -1) return false;
      if (link && String(item.link || "").toLowerCase().indexOf(link) === -1) return false;
      if (benefitFilters.photo === "added" && !item.photo) return false;
      if (benefitFilters.photo === "empty" && item.photo) return false;
      return true;
    });
  }

  function benefitFilterCell(label, key, control) {
    var active = key === "photo" ? benefitFilters.photo !== "" : benefitFilters[key].trim() !== "";
    return "<th" + (active ? " class=\"is-filtered\"" : "") + "><span>" + label + "</span>" + control + "</th>";
  }

  function benefitRows() {
    var shown = visibleBenefits();
    if (!benefits.length) return "<tr><td colspan=\"6\">Todavía no hay beneficios agregados.</td></tr>";
    if (!shown.length) return "<tr><td colspan=\"6\">Ningún beneficio coincide con el filtro.</td></tr>";
    return shown.map(function (item) {
      var thumb = item.photo
        ? "<button type=\"button\" class=\"benefit-thumb-btn\" data-preview-partner=\"" + escapeHtml(item.name) + "\" aria-label=\"Ver la foto de " + escapeHtml(item.name) + "\"><img class=\"benefit-row-photo\" src=\"" + escapeHtml(benefitPhotoSrc(item.id, item.photo)) + "\" alt=\"\"></button>"
        : "<span class=\"benefit-row-photo is-empty\"></span>";
      var photo = item.photo ? "Agregada" : "Sin agregar";
      var toggle = item.visible === false ? "Mostrar" : "Ocultar";
      var toggleClass = item.visible === false ? "btn is-show" : "btn btn-ghost";
      var selected = selectedBenefits[item.id] ? " checked" : "";
      var mover = "<span class=\"benefit-drag\" draggable=\"true\" data-drag-partner=\"benefit\" data-partner-id=\"" + escapeHtml(item.id) + "\" role=\"button\" tabindex=\"0\" title=\"Arrastrar para mover\" aria-label=\"Mover " + escapeHtml(item.name) + "\">" + dragIcon + "</span>";
      return "<tr data-partner-row=\"benefit\" data-partner-id=\"" + escapeHtml(item.id) + "\"" + (selected ? " class=\"is-selected\"" : "") + "><td class=\"benefit-check\"><span class=\"benefit-check-tools\">" + mover + "<input type=\"checkbox\" data-select-benefit=\"" + escapeHtml(item.id) + "\" aria-label=\"Seleccionar " + escapeHtml(item.name) + "\"" + selected + "></span></td><td class=\"benefit-thumb\">" + thumb + "</td><td><input class=\"benefit-row-input\" data-benefit-name=\"" + escapeHtml(item.id) + "\" maxlength=\"80\" value=\"" + escapeHtml(item.name) + "\" aria-label=\"Nombre de " + escapeHtml(item.name) + "\"></td><td><input class=\"benefit-row-input\" data-benefit-link=\"" + escapeHtml(item.id) + "\" maxlength=\"300\" value=\"" + escapeHtml(item.link || "") + "\" placeholder=\"https://\" aria-label=\"Enlace de " + escapeHtml(item.name) + "\"></td><td>" + photo + "</td><td><div class=\"benefit-actions\">" +
        "<button class=\"" + toggleClass + "\" type=\"button\" data-toggle-benefit=\"" + escapeHtml(item.id) + "\">" + toggle + "</button>" +
        "<button class=\"btn btn-ghost\" type=\"button\" data-edit-benefit=\"" + escapeHtml(item.id) + "\">Editar</button>" +
        "<button class=\"btn btn-ghost\" type=\"button\" data-remove-benefit=\"" + escapeHtml(item.id) + "\">Quitar</button>" +
        "</div></td></tr>";
    }).join("");
  }

  function syncSelectionButtons(prefix, items, selected) {
    var chosen = items.filter(function (item) { return selected[item.id]; });
    var hidden = chosen.filter(function (item) { return item.visible === false; }).length;
    [["show", hidden, "Mostrar seleccionados"], ["hide", chosen.length - hidden, "Ocultar seleccionados"], ["delete", chosen.length, "Quitar seleccionados"]].forEach(function (entry) {
      var button = document.getElementById(prefix + "-bulk-" + entry[0]);
      if (!button) return;
      button.disabled = entry[1] === 0;
      button.textContent = entry[1] ? entry[2] + " (" + entry[1] + ")" : entry[2];
    });
  }

  function applyPartnerVisibility(kind, visible) {
    var source = kind === "sponsor" ? sponsors : benefits;
    var selected = kind === "sponsor" ? selectedSponsors : selectedBenefits;
    var changed = 0;
    var next = source.map(function (item) {
      if (!selected[item.id] || (item.visible !== false) === visible) return item;
      changed += 1;
      var copy = {};
      Object.keys(item).forEach(function (key) { copy[key] = item[key]; });
      copy.visible = visible;
      return copy;
    });
    if (!changed) return;
    var message = kind === "sponsor"
      ? (visible
        ? (changed === 1 ? "El patrocinador quedó visible." : "Los patrocinadores quedaron visibles.")
        : (changed === 1 ? "El patrocinador quedó oculto." : "Los patrocinadores quedaron ocultos."))
      : (visible
        ? (changed === 1 ? "El beneficio quedó visible." : "Los beneficios quedaron visibles.")
        : (changed === 1 ? "El beneficio quedó oculto." : "Los beneficios quedaron ocultos."));
    var done = function (result) {
      if (!result.ok) setStatus(result.data.error || "No se pudo guardar.");
      else if (kind === "sponsor") paintSponsorRows();
      else paintBenefitRows();
    };
    if (kind === "sponsor") {
      sponsors = next;
      saveSponsorList(sponsors, message).then(done);
    } else {
      benefits = next;
      saveBenefitList(benefits, message).then(done);
    }
  }

  function syncBenefitSelection() {
    var shown = visibleBenefits();
    var shownSelected = shown.filter(function (item) { return selectedBenefits[item.id]; }).length;
    syncSelectionButtons("benefit", benefits, selectedBenefits);
    var all = document.getElementById("benefit-select-all");
    if (all) {
      all.checked = shown.length > 0 && shownSelected === shown.length;
      all.indeterminate = shownSelected > 0 && shownSelected < shown.length;
    }
  }

  function paintBenefitRows() {
    captureBenefitEdits();
    var body = document.querySelector(".benefit-table tbody");
    if (!body) return;
    body.innerHTML = benefitRows();
    syncBenefitSelection();
  }

  function benefitsPanel() {
    var page = siteTabs.filter(function (item) { return item.id === "beneficios"; })[0];
    var nameFilter = "<input class=\"roster-filter\" data-benefit-filter=\"name\" type=\"search\" placeholder=\"Filtrar\" aria-label=\"Filtrar nombre\" value=\"" + escapeHtml(benefitFilters.name) + "\">";
    var linkFilter = "<input class=\"roster-filter\" data-benefit-filter=\"link\" type=\"search\" placeholder=\"Filtrar\" aria-label=\"Filtrar enlace\" value=\"" + escapeHtml(benefitFilters.link) + "\">";
    var photoFilter = "<select class=\"roster-filter\" data-benefit-filter=\"photo\" aria-label=\"Filtrar foto\"><option value=\"\">Todas</option><option value=\"added\"" + (benefitFilters.photo === "added" ? " selected" : "") + ">Agregada</option><option value=\"empty\"" + (benefitFilters.photo === "empty" ? " selected" : "") + ">Sin agregar</option></select>";
    return sitePanel(page) +
      "<article class=\"panel-card benefits-admin\"><div class=\"admin-actions\"><button class=\"btn\" type=\"button\" id=\"add-benefit\"" + (benefitFormOpen ? " hidden" : "") + ">Agregar beneficio</button></div>" +
      (benefitFormOpen ? benefitFormHtml() : "") +
      "<div class=\"admin-actions benefit-bulk\"><button class=\"btn is-show\" type=\"button\" id=\"benefit-bulk-show\" disabled>Mostrar seleccionados</button><button class=\"btn btn-ghost\" type=\"button\" id=\"benefit-bulk-hide\" disabled>Ocultar seleccionados</button><button class=\"btn btn-ghost\" type=\"button\" id=\"benefit-bulk-delete\" disabled>Quitar seleccionados</button></div>" +
      "<div class=\"benefit-table-wrap\"><table class=\"benefit-table\"><thead><tr><th class=\"benefit-check\"><input type=\"checkbox\" id=\"benefit-select-all\" aria-label=\"Seleccionar los beneficios visibles\"></th><th class=\"benefit-thumb\"><span class=\"sr-only\">Imagen</span></th>" +
      benefitFilterCell("Nombre", "name", nameFilter) +
      benefitFilterCell("Enlace", "link", linkFilter) +
      benefitFilterCell("Foto", "photo", photoFilter) +
      "<th>Acciones</th></tr></thead><tbody>" + benefitRows() + "</tbody></table></div></article>";
  }

  function openBenefitForm(id) {
    var current = id ? benefitById(id) : null;
    if (id && !current) return;
    discardBenefitDraft();
    benefitFormOpen = true;
    editingBenefit = id || "";
    benefitDraft = {
      id: current ? current.id : "b-" + Date.now().toString(36),
      photo: current ? current.photo || "" : "",
      fresh: !current,
      formName: current ? current.name : "",
      formLink: current ? current.link : ""
    };
    render();
    var form = document.getElementById("benefit-form");
    if (form) form.scrollIntoView({ block: "nearest" });
  }

  function setBenefitError(message) {
    var error = document.getElementById("benefit-error");
    if (!error) return;
    error.hidden = !message;
    error.textContent = message || "";
  }

  function setBenefitPhotoStatus(message) {
    var status = document.getElementById("benefit-photo-status");
    if (status) status.textContent = message || "";
  }

  function addBenefitPhoto(file) {
    if (!benefitDraft || benefitUploadBusy || !file) return;
    if (!acceptedPhoto(file)) {
      setBenefitPhotoStatus("La foto debe ser JPG, PNG o WebP.");
      return;
    }
    var id = benefitDraft.id;
    var previous = benefitDraft.photo;
    benefitUploadBusy = true;
    setBenefitPhotoStatus("Subiendo foto…");
    readPhotoFile(file).then(function (data) {
      var payload = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
      return api("/api/admin/benefits/photo", "POST", { id: id, data: payload });
    }).then(function (result) {
      if (!result.ok) throw new Error((result.data && result.data.error) || "No se pudo guardar la foto.");
      if (!benefitDraft || benefitDraft.id !== id) return releaseBenefitFile(id, result.data.file);
      benefitDraft.photo = result.data.file;
      paintBenefitPhoto();
      setBenefitPhotoStatus("Foto lista. Guarda el beneficio para publicarla.");
      if (previous && previous !== result.data.file) return releaseBenefitFile(id, previous);
    }).catch(function (error) {
      setBenefitPhotoStatus(error.message || "La foto no se pudo leer.");
    }).then(function () {
      benefitUploadBusy = false;
    });
  }

  function pictureName(file) {
    var base = String(file && file.name || "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    return base.slice(0, 80) || "Sin nombre";
  }

  function partnerId(prefix, index) {
    return prefix + Date.now().toString(36) + index.toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function uploadPartnerPhoto(path, id, file) {
    return readPhotoFile(file).then(function (data) {
      var payload = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
      return api(path, "POST", { id: id, data: payload });
    });
  }

  var benefitSaved = {};
  var sponsorSaved = {};

  function rememberBenefits() {
    benefitSaved = {};
    benefits.forEach(function (item) {
      benefitSaved[item.id] = item.name + "\n" + (item.link || "");
    });
  }

  function rememberSponsors() {
    sponsorSaved = {};
    sponsors.forEach(function (item) {
      sponsorSaved[item.id] = item.name + "\n" + (item.link || "");
    });
  }

  function captureBenefitEdits() {
    var form = document.getElementById("benefit-form");
    if (form && benefitDraft) {
      if (form.name) benefitDraft.formName = form.name.value;
      if (form.link) benefitDraft.formLink = form.link.value;
    }
    document.querySelectorAll("[data-benefit-name]").forEach(function (input) {
      var item = benefitById(input.getAttribute("data-benefit-name"));
      if (item) item.name = input.value;
    });
    document.querySelectorAll("[data-benefit-link]").forEach(function (input) {
      var item = benefitById(input.getAttribute("data-benefit-link"));
      if (item) item.link = input.value;
    });
  }

  function captureSponsorEdits() {
    var form = document.getElementById("sponsor-form");
    if (form && sponsorDraft) {
      if (form.name) sponsorDraft.formName = form.name.value;
      if (form.link) sponsorDraft.formLink = form.link.value;
    }
    document.querySelectorAll("[data-sponsor-name]").forEach(function (input) {
      var item = sponsorById(input.getAttribute("data-sponsor-name"));
      if (item) item.name = input.value;
    });
    document.querySelectorAll("[data-sponsor-link]").forEach(function (input) {
      var item = sponsorById(input.getAttribute("data-sponsor-link"));
      if (item) item.link = input.value;
    });
  }

  function addBenefitPhotos(files) {
    var accepted = [];
    Array.prototype.forEach.call(files || [], function (file) {
      if (acceptedPhoto(file)) accepted.push(file);
    });
    if (!accepted.length) {
      setBenefitPhotoStatus("Las fotos deben ser JPG, PNG o WebP.");
      return;
    }
    if (editingBenefit) {
      addBenefitPhoto(accepted[0]);
      if (accepted.length > 1) setBenefitPhotoStatus("En la edición solo se cambia una foto.");
      return;
    }
    var room = 80 - benefits.length;
    if (room <= 0) {
      setBenefitPhotoStatus("Ya hay 80 beneficios.");
      return;
    }
    if (accepted.length > room) accepted = accepted.slice(0, room);
    captureBenefitEdits();
    benefitUploadBusy = true;
    setBenefitPhotoStatus("Subiendo fotos…");
    var created = [];
    var chain = Promise.resolve();
    accepted.forEach(function (file, index) {
      chain = chain.then(function () {
        var id = partnerId("b-", index);
        return uploadPartnerPhoto("/api/admin/benefits/photo", id, file).then(function (result) {
          if (!result.ok) throw new Error((result.data && result.data.error) || "No se pudo guardar la foto.");
          created.push({
            id: id,
            name: pictureName(file),
            link: "",
            photo: result.data.file,
            visible: false
          });
        });
      });
    });
    chain.then(function () {
      benefitFilters = { name: "", link: "", photo: "" };
      benefits = benefits.concat(created);
      return saveBenefitList(benefits, created.length === 1 ? "Se agregó 1 beneficio oculto." : "Se agregaron " + created.length + " beneficios ocultos.");
    }).then(function (result) {
      if (!result || !result.ok) {
        var failedBenefits = {};
        created.forEach(function (item) {
          failedBenefits[item.id] = true;
          releaseBenefitFile(item.id, item.photo);
        });
        benefits = benefits.filter(function (item) { return !failedBenefits[item.id]; });
        setBenefitPhotoStatus((result && result.data && result.data.error) || "No se pudo guardar.");
        return;
      }
      paintBenefitRows();
      setBenefitPhotoStatus(created.length === 1 ? "Se agregó una fila oculta. Edita el nombre y el enlace." : "Se agregaron " + created.length + " filas ocultas. Edita el nombre y el enlace en cada fila.");
    }).catch(function (error) {
      var failedBenefits = {};
      created.forEach(function (item) {
        failedBenefits[item.id] = true;
        releaseBenefitFile(item.id, item.photo);
      });
      benefits = benefits.filter(function (item) { return !failedBenefits[item.id]; });
      setBenefitPhotoStatus(error.message || "No se pudo guardar la foto.");
    }).then(function () {
      benefitUploadBusy = false;
    });
  }

  function submitBenefit(form) {
    if (!benefitDraft) return;
    if (benefitUploadBusy) {
      setBenefitError("Espera a que termine la foto.");
      return;
    }
    var name = String(new FormData(form).get("name") || "").trim();
    var link = String(new FormData(form).get("link") || "").trim();
    if (!name) return setBenefitError("Escribe el nombre del beneficio.");
    if (link && !/^https?:\/\//i.test(link)) return setBenefitError("El enlace debe empezar por https://.");
    var existing = benefitById(benefitDraft.id);
    var next = {
      id: benefitDraft.id,
      name: name,
      link: link,
      photo: benefitDraft.photo || "",
      visible: existing ? existing.visible !== false : true
    };
    var list = [];
    var placed = false;
    benefits.forEach(function (item) {
      if (item.id === next.id) {
        list.push(next);
        placed = true;
      } else list.push(item);
    });
    if (!placed) list.push(next);
    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    setBenefitError("");
    benefits = list;
    saveBenefitList(benefits, existing ? "Beneficio actualizado." : "Beneficio agregado.").then(function (result) {
      button.disabled = false;
      if (!result.ok) return setBenefitError(result.data.error || "No se pudo guardar.");
      benefitDraft = null;
      benefitFormOpen = false;
      editingBenefit = "";
      render();
    }).catch(function () {
      button.disabled = false;
      setBenefitError("No se pudo guardar.");
    });
  }

  function sponsorById(id) {
    return sponsors.filter(function (item) { return item.id === id; })[0] || null;
  }

  function sponsorPhotoSrc(id, file) {
    return "/api/admin/sponsors/media?id=" + encodeURIComponent(id) + "&file=" + encodeURIComponent(file);
  }

  function releaseSponsorFile(id, file) {
    if (!file) return Promise.resolve();
    var saved = sponsorById(id);
    if (saved && saved.photo === file) return Promise.resolve();
    return api("/api/admin/sponsors/media/remove", "POST", { id: id, file: file });
  }

  function discardSponsorDraft() {
    if (!sponsorDraft) {
      sponsorFormOpen = false;
      editingSponsor = "";
      return;
    }
    var draft = sponsorDraft;
    var saved = sponsorById(draft.id);
    var extra = draft.photo && (!saved || saved.photo !== draft.photo) ? draft.photo : "";
    sponsorDraft = null;
    sponsorFormOpen = false;
    editingSponsor = "";
    if (extra) releaseSponsorFile(draft.id, extra);
  }

  function saveSponsorList(list, message) {
    captureSponsorEdits();
    var gen = ++sponsorSaveGen;
    return api("/api/admin/sponsors", "PUT", { sponsors: list }).then(function (result) {
      if (gen !== sponsorSaveGen) return result;
      if (result.ok) {
        sponsors = result.data.sponsors || [];
        rememberSponsors();
        document.querySelectorAll("[data-sponsor-name]").forEach(function (input) {
          var item = sponsorById(input.getAttribute("data-sponsor-name"));
          if (item && input.value !== item.name) {
            item.name = input.value;
            sponsorSaved[item.id] = "";
          }
        });
        document.querySelectorAll("[data-sponsor-link]").forEach(function (input) {
          var item = sponsorById(input.getAttribute("data-sponsor-link"));
          if (item && input.value !== (item.link || "")) {
            item.link = input.value;
            sponsorSaved[item.id] = "";
          }
        });
        setStatus(message || "");
      }
      return result;
    });
  }

  function sponsorPhotoFigure() {
    if (!sponsorDraft || !sponsorDraft.photo) return "";
    return "<figure><img src=\"" + escapeHtml(sponsorPhotoSrc(sponsorDraft.id, sponsorDraft.photo)) + "\" alt=\"\"><button type=\"button\" data-remove-sponsor-photo>Quitar</button></figure>";
  }

  function sponsorFormHtml() {
    var current = editingSponsor ? sponsorById(editingSponsor) : null;
    var name = sponsorDraft && sponsorDraft.formName != null ? sponsorDraft.formName : (current ? current.name : "");
    var link = sponsorDraft && sponsorDraft.formLink != null ? sponsorDraft.formLink : (current ? current.link : "");
    var photo = editingSponsor
      ? "<div class=\"wide\"><span class=\"field-label\">Foto</span><div id=\"sponsor-photo-drop\" class=\"photo-drop\"><p>Suelta el logotipo aquí o elige un archivo.</p><p class=\"field-hint\">Una foto, en JPG, PNG o WebP.</p><button class=\"btn btn-ghost\" type=\"button\" id=\"sponsor-photo-add\">Elegir foto</button><input id=\"sponsor-photo-file\" type=\"file\" accept=\"image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp\" hidden></div><div id=\"sponsor-photo-list\" class=\"photo-list\">" + sponsorPhotoFigure() + "</div><p id=\"sponsor-photo-status\" class=\"photo-status\" role=\"status\"></p></div>"
      : "<div class=\"wide\"><span class=\"field-label\">Fotos</span><div id=\"sponsor-photo-drop\" class=\"photo-drop\"><p>Suelta las fotos aquí o elige archivos.</p><p class=\"field-hint\">Cada foto agrega una fila oculta, con la imagen a la izquierda del nombre. Edita el nombre y el enlace en la fila. Lo escrito se conserva al agregar más fotos.</p><button class=\"btn btn-ghost\" type=\"button\" id=\"sponsor-photo-add\">Elegir fotos</button><input id=\"sponsor-photo-file\" type=\"file\" accept=\"image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp\" multiple hidden></div><p id=\"sponsor-photo-status\" class=\"photo-status\" role=\"status\"></p></div>";
    return "<form id=\"sponsor-form\" class=\"form-grid\">" +
      "<h2 class=\"wide\">" + (editingSponsor ? "Editar patrocinador" : "Nuevo patrocinador") + "</h2>" +
      "<p id=\"sponsor-error\" class=\"form-error wide\" role=\"alert\" hidden></p>" +
      "<label class=\"field\">Nombre<input name=\"name\" required maxlength=\"80\" value=\"" + escapeHtml(name) + "\" placeholder=\"Nombre del patrocinador\"></label>" +
      "<label class=\"field\">Enlace<input name=\"link\" type=\"url\" maxlength=\"300\" value=\"" + escapeHtml(link) + "\" placeholder=\"https://\"></label>" +
      photo +
      "<div class=\"admin-actions wide\"><button class=\"btn\" type=\"submit\">" + (editingSponsor ? "Guardar patrocinador" : "Agregar patrocinador") + "</button><button class=\"btn btn-ghost\" type=\"button\" id=\"cancel-sponsor\">Cancelar</button></div>" +
      "</form>";
  }

  function paintSponsorPhoto() {
    var list = document.getElementById("sponsor-photo-list");
    if (list) list.innerHTML = sponsorPhotoFigure();
  }

  function visibleSponsors() {
    var name = sponsorFilters.name.trim().toLowerCase();
    var link = sponsorFilters.link.trim().toLowerCase();
    return sponsors.filter(function (item) {
      if (name && item.name.toLowerCase().indexOf(name) === -1) return false;
      if (link && String(item.link || "").toLowerCase().indexOf(link) === -1) return false;
      if (sponsorFilters.photo === "added" && !item.photo) return false;
      if (sponsorFilters.photo === "empty" && item.photo) return false;
      return true;
    });
  }

  function sponsorRows() {
    var shown = visibleSponsors();
    if (!sponsors.length) return "<tr><td colspan=\"6\">Todavía no hay patrocinadores agregados.</td></tr>";
    if (!shown.length) return "<tr><td colspan=\"6\">Ningún patrocinador coincide con el filtro.</td></tr>";
    return shown.map(function (item) {
      var thumb = item.photo
        ? "<button type=\"button\" class=\"benefit-thumb-btn\" data-preview-partner=\"" + escapeHtml(item.name) + "\" aria-label=\"Ver la foto de " + escapeHtml(item.name) + "\"><img class=\"benefit-row-photo\" src=\"" + escapeHtml(sponsorPhotoSrc(item.id, item.photo)) + "\" alt=\"\"></button>"
        : "<span class=\"benefit-row-photo is-empty\"></span>";
      var photo = item.photo ? "Agregada" : "Sin agregar";
      var toggle = item.visible === false ? "Mostrar" : "Ocultar";
      var toggleClass = item.visible === false ? "btn is-show" : "btn btn-ghost";
      var selected = selectedSponsors[item.id] ? " checked" : "";
      var mover = "<span class=\"benefit-drag\" draggable=\"true\" data-drag-partner=\"sponsor\" data-partner-id=\"" + escapeHtml(item.id) + "\" role=\"button\" tabindex=\"0\" title=\"Arrastrar para mover\" aria-label=\"Mover " + escapeHtml(item.name) + "\">" + dragIcon + "</span>";
      return "<tr data-partner-row=\"sponsor\" data-partner-id=\"" + escapeHtml(item.id) + "\"" + (selected ? " class=\"is-selected\"" : "") + "><td class=\"benefit-check\"><span class=\"benefit-check-tools\">" + mover + "<input type=\"checkbox\" data-select-sponsor=\"" + escapeHtml(item.id) + "\" aria-label=\"Seleccionar " + escapeHtml(item.name) + "\"" + selected + "></span></td><td class=\"benefit-thumb\">" + thumb + "</td><td><input class=\"benefit-row-input\" data-sponsor-name=\"" + escapeHtml(item.id) + "\" maxlength=\"80\" value=\"" + escapeHtml(item.name) + "\" aria-label=\"Nombre de " + escapeHtml(item.name) + "\"></td><td><input class=\"benefit-row-input\" data-sponsor-link=\"" + escapeHtml(item.id) + "\" maxlength=\"300\" value=\"" + escapeHtml(item.link || "") + "\" placeholder=\"https://\" aria-label=\"Enlace de " + escapeHtml(item.name) + "\"></td><td>" + photo + "</td><td><div class=\"benefit-actions\">" +
        "<button class=\"" + toggleClass + "\" type=\"button\" data-toggle-sponsor=\"" + escapeHtml(item.id) + "\">" + toggle + "</button>" +
        "<button class=\"btn btn-ghost\" type=\"button\" data-edit-sponsor=\"" + escapeHtml(item.id) + "\">Editar</button>" +
        "<button class=\"btn btn-ghost\" type=\"button\" data-remove-sponsor=\"" + escapeHtml(item.id) + "\">Quitar</button>" +
        "</div></td></tr>";
    }).join("");
  }

  function syncSponsorSelection() {
    var shown = visibleSponsors();
    var shownSelected = shown.filter(function (item) { return selectedSponsors[item.id]; }).length;
    syncSelectionButtons("sponsor", sponsors, selectedSponsors);
    var all = document.getElementById("sponsor-select-all");
    if (all) {
      all.checked = shown.length > 0 && shownSelected === shown.length;
      all.indeterminate = shownSelected > 0 && shownSelected < shown.length;
    }
  }

  function paintSponsorRows() {
    captureSponsorEdits();
    var body = document.querySelector(".sponsor-table tbody");
    if (!body) return;
    body.innerHTML = sponsorRows();
    syncSponsorSelection();
  }

  function sponsorsPanel() {
    var page = siteTabs.filter(function (item) { return item.id === "patrocinadores"; })[0];
    var nameOn = sponsorFilters.name.trim() !== "";
    var linkOn = sponsorFilters.link.trim() !== "";
    var photoOn = sponsorFilters.photo !== "";
    var nameFilter = "<input class=\"roster-filter\" data-sponsor-filter=\"name\" type=\"search\" placeholder=\"Filtrar\" aria-label=\"Filtrar nombre\" value=\"" + escapeHtml(sponsorFilters.name) + "\">";
    var linkFilter = "<input class=\"roster-filter\" data-sponsor-filter=\"link\" type=\"search\" placeholder=\"Filtrar\" aria-label=\"Filtrar enlace\" value=\"" + escapeHtml(sponsorFilters.link) + "\">";
    var photoFilter = "<select class=\"roster-filter\" data-sponsor-filter=\"photo\" aria-label=\"Filtrar foto\"><option value=\"\">Todas</option><option value=\"added\"" + (sponsorFilters.photo === "added" ? " selected" : "") + ">Agregada</option><option value=\"empty\"" + (sponsorFilters.photo === "empty" ? " selected" : "") + ">Sin agregar</option></select>";
    return sitePanel(page) +
      "<article class=\"panel-card benefits-admin sponsor-admin\"><div class=\"admin-actions\"><button class=\"btn\" type=\"button\" id=\"add-sponsor\"" + (sponsorFormOpen ? " hidden" : "") + ">Agregar patrocinador</button></div>" +
      (sponsorFormOpen ? sponsorFormHtml() : "") +
      "<div class=\"admin-actions benefit-bulk\"><button class=\"btn is-show\" type=\"button\" id=\"sponsor-bulk-show\" disabled>Mostrar seleccionados</button><button class=\"btn btn-ghost\" type=\"button\" id=\"sponsor-bulk-hide\" disabled>Ocultar seleccionados</button><button class=\"btn btn-ghost\" type=\"button\" id=\"sponsor-bulk-delete\" disabled>Quitar seleccionados</button></div>" +
      "<div class=\"benefit-table-wrap\"><table class=\"benefit-table sponsor-table\"><thead><tr><th class=\"benefit-check\"><input type=\"checkbox\" id=\"sponsor-select-all\" aria-label=\"Seleccionar los patrocinadores visibles\"></th><th class=\"benefit-thumb\"><span class=\"sr-only\">Imagen</span></th>" +
      "<th" + (nameOn ? " class=\"is-filtered\"" : "") + "><span>Nombre</span>" + nameFilter + "</th>" +
      "<th" + (linkOn ? " class=\"is-filtered\"" : "") + "><span>Enlace</span>" + linkFilter + "</th>" +
      "<th" + (photoOn ? " class=\"is-filtered\"" : "") + "><span>Foto</span>" + photoFilter + "</th>" +
      "<th>Acciones</th></tr></thead><tbody>" + sponsorRows() + "</tbody></table></div></article>";
  }

  function openSponsorForm(id) {
    var current = id ? sponsorById(id) : null;
    if (id && !current) return;
    discardSponsorDraft();
    sponsorFormOpen = true;
    editingSponsor = id || "";
    sponsorDraft = {
      id: current ? current.id : "s-" + Date.now().toString(36),
      photo: current ? current.photo || "" : "",
      fresh: !current,
      formName: current ? current.name : "",
      formLink: current ? current.link : ""
    };
    render();
    var form = document.getElementById("sponsor-form");
    if (form) form.scrollIntoView({ block: "nearest" });
  }

  function setSponsorError(message) {
    var error = document.getElementById("sponsor-error");
    if (!error) return;
    error.hidden = !message;
    error.textContent = message || "";
  }

  function setSponsorPhotoStatus(message) {
    var status = document.getElementById("sponsor-photo-status");
    if (status) status.textContent = message || "";
  }

  function addSponsorPhoto(file) {
    if (!sponsorDraft || sponsorUploadBusy || !file) return;
    if (!acceptedPhoto(file)) {
      setSponsorPhotoStatus("La foto debe ser JPG, PNG o WebP.");
      return;
    }
    var id = sponsorDraft.id;
    var previous = sponsorDraft.photo;
    sponsorUploadBusy = true;
    setSponsorPhotoStatus("Subiendo foto…");
    readPhotoFile(file).then(function (data) {
      var payload = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
      return api("/api/admin/sponsors/photo", "POST", { id: id, data: payload });
    }).then(function (result) {
      if (!result.ok) throw new Error((result.data && result.data.error) || "No se pudo guardar la foto.");
      if (!sponsorDraft || sponsorDraft.id !== id) return releaseSponsorFile(id, result.data.file);
      sponsorDraft.photo = result.data.file;
      paintSponsorPhoto();
      setSponsorPhotoStatus("Foto lista. Guarda el patrocinador para publicarla.");
      if (previous && previous !== result.data.file) return releaseSponsorFile(id, previous);
    }).catch(function (error) {
      setSponsorPhotoStatus(error.message || "La foto no se pudo leer.");
    }).then(function () {
      sponsorUploadBusy = false;
    });
  }

  function addSponsorPhotos(files) {
    var accepted = [];
    Array.prototype.forEach.call(files || [], function (file) {
      if (acceptedPhoto(file)) accepted.push(file);
    });
    if (!accepted.length) {
      setSponsorPhotoStatus("Las fotos deben ser JPG, PNG o WebP.");
      return;
    }
    if (editingSponsor) {
      addSponsorPhoto(accepted[0]);
      if (accepted.length > 1) setSponsorPhotoStatus("En la edición solo se cambia una foto.");
      return;
    }
    var room = 80 - sponsors.length;
    if (room <= 0) {
      setSponsorPhotoStatus("Ya hay 80 patrocinadores.");
      return;
    }
    if (accepted.length > room) accepted = accepted.slice(0, room);
    captureSponsorEdits();
    sponsorUploadBusy = true;
    setSponsorPhotoStatus("Subiendo fotos…");
    var created = [];
    var chain = Promise.resolve();
    accepted.forEach(function (file, index) {
      chain = chain.then(function () {
        var id = partnerId("s-", index);
        return uploadPartnerPhoto("/api/admin/sponsors/photo", id, file).then(function (result) {
          if (!result.ok) throw new Error((result.data && result.data.error) || "No se pudo guardar la foto.");
          created.push({
            id: id,
            name: pictureName(file),
            link: "",
            photo: result.data.file,
            visible: false
          });
        });
      });
    });
    chain.then(function () {
      sponsorFilters = { name: "", link: "", photo: "" };
      sponsors = sponsors.concat(created);
      return saveSponsorList(sponsors, created.length === 1 ? "Se agregó 1 patrocinador oculto." : "Se agregaron " + created.length + " patrocinadores ocultos.");
    }).then(function (result) {
      if (!result || !result.ok) {
        var failedSponsors = {};
        created.forEach(function (item) {
          failedSponsors[item.id] = true;
          releaseSponsorFile(item.id, item.photo);
        });
        sponsors = sponsors.filter(function (item) { return !failedSponsors[item.id]; });
        setSponsorPhotoStatus((result && result.data && result.data.error) || "No se pudo guardar.");
        return;
      }
      paintSponsorRows();
      setSponsorPhotoStatus(created.length === 1 ? "Se agregó una fila oculta. Edita el nombre y el enlace." : "Se agregaron " + created.length + " filas ocultas. Edita el nombre y el enlace en cada fila.");
    }).catch(function (error) {
      var failedSponsors = {};
      created.forEach(function (item) {
        failedSponsors[item.id] = true;
        releaseSponsorFile(item.id, item.photo);
      });
      sponsors = sponsors.filter(function (item) { return !failedSponsors[item.id]; });
      setSponsorPhotoStatus(error.message || "No se pudo guardar la foto.");
    }).then(function () {
      sponsorUploadBusy = false;
    });
  }

  function submitSponsor(form) {
    if (!sponsorDraft) return;
    if (sponsorUploadBusy) {
      setSponsorError("Espera a que termine la foto.");
      return;
    }
    var name = String(new FormData(form).get("name") || "").trim();
    var link = String(new FormData(form).get("link") || "").trim();
    if (!name) return setSponsorError("Escribe el nombre del patrocinador.");
    if (link && !/^https?:\/\//i.test(link)) return setSponsorError("El enlace debe empezar por https://.");
    var existing = sponsorById(sponsorDraft.id);
    var next = {
      id: sponsorDraft.id,
      name: name,
      link: link,
      photo: sponsorDraft.photo || "",
      visible: existing ? existing.visible !== false : true
    };
    var list = [];
    var placed = false;
    sponsors.forEach(function (item) {
      if (item.id === next.id) {
        list.push(next);
        placed = true;
      } else list.push(item);
    });
    if (!placed) list.push(next);
    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    setSponsorError("");
    sponsors = list;
    saveSponsorList(sponsors, existing ? "Patrocinador actualizado." : "Patrocinador agregado.").then(function (result) {
      button.disabled = false;
      if (!result.ok) return setSponsorError(result.data.error || "No se pudo guardar.");
      sponsorDraft = null;
      sponsorFormOpen = false;
      editingSponsor = "";
      render();
    }).catch(function () {
      button.disabled = false;
      setSponsorError("No se pudo guardar.");
    });
  }

  function locationById(id) {
    return locations.filter(function (item) { return item.id === id; })[0] || null;
  }

  function locationClock(value) {
    var match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
    if (!match) return "";
    var hour = Number(match[1]);
    var suffix = hour >= 12 ? "p. m." : "a. m.";
    return (hour % 12 || 12) + ":" + match[2] + " " + suffix;
  }

  function captureLocationForm() {
    if (skipLocationCapture) {
      skipLocationCapture = false;
      return;
    }
    var form = document.getElementById("location-form");
    if (!form || !locationDraft) return;
    locationDraft.team = form.elements.team.value;
    locationDraft.field = form.elements.field.value;
    locationDraft.address = form.elements.address.value;
    locationDraft.sessions = Array.prototype.map.call(form.querySelectorAll("[data-session-row]"), function (row) {
      return {
        day: row.querySelector("[data-session-day]").value,
        time: row.querySelector("[data-session-time]").value
      };
    });
  }

  function locationSessionRows() {
    var sessions = locationDraft && locationDraft.sessions ? locationDraft.sessions : [];
    return sessions.map(function (session, index) {
      var days = locationDayOrder.map(function (day) {
        return "<option value=\"" + day + "\"" + (String(session.day) === String(day) ? " selected" : "") + ">" + locationDays[day] + "</option>";
      }).join("");
      return "<div class=\"location-session\" data-session-row><label class=\"field\">Día<select data-session-day aria-label=\"Día del horario " + (index + 1) + "\">" + days + "</select></label><label class=\"field\">Hora<input data-session-time type=\"time\" value=\"" + escapeHtml(session.time || "") + "\" aria-label=\"Hora del horario " + (index + 1) + "\"></label><button class=\"btn btn-ghost\" type=\"button\" data-remove-session>Quitar</button></div>";
    }).join("");
  }

  function locationFormHtml() {
    var draft = locationDraft || { team: "", field: "", address: "", sessions: [] };
    return "<form id=\"location-form\" class=\"form-grid\">" +
      "<h2 class=\"wide\">" + (editingLocation ? "Editar sede" : "Nueva sede") + "</h2>" +
      "<p id=\"location-error\" class=\"form-error wide\" role=\"alert\" hidden></p>" +
      "<label class=\"field\">Nombre de la sede<input name=\"team\" required maxlength=\"80\" value=\"" + escapeHtml(draft.team) + "\" placeholder=\"Guerreras Norte\"></label>" +
      "<label class=\"field\">Nombre de la cancha<input name=\"field\" required maxlength=\"80\" value=\"" + escapeHtml(draft.field) + "\" placeholder=\"Cancha Wembley\"></label>" +
      "<label class=\"field wide\">Dirección de la cancha<textarea name=\"address\" required maxlength=\"300\" rows=\"3\" placeholder=\"Calle 58 Norte con Avenida 3 Norte&#10;Cali, Valle del Cauca\">" + escapeHtml(draft.address) + "</textarea></label>" +
      "<p class=\"field-hint wide\">Escribe la calle y, en otra línea, la ciudad. El mapa ubica la sede con esta dirección.</p>" +
      "<div class=\"wide\"><span class=\"field-label\">Días y horas de entrenamiento</span><p class=\"field-hint\">Agrega un horario por sesión. El mismo día puede repetirse con otra hora. Si no hay entrenamiento, quita los horarios.</p><div class=\"location-sessions\">" + locationSessionRows() + "</div></div>" +
      "<div class=\"location-actions wide\"><button class=\"btn btn-ghost\" type=\"button\" id=\"add-location-session\">Agregar horario</button><span class=\"location-actions-space\"></span><button class=\"btn\" type=\"submit\">" + (editingLocation ? "Guardar sede" : "Agregar sede") + "</button><button class=\"btn btn-ghost\" type=\"button\" id=\"cancel-location\">Cancelar</button></div>" +
      "</form>";
  }

  function locationColumn(item, kind) {
    var sessions = item.sessions || [];
    if (!sessions.length) return "—";
    return sessions.map(function (session) {
      return escapeHtml(kind === "day" ? locationDays[session.day] || "" : locationClock(session.time));
    }).join("<br>");
  }

  function visibleLocations() {
    var team = locationFilters.team.trim().toLowerCase();
    var field = locationFilters.field.trim().toLowerCase();
    var address = locationFilters.address.trim().toLowerCase();
    var time = locationFilters.time.trim().toLowerCase();
    return locations.filter(function (item) {
      if (team && item.team.toLowerCase().indexOf(team) === -1) return false;
      if (field && item.field.toLowerCase().indexOf(field) === -1) return false;
      if (address && String(item.address || "").toLowerCase().indexOf(address) === -1) return false;
      if (locationFilters.day === "" && !time) return true;
      return (item.sessions || []).some(function (session) {
        if (locationFilters.day !== "" && String(session.day) !== String(locationFilters.day)) return false;
        if (!time) return true;
        var label = locationClock(session.time).toLowerCase();
        return label.indexOf(time) !== -1 || String(session.time).indexOf(time) !== -1;
      });
    });
  }

  function locationFilterHead(label, key, control) {
    var active = key === "day" ? locationFilters.day !== "" : locationFilters[key].trim() !== "";
    return "<th" + (active ? " class=\"is-filtered\"" : "") + "><span>" + label + "</span>" + control + "</th>";
  }

  function locationRows() {
    var shown = visibleLocations();
    if (!locations.length) return "<tr><td colspan=\"6\">Todavía no hay sedes agregadas.</td></tr>";
    if (!shown.length) return "<tr><td colspan=\"6\">Ninguna sede coincide con el filtro.</td></tr>";
    return shown.map(function (item) {
      return "<tr><td>" + escapeHtml(item.team) + "</td><td>" + escapeHtml(item.field) + "</td><td class=\"location-address\">" + escapeHtml(item.address).replace(/\n/g, "<br>") + "</td><td>" + locationColumn(item, "day") + "</td><td>" + locationColumn(item, "time") + "</td><td><div class=\"benefit-actions\">" +
        "<button class=\"btn btn-ghost\" type=\"button\" data-edit-location=\"" + escapeHtml(item.id) + "\">Editar</button>" +
        "<button class=\"btn btn-ghost\" type=\"button\" data-remove-location=\"" + escapeHtml(item.id) + "\">Quitar</button>" +
        "</div></td></tr>";
    }).join("");
  }

  function paintLocationRows() {
    var body = document.querySelector(".location-table tbody");
    if (!body) return;
    body.innerHTML = locationRows();
  }

  function locationsPanel() {
    var page = siteTabs.filter(function (item) { return item.id === "sedes"; })[0];
    var dayOptions = "<option value=\"\">Todos</option>" + locationDayOrder.map(function (day) {
      return "<option value=\"" + day + "\"" + (String(locationFilters.day) === String(day) ? " selected" : "") + ">" + locationDays[day] + "</option>";
    }).join("");
    return sitePanel(page) +
      "<article class=\"panel-card benefits-admin\"><div class=\"admin-actions\"><button class=\"btn\" type=\"button\" id=\"add-location\"" + (locationFormOpen ? " hidden" : "") + ">Agregar sede</button></div>" +
      (locationFormOpen ? locationFormHtml() : "") +
      "<div class=\"benefit-table-wrap\"><table class=\"benefit-table location-table\"><thead><tr>" +
      locationFilterHead("Nombre de la sede", "team", "<input class=\"roster-filter\" data-location-filter=\"team\" type=\"search\" placeholder=\"Filtrar\" aria-label=\"Filtrar nombre de la sede\" value=\"" + escapeHtml(locationFilters.team) + "\">") +
      locationFilterHead("Nombre de la cancha", "field", "<input class=\"roster-filter\" data-location-filter=\"field\" type=\"search\" placeholder=\"Filtrar\" aria-label=\"Filtrar nombre de la cancha\" value=\"" + escapeHtml(locationFilters.field) + "\">") +
      locationFilterHead("Dirección", "address", "<input class=\"roster-filter\" data-location-filter=\"address\" type=\"search\" placeholder=\"Filtrar\" aria-label=\"Filtrar dirección\" value=\"" + escapeHtml(locationFilters.address) + "\">") +
      locationFilterHead("Días de entrenamiento", "day", "<select class=\"roster-filter\" data-location-filter=\"day\" aria-label=\"Filtrar día de entrenamiento\">" + dayOptions + "</select>") +
      locationFilterHead("Horas de entrenamiento", "time", "<input class=\"roster-filter\" data-location-filter=\"time\" type=\"search\" placeholder=\"Filtrar\" aria-label=\"Filtrar hora de entrenamiento\" value=\"" + escapeHtml(locationFilters.time) + "\">") +
      "<th>Acciones</th></tr></thead><tbody>" +
      locationRows() + "</tbody></table></div></article>";
  }

  function openLocationForm(id) {
    var current = id ? locationById(id) : null;
    if (id && !current) return;
    locationFormOpen = true;
    editingLocation = id || "";
    locationDraft = {
      id: current ? current.id : "l-" + Date.now().toString(36),
      team: current ? current.team : "",
      field: current ? current.field : "",
      address: current ? current.address : "",
      sessions: current && current.sessions && current.sessions.length
        ? current.sessions.map(function (session) { return { day: String(session.day), time: session.time }; })
        : [{ day: "1", time: "" }]
    };
    skipLocationCapture = true;
    render();
    var form = document.getElementById("location-form");
    if (form) form.scrollIntoView({ block: "nearest" });
  }

  function setLocationError(message) {
    var error = document.getElementById("location-error");
    if (!error) return;
    error.hidden = !message;
    error.textContent = message || "";
  }

  function submitLocation(form) {
    if (locationSaveBusy || !locationDraft) return;
    captureLocationForm();
    var team = locationDraft.team.trim();
    var field = locationDraft.field.trim();
    var address = locationDraft.address.replace(/\r\n/g, "\n").split("\n").map(function (line) { return line.trim(); }).filter(Boolean).join("\n");
    var sessions = [];
    var seen = {};
    var invalid = locationDraft.sessions.some(function (session) {
      if (!session.time) return false;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(session.time)) return true;
      var key = session.day + "-" + session.time;
      if (seen[key]) return true;
      seen[key] = true;
      sessions.push({ day: Number(session.day), time: session.time });
      return false;
    });
    if (!team || !field || !address) return setLocationError("Escribe el nombre de la sede, la cancha y la dirección.");
    if (invalid) return setLocationError("Revisa los horarios. El mismo día no puede repetir la misma hora.");
    setLocationError("");
    var next = { id: locationDraft.id, team: team, field: field, address: address, sessions: sessions };
    var list = locations.map(function (item) { return item.id === next.id ? next : item; });
    if (!locationById(next.id)) list = locations.concat([next]);
    locationSaveBusy = true;
    var button = form.querySelector("button[type=\"submit\"]");
    if (button) button.disabled = true;
    setStatus("Buscando la sede en el mapa…");
    api("/api/admin/locations", "PUT", { locations: list }).then(function (result) {
      locationSaveBusy = false;
      if (!result.ok) {
        if (button) button.disabled = false;
        setStatus("");
        setLocationError(result.data.error || "No se pudo guardar la sede.");
        return;
      }
      locations = result.data.locations || [];
      locationFormOpen = false;
      editingLocation = "";
      locationDraft = null;
      setStatus("Sede guardada. Ya aparece en el mapa.");
      render();
    }).catch(function () {
      locationSaveBusy = false;
      if (button) button.disabled = false;
      setStatus("");
      setLocationError("No se pudo guardar la sede.");
    });
  }

  function cupById(id) {
    return cups.filter(function (item) { return item.id === id; })[0] || null;
  }

  function cupTeamById(id) {
    return cupTeams.filter(function (item) { return item.id === id; })[0] || null;
  }

  function cupMatchById(id) {
    return cupMatches.filter(function (item) { return item.id === id; })[0] || null;
  }

  function cupName(id) {
    var cup = cupById(id);
    return cup ? cup.name : "No aplica";
  }

  function cupTeamLogoSrc(team) {
    if (!team || !team.logo) return "";
    return "/api/admin/tournaments/media?id=" + encodeURIComponent(team.id) + "&file=" + encodeURIComponent(team.logo);
  }

  function setCupError(id, message) {
    var node = document.getElementById(id);
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || "";
  }

  function cupRich(id, label) {
    return "<div class=\"wide notes-editor\"><span class=\"field-label\">" + label + "</span><div class=\"notes-tools\"><button type=\"button\" data-cup-cmd=\"bold\" data-cup-target=\"" + id + "\">Negrita</button><button type=\"button\" data-cup-cmd=\"italic\" data-cup-target=\"" + id + "\">Cursiva</button><button type=\"button\" data-cup-cmd=\"underline\" data-cup-target=\"" + id + "\">Subrayado</button><button type=\"button\" data-cup-cmd=\"insertUnorderedList\" data-cup-target=\"" + id + "\">Lista</button></div><div id=\"" + id + "\" class=\"notes-input\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"" + label + "\"></div><p id=\"" + id + "-count\" class=\"notes-count\" aria-live=\"polite\">0 / 4000</p></div>";
  }

  function cupRichValue(id) {
    var input = document.getElementById(id);
    if (!input) return "";
    var html = sanitizeNotes(input.innerHTML);
    return notesText(html) ? html : "";
  }

  function fillRich(id, html) {
    var input = document.getElementById(id);
    var count = document.getElementById(id + "-count");
    if (input) input.innerHTML = sanitizeNotes(html || "");
    bindRichField(input, count, 4000);
  }

  function cupSelect(selected, blank) {
    var html = "<option value=\"\">" + escapeHtml(blank) + "</option>";
    cups.forEach(function (cup) {
      html += "<option value=\"" + escapeHtml(cup.id) + "\"" + (cup.id === selected ? " selected" : "") + ">" + escapeHtml(cup.name) + "</option>";
    });
    return html;
  }

  function cupTeamOptions(tournamentId, selected) {
    var html = "<option value=\"\">Elige un equipo</option>";
    cupTeams.forEach(function (team) {
      if (team.tournamentId !== tournamentId && team.id !== selected) return;
      html += "<option value=\"" + escapeHtml(team.id) + "\"" + (team.id === selected ? " selected" : "") + ">" + escapeHtml(team.name) + "</option>";
    });
    return html;
  }

  function cupFieldRow(name, index) {
    var number = (index || 0) + 1;
    return "<div class=\"cup-field\"><label class=\"field\"><span class=\"cup-field-name\">Cancha " + number + "</span><input name=\"field\" maxlength=\"80\" value=\"" + escapeHtml(name || "") + "\" placeholder=\"Nombre de la cancha\" aria-label=\"Nombre de la cancha " + number + "\"></label><button class=\"btn btn-ghost\" type=\"button\" data-remove-cup-field>Quitar</button></div>";
  }

  function numberCupFields() {
    var rows = document.querySelectorAll("#cup-fields .cup-field");
    Array.prototype.forEach.call(rows, function (row, index) {
      var number = index + 1;
      var title = row.querySelector(".cup-field-name");
      var input = row.querySelector("input");
      if (title) title.textContent = "Cancha " + number;
      if (input) input.setAttribute("aria-label", "Nombre de la cancha " + number);
    });
  }

  function saveCup(next, message) {
    return api("/api/admin/tournaments", "PUT", next).then(function (result) {
      if (result.ok) {
        cups = result.data.tournaments || [];
        cupTeams = result.data.teams || [];
        cupMatches = result.data.matches || [];
        setStatus(message || "");
      }
      return result;
    });
  }

  function tournamentFormHtml() {
    var current = editingCup ? cupById(editingCup) : null;
    var fields = current && current.fields && current.fields.length ? current.fields : [""];
    return "<form id=\"cup-form\" class=\"form-grid\"><h2 class=\"wide\">" + (current ? "Editar torneo" : "Nuevo torneo") + "</h2><p id=\"cup-error\" class=\"form-error wide\" role=\"alert\" hidden></p>" +
      "<label class=\"field\">Nombre del torneo<input name=\"name\" required maxlength=\"80\" value=\"" + escapeHtml(current ? current.name : "") + "\"></label>" +
      "<label class=\"field\">Lugar<input name=\"location\" maxlength=\"120\" value=\"" + escapeHtml(current ? current.location : "") + "\"></label>" +
      "<label class=\"field wide\">Dirección<textarea name=\"address\" maxlength=\"300\" rows=\"3\">" + escapeHtml(current ? current.address : "") + "</textarea></label>" +
      "<label class=\"field\">Fecha<input name=\"date\" type=\"date\" value=\"" + escapeHtml(current ? current.date : "") + "\"></label>" +
      "<label class=\"field\">Hora<input name=\"time\" type=\"time\" value=\"" + escapeHtml(current ? current.time : "") + "\"></label>" +
      cupRich("cup-info-input", "Información del torneo") +
      "<div class=\"wide\"><span class=\"field-label\">Canchas</span><p class=\"field-hint\">Hasta 6 canchas. Al armar el cuadro, los partidos se reparten entre estas canchas.</p><div id=\"cup-fields\" class=\"cup-fields\">" + fields.map(function (name, index) { return cupFieldRow(name, index); }).join("") + "</div></div>" +
      "<div class=\"location-actions wide\"><button class=\"btn btn-ghost\" type=\"button\" id=\"add-cup-field\">Agregar cancha</button><span class=\"location-actions-space\"></span><button class=\"btn\" type=\"submit\">" + (current ? "Guardar torneo" : "Agregar torneo") + "</button>" + (current ? "<button class=\"btn btn-ghost\" type=\"button\" id=\"cancel-cup\">Cancelar</button>" : "") + "</div></form>";
  }

  function tournamentFormSection() {
    var open = cupFormOpen;
    var label = editingCup ? "Editar torneo" : "Agregar torneo";
    return "<div class=\"cup-add" + (open ? " is-open" : "") + "\"><button type=\"button\" class=\"roster-toggle\" id=\"cup-form-toggle\" aria-expanded=\"" + (open ? "true" : "false") + "\" aria-controls=\"cup-form-body\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path></svg>" + label + "</button><div id=\"cup-form-body\"" + (open ? "" : " hidden") + ">" + (open ? tournamentFormHtml() : "") + "</div></div>";
  }

  function tournamentRows() {
    if (!cups.length) return "<tr><td colspan=\"6\">Todavía no hay torneos.</td></tr>";
    return cups.map(function (cup) {
      return "<tr><td>" + escapeHtml(cup.name) + "</td><td>" + escapeHtml(cup.location || "") + "</td><td>" + escapeHtml(cup.date || "") + "</td><td>" + escapeHtml(cup.time || "") + "</td><td>" + escapeHtml((cup.fields || []).join(", ")) + "</td><td><div class=\"benefit-actions\"><button class=\"btn btn-ghost\" type=\"button\" data-edit-cup=\"" + escapeHtml(cup.id) + "\">Editar</button><button class=\"btn btn-ghost\" type=\"button\" data-remove-cup=\"" + escapeHtml(cup.id) + "\">Quitar</button></div></td></tr>";
    }).join("");
  }

  var cupFormats = {
    8: "Grupos A y B de 4, semifinales, final y tercer puesto",
    12: "4 grupos de 3, cuartos, semifinales, final y tercer puesto",
    16: "4 grupos de 4, cuartos, semifinales, final y tercer puesto",
    20: "4 grupos de 5, cuartos, semifinales, final y tercer puesto",
    24: "6 grupos de 4, octavos, cuartos, semifinales, final y tercer puesto"
  };

  function selectedTeamIds() {
    return cupTeams.filter(function (team) { return selectedCupTeams[team.id]; }).map(function (team) { return team.id; });
  }

  function teamFormSection() {
    var open = teamFormOpen;
    var label = editingCupTeam ? "Editar equipo" : "Agregar equipo";
    return "<div class=\"cup-add" + (open ? " is-open" : "") + "\"><button type=\"button\" class=\"roster-toggle\" id=\"team-form-toggle\" aria-expanded=\"" + (open ? "true" : "false") + "\" aria-controls=\"team-form-body\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path></svg>" + label + "</button><div id=\"team-form-body\"" + (open ? "" : " hidden") + ">" + (open ? teamFormHtml() : "") + "</div></div>";
  }

  function teamBracketBar() {
    var ids = selectedTeamIds();
    if (!ids.length) return "";
    var format = cupFormats[ids.length] || "";
    var options = format
      ? "<option value=\"" + ids.length + "\">" + escapeHtml(format) + "</option>"
      : "<option value=\"\">Elige 8, 12, 16, 20 o 24 equipos</option>";
    return "<div class=\"cup-bracket-bar\"><p><strong>" + ids.length + "</strong> " + (ids.length === 1 ? "equipo seleccionado." : "equipos seleccionados.") + " Elige el torneo y el tipo de cuadro. Los partidos quedan en Partidos.</p><label class=\"field\">Torneo<select id=\"selected-tournament\">" + cupSelect(selectedBracketTournament, "Elige un torneo") + "</select></label><div class=\"admin-actions\"><button class=\"btn\" type=\"button\" id=\"build-selected-bracket\"" + (format ? "" : " disabled") + ">Armar partidos</button></div><label class=\"field cup-format\">Tipo de cuadro<select id=\"selected-format\"" + (format ? "" : " disabled") + ">" + options + "</select></label><p id=\"selected-build-error\" class=\"form-error\" role=\"alert\" hidden></p></div>";
  }

  function paintTeamBracket() {
    var slot = document.getElementById("team-bracket-slot");
    if (!slot) return;
    var current = document.getElementById("selected-tournament");
    if (current) selectedBracketTournament = current.value;
    slot.innerHTML = teamBracketBar();
    var count = selectedTeamIds().length;
    var all = document.getElementById("team-select-all");
    if (all) {
      all.checked = cupTeams.length > 0 && count === cupTeams.length;
      all.indeterminate = count > 0 && count < cupTeams.length;
    }
  }

  function teamFormHtml() {
    var current = editingCupTeam ? cupTeamById(editingCupTeam) : null;
    return "<form id=\"team-form\" class=\"form-grid\"><h2 class=\"wide\">" + (current ? "Editar equipo" : "Nuevo equipo") + "</h2><p id=\"team-error\" class=\"form-error wide\" role=\"alert\" hidden></p>" +
      "<label class=\"field\">Nombre del equipo<input name=\"name\" required maxlength=\"80\" value=\"" + escapeHtml(current ? current.name : "") + "\"></label>" +
      "<label class=\"field\">Torneo<select name=\"tournament\">" + cupSelect(current ? current.tournamentId : "", "No aplica") + "</select></label>" +
      cupRich("team-info-input", "Información del equipo") +
      "<div class=\"wide\"><span class=\"field-label\">Logo</span><div id=\"team-logo-drop\" class=\"photo-drop\"><p>Suelta el logo aquí o elige un archivo.</p><p class=\"field-hint\">Una imagen JPG, PNG o WebP. Haz clic en el logo para acercarlo y recortarlo.</p><button class=\"btn btn-ghost\" type=\"button\" id=\"team-logo-add\">Elegir logo</button><input id=\"team-logo-file\" type=\"file\" accept=\"image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp\" hidden></div><div class=\"photo-list\"><figure id=\"team-logo-figure\" hidden><button class=\"photo-thumb\" type=\"button\" id=\"team-logo-edit\" aria-label=\"Recortar logo\"><img id=\"team-logo-preview\" alt=\"\"></button><button type=\"button\" id=\"team-logo-remove\">Quitar</button></figure></div><p id=\"team-logo-empty\" class=\"field-hint\">Todavía no hay logo.</p><p id=\"team-logo-status\" class=\"photo-status\" role=\"status\"></p></div>" +
      "<div class=\"admin-actions wide\"><button class=\"btn\" type=\"submit\">" + (current ? "Guardar equipo" : "Agregar equipo") + "</button>" + (current ? "<button class=\"btn btn-ghost\" type=\"button\" id=\"cancel-team\">Cancelar</button>" : "") + "</div></form>";
  }

  function teamRows() {
    if (!cupTeams.length) return "<tr><td colspan=\"5\">Todavía no hay equipos.</td></tr>";
    return cupTeams.map(function (team) {
      var thumb = team.logo
        ? "<img class=\"benefit-row-photo\" src=\"" + escapeHtml(cupTeamLogoSrc(team)) + "\" alt=\"\">"
        : "<span class=\"benefit-row-photo is-empty\"></span>";
      var selected = selectedCupTeams[team.id] ? " checked" : "";
      return "<tr" + (selected ? " class=\"is-selected\"" : "") + "><td class=\"benefit-check\"><input type=\"checkbox\" data-select-team=\"" + escapeHtml(team.id) + "\" aria-label=\"Seleccionar " + escapeHtml(team.name) + "\"" + selected + "></td><td class=\"benefit-thumb\">" + thumb + "</td><td>" + escapeHtml(team.name) + "</td><td>" + escapeHtml(cupName(team.tournamentId)) + "</td><td><div class=\"benefit-actions\"><button class=\"btn btn-ghost\" type=\"button\" data-move-team=\"" + escapeHtml(team.id) + "\" data-move-dir=\"-1\">Subir</button><button class=\"btn btn-ghost\" type=\"button\" data-move-team=\"" + escapeHtml(team.id) + "\" data-move-dir=\"1\">Bajar</button><button class=\"btn btn-ghost\" type=\"button\" data-edit-team=\"" + escapeHtml(team.id) + "\">Editar</button><button class=\"btn btn-ghost\" type=\"button\" data-remove-team=\"" + escapeHtml(team.id) + "\">Quitar</button></div></td></tr>";
    }).join("");
  }

  function matchSide(teamId, label) {
    var team = cupTeamById(teamId);
    if (!team) return escapeHtml(label || "Por definir");
    var logo = team.logo ? "<img class=\"cup-mini\" src=\"" + escapeHtml(cupTeamLogoSrc(team)) + "\" alt=\"\">" : "";
    return "<span class=\"cup-mini-side\">" + logo + escapeHtml(team.name) + "</span>";
  }

  function scoreText(value) {
    return value === "" || value == null ? "" : String(value);
  }

  function scoreField(name, label, value) {
    return "<label class=\"field\">" + label + "<input name=\"" + name + "\" type=\"number\" min=\"0\" max=\"99\" step=\"1\" inputmode=\"numeric\" value=\"" + escapeHtml(scoreText(value)) + "\"></label>";
  }

  function isKnockoutStage(stage) {
    return stage === "r16" || stage === "quarter" || stage === "semi" || stage === "final" || stage === "third";
  }

  function scoreInputs(match) {
    var id = escapeHtml(match.id);
    var withdrawal = match.withdrawal === "1" || match.withdrawal === "2" ? match.withdrawal : "";
    var postponed = match.postponed === true;
    var tagged = Boolean(withdrawal || postponed);
    var tied = !tagged && isKnockoutStage(match.stage) && hasScore(match.score1) && hasScore(match.score2) && Number(match.score1) === Number(match.score2);
    var html = "<div class=\"score-cell\"><div class=\"score-pair\"><input type=\"number\" min=\"0\" max=\"99\" step=\"1\" inputmode=\"numeric\" data-score-match=\"" + id + "\" data-score-side=\"1\" aria-label=\"Goles del equipo 1\" value=\"" + escapeHtml(scoreText(match.score1)) + "\"><span>:</span><input type=\"number\" min=\"0\" max=\"99\" step=\"1\" inputmode=\"numeric\" data-score-match=\"" + id + "\" data-score-side=\"2\" aria-label=\"Goles del equipo 2\" value=\"" + escapeHtml(scoreText(match.score2)) + "\"></div>";
    if (tied) {
      html += "<label class=\"score-penalties\"><input type=\"checkbox\" data-score-match=\"" + id + "\" data-score-penalties=\"" + id + "\"" + (match.penalties ? " checked" : "") + "> Penales</label>";
      html += "<div class=\"score-pair is-shootout\"" + (match.penalties ? "" : " hidden") + "><input type=\"number\" min=\"0\" max=\"99\" step=\"1\" inputmode=\"numeric\" data-score-match=\"" + id + "\" data-penalty-side=\"1\" aria-label=\"Penales del equipo 1\" value=\"" + escapeHtml(scoreText(match.penalty1)) + "\"><span>pen</span><input type=\"number\" min=\"0\" max=\"99\" step=\"1\" inputmode=\"numeric\" data-score-match=\"" + id + "\" data-penalty-side=\"2\" aria-label=\"Penales del equipo 2\" value=\"" + escapeHtml(scoreText(match.penalty2)) + "\"></div>";
    }
    html += "<div class=\"score-tags\"><label class=\"score-penalties\"><input type=\"checkbox\" data-score-match=\"" + id + "\" data-score-withdrawal=\"" + id + "\"" + (withdrawal ? " checked" : "") + "> Retiro</label><label class=\"score-penalties\"><input type=\"checkbox\" data-score-match=\"" + id + "\" data-score-postponed=\"" + id + "\"" + (postponed ? " checked" : "") + "> Aplazado</label></div>";
    html += "<select class=\"score-status\" data-score-match=\"" + id + "\" data-withdrawal-side=\"" + id + "\" aria-label=\"Equipo que se retira\"" + (withdrawal ? "" : " hidden") + "><option value=\"\">Elige quién se retira</option><option value=\"1\"" + (withdrawal === "1" ? " selected" : "") + ">Se retira " + escapeHtml(matchTeamText(match.team1Id, match.label1)) + "</option><option value=\"2\"" + (withdrawal === "2" ? " selected" : "") + ">Se retira " + escapeHtml(matchTeamText(match.team2Id, match.label2)) + "</option></select>";
    html += "<input class=\"score-note\" type=\"text\" maxlength=\"240\" data-score-match=\"" + id + "\" data-postpone-note=\"" + id + "\" placeholder=\"Motivo del aplazamiento\" aria-label=\"Motivo del aplazamiento\" value=\"" + escapeHtml(match.postponeNote || "") + "\"" + (postponed ? "" : " hidden") + ">";
    return html + "</div>";
  }

  function readScore(value) {
    var text = String(value == null ? "" : value).trim();
    if (!text) return "";
    if (!/^\d{1,2}$/.test(text)) return null;
    var number = Number(text);
    return number <= 99 ? number : null;
  }

  function matchFormHtml() {
    var current = editingCupMatch ? cupMatchById(editingCupMatch) : null;
    var tournamentId = current ? current.tournamentId : (cups[0] ? cups[0].id : "");
    return "<form id=\"match-form\" class=\"form-grid\"><h2 class=\"wide\">" + (current ? "Editar partido" : "Nuevo partido") + "</h2><p id=\"match-error\" class=\"form-error wide\" role=\"alert\" hidden></p>" +
      "<label class=\"field wide\">Torneo<select id=\"match-tournament\" name=\"tournament\" required>" + cupSelect(tournamentId, "Elige un torneo") + "</select></label>" +
      "<div class=\"wide cup-versus\"><div class=\"cup-side\"><label class=\"field\">Equipo 1<img id=\"match-logo-1\" class=\"cup-form-logo\" alt=\"\" hidden><select id=\"match-team-1\" name=\"team1\">" + cupTeamOptions(tournamentId, current ? current.team1Id : "") + "</select></label></div><span class=\"cup-vs\">vs</span><div class=\"cup-side\"><label class=\"field\">Equipo 2<img id=\"match-logo-2\" class=\"cup-form-logo\" alt=\"\" hidden><select id=\"match-team-2\" name=\"team2\">" + cupTeamOptions(tournamentId, current ? current.team2Id : "") + "</select></label></div></div>" +
      "<div class=\"wide cup-scores\">" + scoreField("score1", "Goles del equipo 1", current ? current.score1 : "") + scoreField("score2", "Goles del equipo 2", current ? current.score2 : "") + "</div>" +
      (current && isKnockoutStage(current.stage) ? "<div class=\"wide score-penalties-form\"><label class=\"score-penalties\"><input type=\"checkbox\" name=\"penalties\"" + (current.penalties ? " checked" : "") + "> Definir por penales</label><div class=\"cup-scores\">" + scoreField("penalty1", "Penales del equipo 1", current.penalty1) + scoreField("penalty2", "Penales del equipo 2", current.penalty2) + "</div><p class=\"field-hint\">Márcalo cuando el partido queda empatado. El equipo con más goles en la tanda avanza.</p></div>" : "") +
      "<div class=\"wide score-penalties-form\"><label class=\"score-penalties\"><input type=\"checkbox\" name=\"withdrawalFlag\"" + (current && (current.withdrawal === "1" || current.withdrawal === "2") ? " checked" : "") + "> Retiro</label><label class=\"field\">Quién se retira<select name=\"withdrawal\"><option value=\"\">Elige el equipo</option><option value=\"1\"" + (current && current.withdrawal === "1" ? " selected" : "") + ">Se retira el equipo 1</option><option value=\"2\"" + (current && current.withdrawal === "2" ? " selected" : "") + ">Se retira el equipo 2</option></select></label><p class=\"field-hint\">El equipo que se retira pierde el partido. El otro suma la victoria o avanza.</p><label class=\"score-penalties\"><input type=\"checkbox\" name=\"postponed\"" + (current && current.postponed ? " checked" : "") + "> Aplazado</label><label class=\"field\">Motivo del aplazamiento<input name=\"postponeNote\" maxlength=\"240\" value=\"" + escapeHtml(current && current.postponeNote ? current.postponeNote : "") + "\"></label></div>" +
      "<p class=\"field-hint wide\">Escribe los dos goles cuando el partido ya se jugó. Si todavía no hay resultado, déjalos vacíos.</p>" +
      (current && (current.label1 || current.label2) ? "<p class=\"field-hint wide\">Clasificación: " + escapeHtml(current.label1 || "Por definir") + " vs " + escapeHtml(current.label2 || "Por definir") + ". Puedes dejar el equipo vacío hasta que se defina.</p>" : "") +
      "<label class=\"field\">Cancha<input name=\"field\" maxlength=\"80\" list=\"match-fields\" value=\"" + escapeHtml(current ? current.field : "") + "\"><datalist id=\"match-fields\"></datalist></label>" +
      "<label class=\"field\">Fecha<input name=\"date\" type=\"date\" value=\"" + escapeHtml(current ? current.date : "") + "\"></label>" +
      "<label class=\"field\">Hora<input name=\"time\" type=\"time\" value=\"" + escapeHtml(current ? current.time : "") + "\"></label>" +
      "<div class=\"admin-actions wide\"><button class=\"btn\" type=\"submit\">" + (current ? "Guardar partido" : "Agregar partido") + "</button>" + (current ? "<button class=\"btn btn-ghost\" type=\"button\" id=\"cancel-match\">Cancelar</button>" : "") + "</div></form>";
  }

  function matchStageKey(match) {
    return match.stage + (match.group ? ":" + match.group : "");
  }

  function matchStageLabel(match) {
    var stage = cupStages[match.stage] || "Partido";
    if (match.group) stage += " " + match.group;
    return stage;
  }

  function matchTeamText(teamId, label) {
    var team = cupTeamById(teamId);
    return team ? team.name : (label || "Por definir");
  }

  function visibleMatches() {
    var tournament = matchFilters.tournament.trim().toLowerCase();
    var team1 = matchFilters.team1.trim().toLowerCase();
    var team2 = matchFilters.team2.trim().toLowerCase();
    var field = matchFilters.field.trim().toLowerCase();
    var time = matchFilters.time.trim().toLowerCase();
    return cupMatches.filter(function (match) {
      if (tournament && cupName(match.tournamentId).toLowerCase().indexOf(tournament) === -1) return false;
      if (matchFilters.stage && matchStageKey(match) !== matchFilters.stage) return false;
      if (team1 && matchTeamText(match.team1Id, match.label1).toLowerCase().indexOf(team1) === -1) return false;
      if (team2 && matchTeamText(match.team2Id, match.label2).toLowerCase().indexOf(team2) === -1) return false;
      if (field && (match.field || "").toLowerCase().indexOf(field) === -1) return false;
      if (matchFilters.date && match.date !== matchFilters.date) return false;
      if (time && (match.time || "").toLowerCase().indexOf(time) === -1) return false;
      return true;
    }).sort(function (a, b) {
      var left = (a.date || "9999-99-99") + "T" + (a.time || "99:99");
      var right = (b.date || "9999-99-99") + "T" + (b.time || "99:99");
      if (left !== right) return left < right ? -1 : 1;
      var rank = { group: 0, r16: 1, quarter: 2, semi: 3, third: 4, final: 5, match: 6 };
      return (rank[a.stage] == null ? 7 : rank[a.stage]) - (rank[b.stage] == null ? 7 : rank[b.stage]);
    });
  }

  function matchFilterCell(label, key, control) {
    var active = String(matchFilters[key] || "").trim() !== "";
    var classes = ["match-col-" + key];
    if (active) classes.push("is-filtered");
    return "<th class=\"" + classes.join(" ") + "\"><span>" + escapeHtml(label) + "</span>" + control + "</th>";
  }

  function matchStageOptions() {
    var seen = {};
    var html = "<option value=\"\">Todas</option>";
    cupMatches.forEach(function (match) {
      var key = matchStageKey(match);
      if (seen[key]) return;
      seen[key] = true;
      html += "<option value=\"" + escapeHtml(key) + "\"" + (matchFilters.stage === key ? " selected" : "") + ">" + escapeHtml(matchStageLabel(match)) + "</option>";
    });
    return html;
  }

  function matchShownColumns() {
    return matchColumnDefs.filter(function (column) { return !hiddenMatchColumns[column[0]]; });
  }

  function saveMatchColumns() {
    try {
      localStorage.setItem("gfc-admin-match-columns", matchColumnsOpen ? "open" : "closed");
      localStorage.setItem("gfc-admin-match-hidden", JSON.stringify(hiddenMatchColumns));
    } catch (error) {}
  }

  function matchCell(match, key) {
    if (key === "tournament") return escapeHtml(cupName(match.tournamentId));
    if (key === "stage") return escapeHtml(matchStageLabel(match));
    if (key === "team1") return matchSide(match.team1Id, match.label1);
    if (key === "team2") return matchSide(match.team2Id, match.label2);
    if (key === "field") return escapeHtml(match.field || "");
    if (key === "date") return escapeHtml(match.date || "");
    if (key === "time") return escapeHtml(match.time || "");
    if (key === "score") return scoreInputs(match);
    return "<div class=\"benefit-actions\"><button class=\"btn btn-ghost\" type=\"button\" data-edit-match=\"" + escapeHtml(match.id) + "\">Editar</button><button class=\"btn btn-ghost\" type=\"button\" data-remove-match=\"" + escapeHtml(match.id) + "\">Quitar</button></div>";
  }

  function matchRows() {
    var columns = matchShownColumns();
    var span = columns.length || 1;
    if (!cupMatches.length) return "<tr><td colspan=\"" + span + "\">Todavía no hay partidos.</td></tr>";
    var shown = visibleMatches();
    if (!shown.length) return "<tr><td colspan=\"" + span + "\">Ningún partido coincide con el filtro.</td></tr>";
    return shown.map(function (match) {
      return "<tr>" + columns.map(function (column) { return "<td class=\"match-col-" + column[0] + "\">" + matchCell(match, column[0]) + "</td>"; }).join("") + "</tr>";
    }).join("");
  }

  function paintMatchRows() {
    var body = document.querySelector("#match-table tbody");
    if (!body) return;
    body.innerHTML = matchRows();
  }

  function matchToolsSection() {
    var open = matchToolsOpen;
    var label = editingCupMatch ? "Editar partido" : "Armar y agregar partidos";
    var icon = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path></svg>";
    return "<div class=\"cup-add" + (open ? " is-open" : "") + "\"><button type=\"button\" class=\"roster-toggle\" id=\"match-tools-toggle\" aria-expanded=\"" + (open ? "true" : "false") + "\" aria-controls=\"match-tools-body\">" + icon + label + "</button><div id=\"match-tools-body\"" + (open ? "" : " hidden") + ">" + (open ? matchToolsHtml() : "") + "</div></div>";
  }

  function matchToolsHtml() {
    return "<div class=\"cup-build\"><h2>Armar el cuadro</h2><p>Con 8, 12, 16, 20 o 24 equipos se arma la fase de grupos y luego la eliminatoria. Cada victoria suma 3 puntos y un empate suma 1. Si hay empate en el grupo, se mira la diferencia de goles, los goles a favor, el resultado entre los equipos y, al final, un sorteo. En la eliminatoria, el empate se define por penales. Con hasta 6 canchas, los partidos quedan cada 25 minutos desde la fecha y la hora del torneo. La final queda como último partido.</p><label class=\"field\">Torneo<select id=\"build-tournament\">" + cupSelect("", "Elige un torneo") + "</select></label><div class=\"admin-actions\"><button class=\"btn\" type=\"button\" id=\"build-bracket\">Armar partidos</button></div><p id=\"build-error\" class=\"form-error\" role=\"alert\" hidden></p></div>" + matchFormHtml();
  }

  function matchViewButton(id, label) {
    var current = matchView === id;
    return "<button type=\"button\" class=\"squad-sheet" + (current ? " is-active" : "") + "\" role=\"tab\" data-match-view=\"" + id + "\" aria-selected=\"" + (current ? "true" : "false") + "\">" + label + "</button>";
  }

  function matchHeadCell(column) {
    if (column[0] === "actions") return "<th class=\"match-col-actions\">Acciones</th>";
    if (column[0] === "score") return "<th class=\"match-col-score\">Marcador</th>";
    if (column[0] === "stage") return matchFilterCell(column[1], "stage", "<select class=\"roster-filter\" data-match-filter=\"stage\" aria-label=\"Filtrar fase\">" + matchStageOptions() + "</select>");
    var type = column[0] === "date" ? "date" : "search";
    var extra = type === "search" ? " placeholder=\"Filtrar\"" : "";
    return matchFilterCell(column[1], column[0], "<input class=\"roster-filter\" data-match-filter=\"" + column[0] + "\" type=\"" + type + "\"" + extra + " aria-label=\"Filtrar " + escapeHtml(column[1].toLowerCase()) + "\" value=\"" + escapeHtml(matchFilters[column[0]] || "") + "\">");
  }

  function matchColumnPicker() {
    return matchColumnDefs.map(function (column) {
      var filtered = column[0] !== "actions" && String(matchFilters[column[0]] || "").trim() !== "";
      return "<li" + (filtered ? " class=\"is-filtered\"" : "") + "><label><input type=\"checkbox\" data-match-column=\"" + column[0] + "\"" + (hiddenMatchColumns[column[0]] ? "" : " checked") + ">" + escapeHtml(column[1]) + "</label><span class=\"roster-filter-mark\" title=\"Filtro activo\" aria-hidden=\"true\"></span></li>";
    }).join("");
  }

  function matchTable() {
    var columns = matchShownColumns();
    return "<div class=\"match-board\"><div class=\"benefit-table-wrap\"><table class=\"benefit-table\" id=\"match-table\"><thead><tr>" +
      columns.map(matchHeadCell).join("") +
      "</tr></thead><tbody>" + matchRows() + "</tbody></table></div><aside class=\"roster-columns" + (matchColumnsOpen ? "" : " is-collapsed") + "\" aria-labelledby=\"match-columns-title\"><div class=\"roster-columns-head\"><button type=\"button\" class=\"columns-toggle\" id=\"match-columns-toggle\" aria-expanded=\"" + (matchColumnsOpen ? "true" : "false") + "\" aria-controls=\"match-column-body\" aria-label=\"" + (matchColumnsOpen ? "Ocultar columnas" : "Mostrar columnas") + "\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M9 6l6 6-6 6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path></svg></button><p id=\"match-columns-title\" class=\"roster-columns-title\">Columnas</p></div><div id=\"match-column-body\"><p class=\"roster-columns-note\">Marca las columnas que quieres ver en la tabla.</p><ul>" + matchColumnPicker() + "</ul></div></aside></div>";
  }

  function matchViewPanel() {
    if (matchView === "cuadro") return bracketPanel();
    if (matchView === "posiciones") return standingsPanel();
    return matchTable();
  }

  function hasScore(value) {
    if (value === "" || value == null) return false;
    var number = Number(value);
    return Number.isInteger(number) && number >= 0 && number <= 99;
  }

  function matchPlayed(match) {
    return hasScore(match.score1) && hasScore(match.score2);
  }

  function blankStanding(team) {
    return { team: team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
  }

  function applyStanding(row, goalsFor, goalsAgainst) {
    row.played += 1;
    row.goalsFor += goalsFor;
    row.goalsAgainst += goalsAgainst;
    if (goalsFor > goalsAgainst) {
      row.won += 1;
      row.points += 3;
    } else if (goalsFor === goalsAgainst) {
      row.drawn += 1;
      row.points += 1;
    } else row.lost += 1;
  }

  function applyWalkover(row, won) {
    row.played += 1;
    if (won) {
      row.won += 1;
      row.points += 3;
    } else row.lost += 1;
  }

  function compareStanding(a, b) {
    if (b.points !== a.points) return b.points - a.points;
    var diffA = a.goalsFor - a.goalsAgainst;
    var diffB = b.goalsFor - b.goalsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.name.localeCompare(b.team.name, "es");
  }

  function standingRows(tournamentId, letter) {
    var rows = {};
    cupTeams.forEach(function (team) {
      if (team.tournamentId !== tournamentId) return;
      var inGroup = cupMatches.some(function (match) {
        if (match.tournamentId !== tournamentId || match.stage !== "group") return false;
        if (letter && match.group !== letter) return false;
        return match.team1Id === team.id || match.team2Id === team.id;
      });
      if (letter && !inGroup) return;
      if (!letter && !inGroup && cupMatches.some(function (match) { return match.tournamentId === tournamentId && match.stage === "group"; })) return;
      rows[team.id] = blankStanding(team);
    });
    cupMatches.forEach(function (match) {
      if (match.tournamentId !== tournamentId || match.postponed === true) return;
      if (letter) {
        if (match.stage !== "group" || match.group !== letter) return;
      } else if (match.stage === "group") return;
      else if (match.stage !== "match" && match.stage !== "group") return;
      if (!rows[match.team1Id] || !rows[match.team2Id]) return;
      if (match.withdrawal === "1" || match.withdrawal === "2") {
        applyWalkover(rows[match.team1Id], match.withdrawal === "2");
        applyWalkover(rows[match.team2Id], match.withdrawal === "1");
        return;
      }
      if (!matchPlayed(match)) return;
      applyStanding(rows[match.team1Id], Number(match.score1), Number(match.score2));
      applyStanding(rows[match.team2Id], Number(match.score2), Number(match.score1));
    });
    return Object.keys(rows).map(function (id) { return rows[id]; }).sort(compareStanding);
  }

  function standingGoalDiff(row) {
    var diff = row.goalsFor - row.goalsAgainst;
    return diff > 0 ? "+" + diff : String(diff);
  }

  function standingsTable(title, rows) {
    var body = rows.length ? rows.map(function (row, index) {
      return "<tr><td>" + (index + 1) + "</td><td>" + matchSide(row.team.id, row.team.name) + "</td><td>" + row.played + "</td><td>" + row.won + "</td><td>" + row.drawn + "</td><td>" + row.lost + "</td><td>" + row.goalsFor + "</td><td>" + row.goalsAgainst + "</td><td>" + standingGoalDiff(row) + "</td><td class=\"is-points\">" + row.points + "</td></tr>";
    }).join("") : "<tr><td colspan=\"10\">Todavía no hay equipos en esta tabla.</td></tr>";
    return "<section class=\"standings-block\"><h3>" + escapeHtml(title) + "</h3><div class=\"benefit-table-wrap\"><table class=\"benefit-table standings-table\"><thead><tr><th>Pos</th><th>Equipo</th><th title=\"Partidos jugados\">PJ</th><th title=\"Ganados\">PG</th><th title=\"Empatados\">PE</th><th title=\"Perdidos\">PP</th><th title=\"Goles a favor\">GF</th><th title=\"Goles en contra\">GC</th><th title=\"Diferencia de goles\">DG</th><th title=\"Puntos\">Pts</th></tr></thead><tbody>" + body + "</tbody></table></div></section>";
  }

  function standingsBoard(tournamentId) {
    var letters = [];
    cupMatches.forEach(function (match) {
      if (match.tournamentId === tournamentId && match.stage === "group" && match.group && letters.indexOf(match.group) === -1) letters.push(match.group);
    });
    letters.sort();
    if (letters.length) return letters.map(function (letter) { return standingsTable("Grupo " + letter, standingRows(tournamentId, letter)); }).join("");
    return standingsTable("Posiciones", standingRows(tournamentId, ""));
  }

  function standingsPanel() {
    var tournamentId = bracketTournamentId();
    var picker = cups.length ? "<label class=\"field\">Torneo<select id=\"standings-cup\">" + cupSelect(tournamentId, "Elige un torneo") + "</select></label>" : "";
    var note = "<p class=\"field-hint\">La tabla cuenta los partidos de grupos con marcador. Cada victoria suma 3 puntos y un empate suma 1. Si un equipo se retira, pierde el partido y no suma goles. Un partido aplazado no entra en la tabla.</p>";
    return picker + note + "<div id=\"standings-board\">" + (tournamentId ? standingsBoard(tournamentId) : "<p class=\"bracket-empty\">Agrega un torneo para ver la tabla.</p>") + "</div>";
  }

  function saveMatchScore(matchId) {
    if (cupSaveBusy) return;
    var match = cupMatchById(matchId);
    var home = document.querySelector("[data-score-match=\"" + matchId + "\"][data-score-side=\"1\"]");
    var away = document.querySelector("[data-score-match=\"" + matchId + "\"][data-score-side=\"2\"]");
    if (!match || !home || !away) return;
    var score1 = readScore(home.value);
    var score2 = readScore(away.value);
    if (score1 === null || score2 === null) return setStatus("El marcador debe ser un número entre 0 y 99.");
    if ((score1 === "") !== (score2 === "")) return setStatus("Escribe los dos marcadores.");
    var withdrawalBox = document.querySelector("[data-score-withdrawal=\"" + matchId + "\"]");
    var withdrawalSelect = document.querySelector("[data-withdrawal-side=\"" + matchId + "\"]");
    var postponedBox = document.querySelector("[data-score-postponed=\"" + matchId + "\"]");
    var noteInput = document.querySelector("[data-postpone-note=\"" + matchId + "\"]");
    var withdrawal = withdrawalBox && withdrawalBox.checked ? String(withdrawalSelect ? withdrawalSelect.value : "") : "";
    var postponed = Boolean(postponedBox && postponedBox.checked);
    var postponeNote = postponed ? String(noteInput ? noteInput.value : "").trim() : "";
    if (withdrawal && postponed) return setStatus("Un partido aplazado no puede tener retiro.");
    if (withdrawal && withdrawal !== "1" && withdrawal !== "2") return setStatus("Elige el equipo que se retira.");
    if (withdrawal && (!match.team1Id || !match.team2Id)) return setStatus("Elige los dos equipos antes de marcar un retiro.");
    if (postponed && !postponeNote) return setStatus("Escribe el motivo del aplazamiento.");
    if (postponeNote.length > 240) return setStatus("El motivo admite hasta 240 caracteres.");
    var penaltyBox = document.querySelector("[data-score-penalties=\"" + matchId + "\"]");
    var penalties = !withdrawal && !postponed && Boolean(penaltyBox && penaltyBox.checked && score1 !== "" && score1 === score2 && isKnockoutStage(match.stage));
    var penHome = document.querySelector("[data-score-match=\"" + matchId + "\"][data-penalty-side=\"1\"]");
    var penAway = document.querySelector("[data-score-match=\"" + matchId + "\"][data-penalty-side=\"2\"]");
    var penalty1 = penalties ? readScore(penHome ? penHome.value : "") : "";
    var penalty2 = penalties ? readScore(penAway ? penAway.value : "") : "";
    if (penalty1 === null || penalty2 === null) return setStatus("El marcador de penales debe ser un número entre 0 y 99.");
    if (penalties && (penalty1 === "" || penalty2 === "")) return setStatus("Escribe los goles de la tanda de penales.");
    if (penalties && penalty1 === penalty2) return setStatus("La tanda de penales debe tener un ganador.");
    var prev1 = hasScore(match.score1) ? Number(match.score1) : "";
    var prev2 = hasScore(match.score2) ? Number(match.score2) : "";
    var prevPen1 = match.penalties && hasScore(match.penalty1) ? Number(match.penalty1) : "";
    var prevPen2 = match.penalties && hasScore(match.penalty2) ? Number(match.penalty2) : "";
    var prevWithdrawal = match.withdrawal === "1" || match.withdrawal === "2" ? match.withdrawal : "";
    var prevNote = match.postponed ? String(match.postponeNote || "").trim() : "";
    if (prev1 === score1 && prev2 === score2 && Boolean(match.penalties) === penalties && prevPen1 === penalty1 && prevPen2 === penalty2 && prevWithdrawal === withdrawal && Boolean(match.postponed) === postponed && prevNote === postponeNote) return;
    var next = {};
    Object.keys(match).forEach(function (key) { next[key] = match[key]; });
    next.score1 = score1;
    next.score2 = score2;
    next.penalties = penalties;
    next.penalty1 = penalty1;
    next.penalty2 = penalty2;
    next.withdrawal = withdrawal;
    next.postponed = postponed;
    next.postponeNote = postponeNote;
    var list = cupMatches.map(function (item) { return item.id === matchId ? next : item; });
    var saved = withdrawal ? "Retiro guardado." : postponed ? "Aplazamiento guardado." : penalties ? "Penales guardados." : "Marcador guardado.";
    cupSaveBusy = true;
    saveCup({ tournaments: cups, teams: cupTeams, matches: list }, saved).then(function (result) {
      cupSaveBusy = false;
      if (!result.ok) {
        setStatus((result.data && result.data.error) || "No se pudo guardar el marcador.");
        return;
      }
      paintMatchRows();
      var standings = document.getElementById("standings-board");
      var board = document.getElementById("bracket-board");
      var tournamentId = bracketTournamentId();
      if (standings) standings.innerHTML = tournamentId ? standingsBoard(tournamentId) : "<p class=\"bracket-empty\">Agrega un torneo para ver la tabla.</p>";
      if (board) board.innerHTML = tournamentId ? bracketBoard(tournamentId) : "<p class=\"bracket-empty\">Agrega un torneo para ver el cuadro.</p>";
    }).catch(function () {
      cupSaveBusy = false;
      setStatus("No se pudo guardar el marcador.");
    });
  }

  function bracketTournamentId() {
    if (bracketCup && cupById(bracketCup)) return bracketCup;
    var found = cups.filter(function (cup) {
      return cupMatches.some(function (match) { return match.tournamentId === cup.id; });
    })[0];
    return found ? found.id : (cups[0] ? cups[0].id : "");
  }

  function bracketSlot(teamId, label) {
    var team = cupTeamById(teamId);
    var name = team ? team.name : (label || "Por definir");
    var src = cupTeamLogoSrc(team);
    var image = src ? "<img src=\"" + escapeHtml(src) + "\" alt=\"\">" : "";
    return "<div class=\"bracket-slot" + (team ? "" : " is-open") + "\">" + image + "<span>" + escapeHtml(name) + "</span></div>";
  }

  function orderedStage(matches, stage) {
    return matches.map(function (match, index) { return { match: match, index: index }; }).filter(function (item) {
      return item.match.stage === stage;
    }).sort(function (a, b) {
      return (a.match.round || 0) - (b.match.round || 0) || a.index - b.index;
    }).map(function (item) { return item.match; });
  }

  function groupMembers(matches, letter, tournamentId) {
    var ids = {};
    matches.forEach(function (match) {
      if (match.stage !== "group" || match.group !== letter) return;
      if (match.team1Id) ids[match.team1Id] = true;
      if (match.team2Id) ids[match.team2Id] = true;
    });
    return cupTeams.filter(function (team) {
      return team.tournamentId === tournamentId && ids[team.id];
    }).map(function (team) { return { id: team.id, label: "" }; });
  }

  function bracketMatch(match, title) {
    return "<div class=\"bracket-match\"><span class=\"bracket-round\">" + escapeHtml(title) + "</span>" + bracketSlot(match.team1Id, match.label1) + bracketSlot(match.team2Id, match.label2) + "</div>";
  }

  function bracketGroup(letter, matches, tournamentId) {
    var members = groupMembers(matches, letter, tournamentId);
    return "<section class=\"bracket-group\"><div class=\"bracket-group-teams\">" + members.map(function (member) {
      return bracketSlot(member.id, member.label);
    }).join("") + "</div><svg class=\"bracket-brace\" viewBox=\"0 0 120 28\" preserveAspectRatio=\"none\" aria-hidden=\"true\"><path d=\"M3 3v7c0 5 7 7 16 7h27c7 0 9 5 14 9 5-4 7-9 14-9h27c9 0 16-2 16-7V3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\"/></svg><p>Grupo " + escapeHtml(letter) + "</p></section>";
  }

  function finalChampion(tournamentId) {
    var finals = cupMatches.filter(function (match) {
      return match.tournamentId === tournamentId && match.stage === "final";
    });
    if (finals.length !== 1) return null;
    var match = finals[0];
    if (match.postponed === true || !match.team1Id || !match.team2Id) return null;
    var winnerId = "";
    if (match.withdrawal === "1") winnerId = match.team2Id;
    else if (match.withdrawal === "2") winnerId = match.team1Id;
    else if (hasScore(match.score1) && hasScore(match.score2) && Number(match.score1) !== Number(match.score2)) winnerId = Number(match.score1) > Number(match.score2) ? match.team1Id : match.team2Id;
    else if (match.penalties && hasScore(match.penalty1) && hasScore(match.penalty2) && Number(match.penalty1) !== Number(match.penalty2)) winnerId = Number(match.penalty1) > Number(match.penalty2) ? match.team1Id : match.team2Id;
    return winnerId ? cupTeamById(winnerId) : null;
  }

  function bracketBoard(tournamentId) {
    var matches = cupMatches.filter(function (match) { return match.tournamentId === tournamentId; });
    if (!matches.length) return "<p class=\"bracket-empty\">Este torneo todavía no tiene partidos.</p>";
    var titles = { final: "Final", semi: "Semifinal", quarter: "Cuartos", r16: "Octavos" };
    var rounds = ["final", "semi", "quarter", "r16"].filter(function (stage) {
      return matches.some(function (match) { return match.stage === stage; });
    });
    var letters = [];
    matches.forEach(function (match) {
      if (match.stage === "group" && match.group && letters.indexOf(match.group) === -1) letters.push(match.group);
    });
    letters.sort();
    var champion = finalChampion(tournamentId);
    var trophy = "<div class=\"bracket-trophy\"><svg viewBox=\"0 0 64 72\" aria-hidden=\"true\"><path d=\"M20 8h24v10c0 8-5 14-12 14s-12-6-12-14V8z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\"/><path d=\"M20 14H12c0 7 4 11 8 12M44 14h8c0 7-4 11-8 12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\"/><path d=\"M32 32v8M22 54h20M25 40h14v8H25z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linejoin=\"round\"/></svg>" + (champion ? "<p>Campeón</p><strong>" + escapeHtml(champion.name) + "</strong>" : "") + "</div>";
    function branch(level, index) {
      var rows = orderedStage(matches, rounds[level]);
      var match = rows[index];
      if (!match) return "";
      var below = "";
      if (level < rounds.length - 1) {
        below = "<div class=\"bracket-join\" aria-hidden=\"true\"></div><div class=\"bracket-columns\">" + branch(level + 1, index * 2) + branch(level + 1, index * 2 + 1) + "</div>";
      } else if (letters.length === rows.length && letters[index]) {
        below = "<div class=\"bracket-join\" aria-hidden=\"true\"></div>" + bracketGroup(letters[index], matches, tournamentId);
      }
      return "<div class=\"bracket-branch\">" + bracketMatch(match, titles[rounds[level]]) + below + "</div>";
    }
    var html = trophy;
    if (rounds.length) html += branch(0, 0);
    else if (letters.length) html += "<div class=\"bracket-columns\">" + letters.map(function (letter) { return bracketGroup(letter, matches, tournamentId); }).join("") + "</div>";
    else html += "<div class=\"bracket-columns\">" + orderedStage(matches, "match").map(function (match) { return bracketMatch(match, "Partido"); }).join("") + "</div>";
    var third = orderedStage(matches, "third")[0];
    if (third) html += "<div class=\"bracket-third\"><p>Tercer puesto</p>" + bracketMatch(third, "vs") + "</div>";
    return "<div class=\"bracket\">" + html + "</div>";
  }

  function bracketPanel() {
    var tournamentId = bracketTournamentId();
    var picker = cups.length ? "<label class=\"field\">Torneo<select id=\"bracket-cup\">" + cupSelect(tournamentId, "Elige un torneo") + "</select></label>" : "";
    return picker + "<div id=\"bracket-board\">" + (tournamentId ? bracketBoard(tournamentId) : "<p class=\"bracket-empty\">Agrega un torneo para ver el cuadro.</p>") + "</div>";
  }

  function cupSheetButton(id, label) {
    var current = tournamentSheet === id;
    return "<button type=\"button\" class=\"squad-sheet" + (current ? " is-active" : "") + "\" role=\"tab\" data-cup-sheet=\"" + id + "\" aria-selected=\"" + (current ? "true" : "false") + "\">" + label + "</button>";
  }

  function tournamentsPanel() {
    var page = siteTabs.filter(function (item) { return item.id === "torneos"; })[0];
    var sheets = "<div class=\"squad-sheets\" role=\"tablist\" aria-label=\"Secciones del torneo\">" + cupSheetButton("torneos", "Torneos") + cupSheetButton("equipos", "Equipos") + cupSheetButton("partidos", "Partidos") + "</div>";
    var body = "";
    if (tournamentSheet === "equipos") {
      body = "<article class=\"panel-card benefits-admin\"><p>Los equipos seleccionados entran al cuadro en este orden. Sube o baja un equipo para cambiar su grupo.</p>" + teamFormSection() + "<div id=\"team-bracket-slot\">" + teamBracketBar() + "</div><div class=\"benefit-table-wrap\"><table class=\"benefit-table\"><thead><tr><th class=\"benefit-check\"><input type=\"checkbox\" id=\"team-select-all\" aria-label=\"Seleccionar todos los equipos\"></th><th>Logo</th><th>Nombre del equipo</th><th>Torneo</th><th>Acciones</th></tr></thead><tbody>" + teamRows() + "</tbody></table></div></article>";
    } else if (tournamentSheet === "partidos") {
      body = "<article class=\"panel-card benefits-admin\">" + matchToolsSection() + "<div class=\"squad-sheets cup-view-sheets\" role=\"tablist\" aria-label=\"Vista de partidos\">" + matchViewButton("lista", "Lista") + matchViewButton("posiciones", "Posiciones") + matchViewButton("cuadro", "Cuadro") + "</div>" + matchViewPanel() + "</article>";
    } else {
      body = "<article class=\"panel-card benefits-admin\">" + tournamentFormSection() + "<div class=\"benefit-table-wrap\"><table class=\"benefit-table\"><thead><tr><th>Nombre del torneo</th><th>Lugar</th><th>Fecha</th><th>Hora</th><th>Canchas</th><th>Acciones</th></tr></thead><tbody>" + tournamentRows() + "</tbody></table></div></article>";
    }
    return sitePanel(page) + sheets + body;
  }

  function paintTeamLogo() {
    var figure = document.getElementById("team-logo-figure");
    var empty = document.getElementById("team-logo-empty");
    var img = document.getElementById("team-logo-preview");
    if (!figure || !img) return;
    var src = teamLogoData;
    if (!src && !teamLogoRemoved && editingCupTeam) src = cupTeamLogoSrc(cupTeamById(editingCupTeam));
    figure.hidden = !src;
    empty.hidden = Boolean(src);
    if (src) img.src = src;
  }

  function paintMatchSide(selectId, imgId) {
    var select = document.getElementById(selectId);
    var img = document.getElementById(imgId);
    if (!select || !img) return;
    var team = cupTeamById(select.value);
    var src = cupTeamLogoSrc(team);
    img.hidden = !src;
    if (src) img.src = src;
  }

  function paintMatchTeams(clearTeams) {
    var cupSelect = document.getElementById("match-tournament");
    if (!cupSelect) return;
    var tournamentId = cupSelect.value;
    [1, 2].forEach(function (side) {
      var select = document.getElementById("match-team-" + side);
      if (!select) return;
      var current = clearTeams ? "" : select.value;
      var team = cupTeamById(current);
      if (team && team.tournamentId !== tournamentId) current = "";
      select.innerHTML = cupTeamOptions(tournamentId, current);
      paintMatchSide("match-team-" + side, "match-logo-" + side);
    });
    var list = document.getElementById("match-fields");
    var cup = cupById(tournamentId);
    if (list) list.innerHTML = cup && cup.fields ? cup.fields.map(function (field) { return "<option value=\"" + escapeHtml(field) + "\"></option>"; }).join("") : "";
  }

  function bindTournamentEditors() {
    var cup = editingCup ? cupById(editingCup) : null;
    var team = editingCupTeam ? cupTeamById(editingCupTeam) : null;
    fillRich("cup-info-input", cup ? cup.info : "");
    fillRich("team-info-input", team ? team.info : "");
    paintTeamLogo();
    paintMatchTeams(false);
    var zone = document.getElementById("team-logo-drop");
    var file = document.getElementById("team-logo-file");
    if (zone) {
      zone.addEventListener("dragover", function (event) {
        event.preventDefault();
        zone.classList.add("is-over");
      });
      zone.addEventListener("dragleave", function (event) {
        if (zone.contains(event.relatedTarget)) return;
        zone.classList.remove("is-over");
      });
      zone.addEventListener("drop", function (event) {
        event.preventDefault();
        zone.classList.remove("is-over");
        readTeamLogo(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]);
      });
    }
    if (file) {
      file.addEventListener("change", function () {
        var picked = file.files && file.files[0];
        file.value = "";
        readTeamLogo(picked);
      });
    }
    var matchCup = document.getElementById("match-tournament");
    if (matchCup) matchCup.addEventListener("change", function () { paintMatchTeams(true); });
    [1, 2].forEach(function (side) {
      var select = document.getElementById("match-team-" + side);
      if (select) select.addEventListener("change", function () { paintMatchSide("match-team-" + side, "match-logo-" + side); });
    });
  }

  function readTeamLogo(file) {
    if (!file) return;
    setCupError("team-error", "");
    var status = document.getElementById("team-logo-status");
    if (status) status.textContent = "";
    readPhotoFile(file).then(openTeamLogoEditor).catch(function (error) {
      if (status) status.textContent = error.message || "El logo no se pudo leer.";
    });
  }

  function submitCup(form) {
    if (cupSaveBusy) return;
    var data = new FormData(form);
    var name = String(data.get("name") || "").trim();
    if (!name) return setCupError("cup-error", "Escribe el nombre del torneo.");
    var fields = [];
    data.getAll("field").forEach(function (field) {
      var text = String(field || "").trim();
      if (text && fields.indexOf(text) === -1) fields.push(text);
    });
    if (fields.length > 6) return setCupError("cup-error", "Un torneo admite hasta 6 canchas.");
    var current = editingCup ? cupById(editingCup) : null;
    var next = {
      id: current ? current.id : "c-" + Date.now().toString(36),
      name: name,
      location: String(data.get("location") || "").trim(),
      address: String(data.get("address") || "").trim(),
      date: String(data.get("date") || ""),
      time: String(data.get("time") || ""),
      info: cupRichValue("cup-info-input"),
      fields: fields
    };
    var list = cups.map(function (item) { return item.id === next.id ? next : item; });
    if (!current) list = cups.concat([next]);
    cupSaveBusy = true;
    saveCup({ tournaments: list, teams: cupTeams, matches: cupMatches }, "Torneo guardado.").then(function (result) {
      cupSaveBusy = false;
      if (!result.ok) return setCupError("cup-error", result.data.error || "No se pudo guardar el torneo.");
      editingCup = "";
      cupFormOpen = false;
      render();
    }).catch(function () {
      cupSaveBusy = false;
      setCupError("cup-error", "No se pudo guardar el torneo.");
    });
  }

  function submitCupTeam(form) {
    if (cupSaveBusy) return;
    var data = new FormData(form);
    var name = String(data.get("name") || "").trim();
    if (!name) return setCupError("team-error", "Escribe el nombre del equipo.");
    var info = cupRichValue("team-info-input");
    if (notesText(info).length > 4000) return setCupError("team-error", "La información del equipo admite hasta 4000 caracteres.");
    var current = editingCupTeam ? cupTeamById(editingCupTeam) : null;
    var id = current ? current.id : "tm-" + Date.now().toString(36);
    var logo = teamLogoRemoved ? "" : (current ? current.logo : "");
    cupSaveBusy = true;
    var button = form.querySelector("button[type=\"submit\"]");
    if (button) button.disabled = true;
    var ready = teamLogoData
      ? api("/api/admin/tournaments/photo", "POST", { id: id, data: teamLogoData }).then(function (result) {
        if (!result.ok) throw new Error(result.data.error || "El logo no se pudo guardar.");
        logo = result.data.file;
      })
      : Promise.resolve();
    ready.then(function () {
      var next = { id: id, name: name, info: info, logo: logo, tournamentId: String(data.get("tournament") || "") };
      var list = cupTeams.map(function (item) { return item.id === id ? next : item; });
      if (!current) list = cupTeams.concat([next]);
      return saveCup({ tournaments: cups, teams: list, matches: cupMatches }, "Equipo guardado.");
    }).then(function (result) {
      cupSaveBusy = false;
      if (!result || !result.ok) {
        if (button) button.disabled = false;
        setCupError("team-error", (result && result.data && result.data.error) || "No se pudo guardar el equipo.");
        return;
      }
      editingCupTeam = "";
      teamLogoData = "";
      teamLogoRemoved = false;
      teamFormOpen = false;
      render();
    }).catch(function (error) {
      cupSaveBusy = false;
      if (button) button.disabled = false;
      setCupError("team-error", error.message || "No se pudo guardar el equipo.");
    });
  }

  function submitCupMatch(form) {
    if (cupSaveBusy) return;
    var data = new FormData(form);
    var tournamentId = String(data.get("tournament") || "");
    var team1Id = String(data.get("team1") || "");
    var team2Id = String(data.get("team2") || "");
    var field = String(data.get("field") || "").trim();
    var date = String(data.get("date") || "");
    var time = String(data.get("time") || "");
    if (!tournamentId) return setCupError("match-error", "Elige un torneo.");
    if (team1Id && team1Id === team2Id) return setCupError("match-error", "Elige dos equipos distintos.");
    if (!current && (!team1Id || !team2Id)) return setCupError("match-error", "Elige dos equipos distintos.");
    if (current && !team1Id && !current.label1) return setCupError("match-error", "Elige el equipo 1.");
    if (current && !team2Id && !current.label2) return setCupError("match-error", "Elige el equipo 2.");
    if (!field || !date || !time) return setCupError("match-error", "Escribe la cancha, la fecha y la hora.");
    var score1 = readScore(data.get("score1"));
    var score2 = readScore(data.get("score2"));
    if (score1 === null || score2 === null) return setCupError("match-error", "El marcador debe ser un número entre 0 y 99.");
    if ((score1 === "") !== (score2 === "")) return setCupError("match-error", "Escribe los dos marcadores o déjalos vacíos.");
    var current = editingCupMatch ? cupMatchById(editingCupMatch) : null;
    var stage = current && current.stage ? current.stage : "match";
    var withdrawalFlag = data.get("withdrawalFlag") === "on";
    var postponed = data.get("postponed") === "on";
    var withdrawal = withdrawalFlag ? String(data.get("withdrawal") || "") : "";
    var postponeNote = postponed ? String(data.get("postponeNote") || "").trim() : "";
    if (withdrawalFlag && postponed) return setCupError("match-error", "Un partido aplazado no puede tener retiro.");
    if (withdrawalFlag && withdrawal !== "1" && withdrawal !== "2") return setCupError("match-error", "Elige el equipo que se retira.");
    if (withdrawal && (!team1Id || !team2Id)) return setCupError("match-error", "Elige los dos equipos antes de marcar un retiro.");
    if (postponed && !postponeNote) return setCupError("match-error", "Escribe el motivo del aplazamiento.");
    if (postponeNote.length > 240) return setCupError("match-error", "El motivo admite hasta 240 caracteres.");
    var penalties = !withdrawal && !postponed && data.get("penalties") === "on" && isKnockoutStage(stage) && score1 !== "" && score1 === score2;
    var penalty1 = penalties ? readScore(data.get("penalty1")) : "";
    var penalty2 = penalties ? readScore(data.get("penalty2")) : "";
    if (penalty1 === null || penalty2 === null) return setCupError("match-error", "El marcador de penales debe ser un número entre 0 y 99.");
    if (!withdrawal && !postponed && data.get("penalties") === "on" && !penalties) return setCupError("match-error", "Los penales se usan cuando el partido queda empatado.");
    if (penalties && (penalty1 === "" || penalty2 === "")) return setCupError("match-error", "Escribe los goles de la tanda de penales.");
    if (penalties && penalty1 === penalty2) return setCupError("match-error", "La tanda de penales debe tener un ganador.");
    var next = {
      id: current ? current.id : "m-" + Date.now().toString(36),
      tournamentId: tournamentId,
      stage: stage,
      group: current ? current.group || "" : "",
      round: current && current.round ? current.round : 0,
      team1Id: team1Id,
      team2Id: team2Id,
      label1: current ? current.label1 || "" : "",
      label2: current ? current.label2 || "" : "",
      field: field,
      date: date,
      time: time,
      score1: score1,
      score2: score2,
      penalties: penalties,
      penalty1: penalty1,
      penalty2: penalty2,
      withdrawal: withdrawal,
      postponed: postponed,
      postponeNote: postponeNote
    };
    var list = cupMatches.map(function (item) { return item.id === next.id ? next : item; });
    if (!current) list = cupMatches.concat([next]);
    cupSaveBusy = true;
    saveCup({ tournaments: cups, teams: cupTeams, matches: list }, "Partido guardado.").then(function (result) {
      cupSaveBusy = false;
      if (!result.ok) return setCupError("match-error", result.data.error || "No se pudo guardar el partido.");
      editingCupMatch = "";
      matchToolsOpen = false;
      render();
    }).catch(function () {
      cupSaveBusy = false;
      setCupError("match-error", "No se pudo guardar el partido.");
    });
  }

  function moveCupTeam(id, dir) {
    var team = cupTeamById(id);
    if (!team || cupSaveBusy) return;
    var same = cupTeams.filter(function (item) { return item.tournamentId === team.tournamentId; });
    var index = -1;
    for (var i = 0; i < same.length; i += 1) if (same[i].id === id) index = i;
    var target = index + dir;
    if (index < 0 || target < 0 || target >= same.length) return;
    var list = cupTeams.slice();
    var from = -1;
    var to = -1;
    for (var j = 0; j < list.length; j += 1) {
      if (list[j].id === id) from = j;
      if (list[j].id === same[target].id) to = j;
    }
    var swap = list[from];
    list[from] = list[to];
    list[to] = swap;
    cupSaveBusy = true;
    saveCup({ tournaments: cups, teams: list, matches: cupMatches }, "Orden de equipos actualizado.").then(function (result) {
      cupSaveBusy = false;
      if (!result.ok) setStatus(result.data.error || "No se pudo guardar.");
      else render();
    });
  }

  function buildCupBracket() {
    var select = document.getElementById("build-tournament");
    var tournamentId = select ? select.value : "";
    if (!tournamentId) return setCupError("build-error", "Elige un torneo.");
    setCupError("build-error", "");
    var count = cupTeams.filter(function (team) { return team.tournamentId === tournamentId; }).length;
    var exists = cupMatches.some(function (match) { return match.tournamentId === tournamentId; });
    var run = function () {
      setStatus("Armando los partidos…");
      api("/api/admin/tournaments/build", "POST", { tournamentId: tournamentId }).then(function (result) {
        if (!result.ok) {
          setStatus("");
          setCupError("build-error", result.data.error || "No se pudo armar el cuadro.");
          return;
        }
        cups = result.data.tournaments || [];
        cupTeams = result.data.teams || [];
        cupMatches = result.data.matches || [];
        editingCupMatch = "";
        setStatus(count + " equipos. El cuadro quedó armado.");
        render();
      }).catch(function () {
        setStatus("");
        setCupError("build-error", "No se pudo armar el cuadro.");
      });
    };
    if (!exists) return run();
    askPartnerRemove("Reemplazar partidos", "¿Reemplazar los partidos de " + cupName(tournamentId) + "?", run, "Se quitan los partidos actuales de este torneo y se arma el cuadro de nuevo.");
  }

  function buildSelectedBracket() {
    var select = document.getElementById("selected-tournament");
    var tournamentId = select ? select.value : "";
    selectedBracketTournament = tournamentId;
    var ids = selectedTeamIds();
    if (!tournamentId) return setCupError("selected-build-error", "Elige un torneo.");
    if (!cupFormats[ids.length]) return setCupError("selected-build-error", "El cuadro se arma con 8, 12, 16, 20 o 24 equipos.");
    setCupError("selected-build-error", "");
    var exists = cupMatches.some(function (match) { return match.tournamentId === tournamentId; });
    var run = function () {
      setStatus("Armando los partidos…");
      api("/api/admin/tournaments/build", "POST", { tournamentId: tournamentId, teamIds: ids }).then(function (result) {
        if (!result.ok) {
          setStatus("");
          setCupError("selected-build-error", result.data.error || "No se pudo armar el cuadro.");
          return;
        }
        cups = result.data.tournaments || [];
        cupTeams = result.data.teams || [];
        cupMatches = result.data.matches || [];
        editingCupMatch = "";
        tournamentSheet = "partidos";
        setStatus(ids.length + " equipos. El cuadro quedó armado en Partidos.");
        render();
      }).catch(function () {
        setStatus("");
        setCupError("selected-build-error", "No se pudo armar el cuadro.");
      });
    };
    if (!exists) return run();
    askPartnerRemove("Reemplazar partidos", "¿Reemplazar los partidos de " + cupName(tournamentId) + "?", run, "Los equipos seleccionados quedan en este torneo. Se quitan los partidos actuales y se arma el cuadro de nuevo.");
  }

  function render() {
    captureBenefitEdits();
    captureSponsorEdits();
    captureLocationForm();
    if (tab === "jugadoras") {
      if (collapseAddForm) {
        playerDraft = null;
        rosterOpen = false;
        collapseAddForm = false;
      } else capturePlayerDraft();
    }
    paintNavs();
    var site = siteTabs.filter(function (item) { return item.id === tab; })[0];
    if (site && site.id !== "beneficios" && site.id !== "patrocinadores" && site.id !== "sedes" && site.id !== "plantilla" && site.id !== "torneos") {
      panel.innerHTML = sitePanel(site);
      return;
    }
    if (tab === "torneos") {
      panel.innerHTML = tournamentsPanel();
      bindTournamentEditors();
      paintTeamBracket();
      return;
    }
    if (tab === "sedes") {
      panel.innerHTML = locationsPanel();
      return;
    }
    if (tab === "plantilla") {
      panel.innerHTML = squadPanel();
      return;
    }
    if (tab === "beneficios") {
      panel.innerHTML = benefitsPanel();
      syncBenefitSelection();
      return;
    }
    if (tab === "patrocinadores") {
      panel.innerHTML = sponsorsPanel();
      syncSponsorSelection();
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
    else panel.innerHTML = analyticsSettingsCard();
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
      api("/api/admin/roster", "GET"),
      api("/api/admin/benefits", "GET"),
      api("/api/admin/sponsors", "GET"),
      api("/api/admin/locations", "GET"),
      api("/api/admin/tournaments", "GET")
    ]).then(function (results) {
      if (!results[0].ok) throw new Error("session");
      settings = results[0].data;
      events = results[1].ok ? results[1].data.events || [] : [];
      players = results[2].ok ? results[2].data.players || [] : [];
      benefits = results[3].ok ? results[3].data.benefits || [] : [];
      sponsors = results[4].ok ? results[4].data.sponsors || [] : [];
      locations = results[5].ok ? results[5].data.locations || [] : [];
      cups = results[6].ok ? results[6].data.tournaments || [] : [];
      cupTeams = results[6].ok ? results[6].data.teams || [] : [];
      cupMatches = results[6].ok ? results[6].data.matches || [] : [];
      rememberBenefits();
      rememberSponsors();
    });
  }

  function saveAnalytics(form) {
    var error = document.getElementById("analytics-error");
    var googleId = String(form.googleId.value || "").trim().toUpperCase();
    var facebookId = String(form.facebookId.value || "").replace(/\s+/g, "");
    var googleOn = form.googleOn.checked;
    var facebookOn = form.facebookOn.checked;
    form.googleId.value = googleId;
    form.facebookId.value = facebookId;
    function fail(message) {
      if (error) {
        error.hidden = false;
        error.textContent = message;
      }
      setStatus("");
    }
    if (googleOn && !googleId) return fail("Escribe el ID de medición de Google Analytics para activarlo.");
    if (facebookOn && !facebookId) return fail("Escribe el ID del píxel de Facebook para activarlo.");
    if (googleId && !/^G-[A-Z0-9]{4,16}$/.test(googleId)) return fail("El ID de Google Analytics debe verse como G-XXXXXXXXXX.");
    if (facebookId && !/^\d{5,20}$/.test(facebookId)) return fail("El ID del píxel de Facebook debe ser un número.");
    if (error) error.hidden = true;
    var button = form.querySelector("button");
    button.disabled = true;
    api("/api/admin/settings", "PUT", {
      pages: settings.pages,
      analytics: { googleId: googleId, googleOn: googleOn, facebookId: facebookId, facebookOn: facebookOn }
    }).then(function (result) {
      button.disabled = false;
      if (!result.ok) return fail(result.data.error || "No se pudo guardar.");
      settings = result.data;
      setStatus("Medición guardada.");
    }).catch(function () {
      button.disabled = false;
      fail("No se pudo guardar.");
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
    if (event.target.closest("[data-event-note-cmd], [data-cup-cmd]")) event.preventDefault();
  });

  var partnerPhotoDialog = document.getElementById("partner-photo-dialog");
  if (partnerPhotoDialog) {
    partnerPhotoDialog.addEventListener("click", function (event) {
      if (event.target === partnerPhotoDialog || event.target.closest("[data-close-partner-photo]")) partnerPhotoDialog.close();
    });
  }

  app.addEventListener("click", function (event) {
    var cupCmd = event.target.closest("[data-cup-cmd]");
    if (cupCmd) {
      var cupInput = document.getElementById(cupCmd.getAttribute("data-cup-target"));
      if (cupInput) {
        cupInput.focus();
        document.execCommand(cupCmd.getAttribute("data-cup-cmd"), false, null);
      }
      return;
    }
    var matchViewTab = event.target.closest("[data-match-view]");
    if (matchViewTab) {
      matchView = matchViewTab.getAttribute("data-match-view");
      render();
      return;
    }
    var cupSheet = event.target.closest("[data-cup-sheet]");
    if (cupSheet) {
      tournamentSheet = cupSheet.getAttribute("data-cup-sheet");
      render();
      return;
    }
    if (event.target.closest("#add-cup-field")) {
      var fieldList = document.getElementById("cup-fields");
      if (fieldList && fieldList.querySelectorAll("input").length >= 6) setCupError("cup-error", "Un torneo admite hasta 6 canchas.");
      else if (fieldList) {
        setCupError("cup-error", "");
        fieldList.insertAdjacentHTML("beforeend", cupFieldRow("", fieldList.querySelectorAll(".cup-field").length));
      }
      return;
    }
    if (event.target.closest("[data-remove-cup-field]")) {
      var fieldRow = event.target.closest(".cup-field");
      if (fieldRow) {
        fieldRow.remove();
        numberCupFields();
      }
      return;
    }
    if (event.target.closest("#cup-form-toggle")) {
      cupFormOpen = !cupFormOpen;
      if (!cupFormOpen) editingCup = "";
      render();
      return;
    }
    if (event.target.closest("#cancel-cup")) {
      editingCup = "";
      cupFormOpen = false;
      render();
      return;
    }
    var editCup = event.target.closest("[data-edit-cup]");
    if (editCup) {
      editingCup = editCup.getAttribute("data-edit-cup");
      cupFormOpen = true;
      render();
      return;
    }
    var removeCup = event.target.closest("[data-remove-cup]");
    if (removeCup) {
      var cupId = removeCup.getAttribute("data-remove-cup");
      var removedCup = cupById(cupId);
      if (!removedCup) return;
      askPartnerRemove("Quitar torneo", "¿Quitar el torneo " + removedCup.name + "?", function () {
        var teams = cupTeams.map(function (team) {
          if (team.tournamentId !== cupId) return team;
          var copy = {};
          Object.keys(team).forEach(function (key) { copy[key] = team[key]; });
          copy.tournamentId = "";
          return copy;
        });
        saveCup({
          tournaments: cups.filter(function (item) { return item.id !== cupId; }),
          teams: teams,
          matches: cupMatches.filter(function (item) { return item.tournamentId !== cupId; })
        }, "Torneo eliminado.").then(function (result) {
          if (!result.ok) setStatus(result.data.error || "No se pudo quitar el torneo.");
          else {
            if (editingCup === cupId) {
              editingCup = "";
              cupFormOpen = false;
            }
            render();
          }
        });
      }, "Los equipos quedan en No aplica y se quitan los partidos de este torneo.");
      return;
    }
    if (event.target.closest("#team-form-toggle")) {
      teamFormOpen = !teamFormOpen;
      if (!teamFormOpen) {
        editingCupTeam = "";
        teamLogoData = "";
        teamLogoRemoved = false;
      }
      render();
      return;
    }
    if (event.target.closest("#cancel-team")) {
      editingCupTeam = "";
      teamLogoData = "";
      teamLogoRemoved = false;
      teamFormOpen = false;
      render();
      return;
    }
    if (event.target.closest("#team-logo-add")) {
      var logoFile = document.getElementById("team-logo-file");
      if (logoFile) logoFile.click();
      return;
    }
    if (event.target.closest("#team-logo-edit")) {
      var preview = document.getElementById("team-logo-preview");
      if (preview && preview.getAttribute("src")) openTeamLogoEditor(preview.getAttribute("src"));
      return;
    }
    if (event.target.closest("#team-logo-remove")) {
      teamLogoData = "";
      teamLogoRemoved = true;
      paintTeamLogo();
      return;
    }
    var editTeam = event.target.closest("[data-edit-team]");
    if (editTeam) {
      editingCupTeam = editTeam.getAttribute("data-edit-team");
      teamLogoData = "";
      teamLogoRemoved = false;
      teamFormOpen = true;
      tournamentSheet = "equipos";
      render();
      return;
    }
    var moveTeam = event.target.closest("[data-move-team]");
    if (moveTeam) {
      moveCupTeam(moveTeam.getAttribute("data-move-team"), Number(moveTeam.getAttribute("data-move-dir")) || 0);
      return;
    }
    var removeTeam = event.target.closest("[data-remove-team]");
    if (removeTeam) {
      var teamId = removeTeam.getAttribute("data-remove-team");
      var removedTeam = cupTeamById(teamId);
      if (!removedTeam) return;
      askPartnerRemove("Quitar equipo", "¿Quitar el equipo " + removedTeam.name + "?", function () {
        saveCup({
          tournaments: cups,
          teams: cupTeams.filter(function (item) { return item.id !== teamId; }),
          matches: cupMatches.filter(function (item) { return item.team1Id !== teamId && item.team2Id !== teamId; })
        }, "Equipo eliminado.").then(function (result) {
          if (!result.ok) setStatus(result.data.error || "No se pudo quitar el equipo.");
          else {
            if (editingCupTeam === teamId) editingCupTeam = "";
            delete selectedCupTeams[teamId];
            render();
          }
        });
      }, "Esta acción quita el equipo, su logo y los partidos donde aparece.");
      return;
    }
    if (event.target.closest("#build-bracket")) {
      buildCupBracket();
      return;
    }
    if (event.target.closest("#build-selected-bracket")) {
      buildSelectedBracket();
      return;
    }
    if (event.target.closest("#match-columns-toggle")) {
      matchColumnsOpen = !matchColumnsOpen;
      saveMatchColumns();
      var matchColumns = document.querySelector(".match-board .roster-columns");
      var matchColumnsToggle = document.getElementById("match-columns-toggle");
      if (matchColumns) matchColumns.classList.toggle("is-collapsed", !matchColumnsOpen);
      if (matchColumnsToggle) {
        matchColumnsToggle.setAttribute("aria-expanded", matchColumnsOpen ? "true" : "false");
        matchColumnsToggle.setAttribute("aria-label", matchColumnsOpen ? "Ocultar columnas" : "Mostrar columnas");
      }
      return;
    }
    if (event.target.closest("#match-tools-toggle")) {
      matchToolsOpen = !matchToolsOpen;
      if (!matchToolsOpen) editingCupMatch = "";
      render();
      return;
    }
    if (event.target.closest("#cancel-match")) {
      editingCupMatch = "";
      matchToolsOpen = false;
      render();
      return;
    }
    var editMatch = event.target.closest("[data-edit-match]");
    if (editMatch) {
      editingCupMatch = editMatch.getAttribute("data-edit-match");
      matchToolsOpen = true;
      matchView = "lista";
      tournamentSheet = "partidos";
      render();
      return;
    }
    var removeMatch = event.target.closest("[data-remove-match]");
    if (removeMatch) {
      var matchId = removeMatch.getAttribute("data-remove-match");
      var removedMatch = cupMatchById(matchId);
      if (!removedMatch) return;
      askPartnerRemove("Quitar partido", "¿Quitar este partido?", function () {
        saveCup({
          tournaments: cups,
          teams: cupTeams,
          matches: cupMatches.filter(function (item) { return item.id !== matchId; })
        }, "Partido eliminado.").then(function (result) {
          if (!result.ok) setStatus(result.data.error || "No se pudo quitar el partido.");
          else {
            if (editingCupMatch === matchId) editingCupMatch = "";
            render();
          }
        });
      }, "Esta acción quita el partido. No se puede deshacer.");
      return;
    }
    var partnerPreview = event.target.closest("[data-preview-partner]");
    if (partnerPreview && partnerPhotoDialog) {
      var partnerSource = partnerPreview.querySelector("img");
      var partnerPhoto = partnerPhotoDialog.querySelector("[data-partner-photo]");
      if (partnerSource && partnerSource.getAttribute("src")) {
        partnerPhoto.alt = partnerPreview.getAttribute("data-preview-partner") || "";
        if (partnerPhoto.getAttribute("src") !== partnerSource.src) partnerPhoto.src = partnerSource.src;
        partnerPhotoDialog.showModal();
      }
      return;
    }
    if (event.target.closest("#squad-refresh")) {
      refreshSquad();
      return;
    }
    var squadTab = event.target.closest("[data-squad-sheet]");
    if (squadTab) {
      squadSheet = squadTab.getAttribute("data-squad-sheet");
      render();
      return;
    }
    if (event.target.closest("#add-location")) {
      openLocationForm("");
      return;
    }
    if (event.target.closest("#cancel-location")) {
      locationFormOpen = false;
      editingLocation = "";
      locationDraft = null;
      render();
      return;
    }
    if (event.target.closest("#add-location-session")) {
      captureLocationForm();
      locationDraft.sessions.push({ day: "1", time: "" });
      skipLocationCapture = true;
      render();
      return;
    }
    var removeSession = event.target.closest("[data-remove-session]");
    if (removeSession && locationDraft) {
      captureLocationForm();
      var sessionRow = removeSession.closest("[data-session-row]");
      var sessionRows = Array.prototype.slice.call(document.querySelectorAll("[data-session-row]"));
      var sessionIndex = sessionRows.indexOf(sessionRow);
      if (sessionIndex >= 0) locationDraft.sessions.splice(sessionIndex, 1);
      skipLocationCapture = true;
      render();
      return;
    }
    var editLocation = event.target.closest("[data-edit-location]");
    if (editLocation) {
      openLocationForm(editLocation.getAttribute("data-edit-location"));
      return;
    }
    var removeLocation = event.target.closest("[data-remove-location]");
    if (removeLocation) {
      var locationId = removeLocation.getAttribute("data-remove-location");
      var removedLocation = locationById(locationId);
      if (!removedLocation) return;
      askPartnerRemove("Quitar sede", "¿Quitar la sede " + removedLocation.team + "?", function () {
        if (locationDraft && locationDraft.id === locationId) {
          locationDraft = null;
          locationFormOpen = false;
          editingLocation = "";
        }
        var remaining = locations.filter(function (item) { return item.id !== locationId; });
        saveLocationList(remaining, "Sede eliminada.").then(function (result) {
          if (result && !result.ok) render();
        });
      }, "Esta acción quita la sede del mapa y del calendario. No se puede deshacer.");
      return;
    }
    if (event.target.closest("#add-benefit")) {
      openBenefitForm("");
      return;
    }
    if (event.target.closest("#cancel-benefit")) {
      discardBenefitDraft();
      render();
      return;
    }
    var editBenefit = event.target.closest("[data-edit-benefit]");
    if (editBenefit) {
      openBenefitForm(editBenefit.getAttribute("data-edit-benefit"));
      return;
    }
    var toggleBenefit = event.target.closest("[data-toggle-benefit]");
    if (toggleBenefit) {
      var toggleId = toggleBenefit.getAttribute("data-toggle-benefit");
      var toggled = benefitById(toggleId);
      if (!toggled) return;
      var nextVisible = toggled.visible === false;
      var toggledList = benefits.map(function (item) {
        if (item.id !== toggleId) return item;
        var copy = {};
        Object.keys(item).forEach(function (key) { copy[key] = item[key]; });
        copy.visible = nextVisible;
        return copy;
      });
      benefits = toggledList;
      saveBenefitList(benefits, nextVisible ? "El beneficio quedó visible." : "El beneficio quedó oculto.").then(function (result) {
        if (!result.ok) setStatus(result.data.error || "No se pudo guardar.");
        else render();
      });
      return;
    }
    var removeBenefit = event.target.closest("[data-remove-benefit]");
    if (removeBenefit) {
      var removeId = removeBenefit.getAttribute("data-remove-benefit");
      var removed = benefitById(removeId);
      if (!removed) return;
      askPartnerRemove("Quitar beneficio", "¿Quitar el beneficio " + removed.name + "?", function () {
        if (benefitDraft && benefitDraft.id === removeId) {
          benefitDraft = null;
          benefitFormOpen = false;
          editingBenefit = "";
        }
        delete selectedBenefits[removeId];
        benefits = benefits.filter(function (item) { return item.id !== removeId; });
        saveBenefitList(benefits, "Beneficio eliminado.").then(function (result) {
          if (!result.ok) setStatus(result.data.error || "No se pudo quitar.");
          else render();
        });
      });
      return;
    }
    if (event.target.id === "benefit-bulk-show") {
      applyPartnerVisibility("benefit", true);
      return;
    }
    if (event.target.id === "benefit-bulk-hide") {
      applyPartnerVisibility("benefit", false);
      return;
    }
    if (event.target.id === "benefit-bulk-delete") {
      var chosen = benefits.filter(function (item) { return selectedBenefits[item.id]; });
      if (!chosen.length) return;
      var question = chosen.length === 1 ? "¿Quitar el beneficio " + chosen[0].name + "?" : "¿Quitar " + chosen.length + " beneficios?";
      askPartnerRemove(chosen.length === 1 ? "Quitar beneficio" : "Quitar beneficios", question, function () {
        var drop = {};
        chosen.forEach(function (item) { drop[item.id] = true; });
        if (benefitDraft && drop[benefitDraft.id]) {
          benefitDraft = null;
          benefitFormOpen = false;
          editingBenefit = "";
        }
        selectedBenefits = {};
        benefits = benefits.filter(function (item) { return !drop[item.id]; });
        saveBenefitList(benefits, chosen.length === 1 ? "Beneficio eliminado." : "Beneficios eliminados.").then(function (result) {
          if (!result.ok) setStatus(result.data.error || "No se pudo quitar.");
          else render();
        });
      });
      return;
    }
    if (event.target.closest("#add-sponsor")) {
      openSponsorForm("");
      return;
    }
    if (event.target.closest("#cancel-sponsor")) {
      discardSponsorDraft();
      render();
      return;
    }
    var editSponsor = event.target.closest("[data-edit-sponsor]");
    if (editSponsor) {
      openSponsorForm(editSponsor.getAttribute("data-edit-sponsor"));
      return;
    }
    var toggleSponsor = event.target.closest("[data-toggle-sponsor]");
    if (toggleSponsor) {
      var sponsorToggleId = toggleSponsor.getAttribute("data-toggle-sponsor");
      var toggledSponsor = sponsorById(sponsorToggleId);
      if (!toggledSponsor) return;
      var sponsorVisible = toggledSponsor.visible === false;
      var sponsorList = sponsors.map(function (item) {
        if (item.id !== sponsorToggleId) return item;
        var copy = {};
        Object.keys(item).forEach(function (key) { copy[key] = item[key]; });
        copy.visible = sponsorVisible;
        return copy;
      });
      sponsors = sponsorList;
      saveSponsorList(sponsors, sponsorVisible ? "El patrocinador quedó visible." : "El patrocinador quedó oculto.").then(function (result) {
        if (!result.ok) setStatus(result.data.error || "No se pudo guardar.");
        else render();
      });
      return;
    }
    var removeSponsor = event.target.closest("[data-remove-sponsor]");
    if (removeSponsor) {
      var sponsorRemoveId = removeSponsor.getAttribute("data-remove-sponsor");
      var removedSponsor = sponsorById(sponsorRemoveId);
      if (!removedSponsor) return;
      askPartnerRemove("Quitar patrocinador", "¿Quitar el patrocinador " + removedSponsor.name + "?", function () {
        if (sponsorDraft && sponsorDraft.id === sponsorRemoveId) {
          sponsorDraft = null;
          sponsorFormOpen = false;
          editingSponsor = "";
        }
        delete selectedSponsors[sponsorRemoveId];
        sponsors = sponsors.filter(function (item) { return item.id !== sponsorRemoveId; });
        saveSponsorList(sponsors, "Patrocinador eliminado.").then(function (result) {
          if (!result.ok) setStatus(result.data.error || "No se pudo quitar.");
          else render();
        });
      });
      return;
    }
    if (event.target.id === "sponsor-bulk-show") {
      applyPartnerVisibility("sponsor", true);
      return;
    }
    if (event.target.id === "sponsor-bulk-hide") {
      applyPartnerVisibility("sponsor", false);
      return;
    }
    if (event.target.id === "sponsor-bulk-delete") {
      var chosenSponsors = sponsors.filter(function (item) { return selectedSponsors[item.id]; });
      if (!chosenSponsors.length) return;
      var sponsorQuestion = chosenSponsors.length === 1 ? "¿Quitar el patrocinador " + chosenSponsors[0].name + "?" : "¿Quitar " + chosenSponsors.length + " patrocinadores?";
      askPartnerRemove(chosenSponsors.length === 1 ? "Quitar patrocinador" : "Quitar patrocinadores", sponsorQuestion, function () {
        var sponsorDrop = {};
        chosenSponsors.forEach(function (item) { sponsorDrop[item.id] = true; });
        if (sponsorDraft && sponsorDrop[sponsorDraft.id]) {
          sponsorDraft = null;
          sponsorFormOpen = false;
          editingSponsor = "";
        }
        selectedSponsors = {};
        sponsors = sponsors.filter(function (item) { return !sponsorDrop[item.id]; });
        saveSponsorList(sponsors, chosenSponsors.length === 1 ? "Patrocinador eliminado." : "Patrocinadores eliminados.").then(function (result) {
          if (!result.ok) setStatus(result.data.error || "No se pudo quitar.");
          else render();
        });
      });
      return;
    }
    if (event.target.closest("[data-remove-sponsor-photo]") && sponsorDraft) {
      var droppedSponsorPhoto = sponsorDraft.photo;
      var sponsorDraftId = sponsorDraft.id;
      sponsorDraft.photo = "";
      paintSponsorPhoto();
      setSponsorPhotoStatus("");
      releaseSponsorFile(sponsorDraftId, droppedSponsorPhoto);
      return;
    }
    var sponsorDropZone = event.target.closest("#sponsor-photo-drop");
    if (sponsorDropZone && sponsorDraft && event.target.id !== "sponsor-photo-file") {
      document.getElementById("sponsor-photo-file").click();
      return;
    }
    if (event.target.closest("[data-remove-benefit-photo]") && benefitDraft) {
      var droppedPhoto = benefitDraft.photo;
      var draftId = benefitDraft.id;
      benefitDraft.photo = "";
      paintBenefitPhoto();
      setBenefitPhotoStatus("");
      releaseBenefitFile(draftId, droppedPhoto);
      return;
    }
    var benefitDrop = event.target.closest("#benefit-photo-drop");
    if (benefitDrop && benefitDraft && event.target.id !== "benefit-photo-file") {
      document.getElementById("benefit-photo-file").click();
      return;
    }
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
      if (tab === "beneficios" && nextTab !== "beneficios") discardBenefitDraft();
      if (tab === "patrocinadores" && nextTab !== "patrocinadores") discardSponsorDraft();
      tab = nextTab;
      if (nextTab !== "eventos") editingEvent = "";
      editingPlayer = "";
      setStatus("");
      render();
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

  app.addEventListener("change", function (event) {
    if (event.target.id === "sponsor-photo-file") {
      var sponsorFiles = Array.prototype.slice.call(event.target.files || []);
      event.target.value = "";
      addSponsorPhotos(sponsorFiles);
      return;
    }
    if (event.target.id !== "benefit-photo-file") return;
    var benefitFiles = Array.prototype.slice.call(event.target.files || []);
    event.target.value = "";
    addBenefitPhotos(benefitFiles);
  });

  app.addEventListener("dragover", function (event) {
    var sponsorZone = event.target.closest("#sponsor-photo-drop");
    if (sponsorZone && sponsorDraft) {
      event.preventDefault();
      sponsorZone.classList.add("is-over");
      return;
    }
    var benefitZone = event.target.closest("#benefit-photo-drop");
    if (!benefitZone || !benefitDraft) return;
    event.preventDefault();
    benefitZone.classList.add("is-over");
  });

  app.addEventListener("dragleave", function (event) {
    var sponsorZone = event.target.closest("#sponsor-photo-drop");
    if (sponsorZone && !sponsorZone.contains(event.relatedTarget)) sponsorZone.classList.remove("is-over");
    var benefitZone = event.target.closest("#benefit-photo-drop");
    if (!benefitZone || benefitZone.contains(event.relatedTarget)) return;
    benefitZone.classList.remove("is-over");
  });

  app.addEventListener("drop", function (event) {
    var sponsorZone = event.target.closest("#sponsor-photo-drop");
    if (sponsorZone && sponsorDraft) {
      event.preventDefault();
      sponsorZone.classList.remove("is-over");
      addSponsorPhotos(event.dataTransfer && event.dataTransfer.files);
      return;
    }
    var benefitZone = event.target.closest("#benefit-photo-drop");
    if (!benefitZone || !benefitDraft) return;
    event.preventDefault();
    benefitZone.classList.remove("is-over");
    addBenefitPhotos(event.dataTransfer && event.dataTransfer.files);
  });

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

  var sponsorEditTimer = 0;
  var benefitEditTimer = 0;

  function rowCanSave(item) {
    if (!item || !String(item.name || "").trim()) return false;
    if (item.link && !/^https?:\/\//i.test(item.link)) return false;
    return true;
  }

  function scheduleSponsorSave() {
    clearTimeout(sponsorEditTimer);
    sponsorEditTimer = setTimeout(function () {
      captureSponsorEdits();
      var dirty = false;
      var invalid = false;
      sponsors.forEach(function (item) {
        var now = item.name + "\n" + (item.link || "");
        if ((sponsorSaved[item.id] || "") === now) return;
        dirty = true;
        if (!rowCanSave(item)) invalid = true;
      });
      if (!dirty || invalid) {
        if (invalid) setStatus("Revisa el nombre y el enlace. El enlace debe empezar por https://.");
        return;
      }
      saveSponsorList(sponsors, "Patrocinador actualizado.");
    }, 400);
  }

  function scheduleBenefitSave() {
    clearTimeout(benefitEditTimer);
    benefitEditTimer = setTimeout(function () {
      captureBenefitEdits();
      var dirty = false;
      var invalid = false;
      benefits.forEach(function (item) {
        var now = item.name + "\n" + (item.link || "");
        if ((benefitSaved[item.id] || "") === now) return;
        dirty = true;
        if (!rowCanSave(item)) invalid = true;
      });
      if (!dirty || invalid) {
        if (invalid) setStatus("Revisa el nombre y el enlace. El enlace debe empezar por https://.");
        return;
      }
      saveBenefitList(benefits, "Beneficio actualizado.");
    }, 400);
  }

  app.addEventListener("input", function (event) {
    var matchFilter = event.target.closest("[data-match-filter]");
    if (matchFilter && matchFilter.tagName !== "SELECT") {
      matchFilters[matchFilter.getAttribute("data-match-filter")] = matchFilter.value;
      var matchHead = matchFilter.closest("th");
      if (matchHead) matchHead.classList.toggle("is-filtered", matchFilter.value.trim() !== "");
      paintMatchRows();
      return;
    }
    var sponsorNameInput = event.target.closest("[data-sponsor-name]");
    if (sponsorNameInput) {
      var namedSponsor = sponsorById(sponsorNameInput.getAttribute("data-sponsor-name"));
      if (namedSponsor) namedSponsor.name = sponsorNameInput.value;
      scheduleSponsorSave();
      return;
    }
    var sponsorLinkInput = event.target.closest("[data-sponsor-link]");
    if (sponsorLinkInput) {
      var linkedSponsor = sponsorById(sponsorLinkInput.getAttribute("data-sponsor-link"));
      if (linkedSponsor) linkedSponsor.link = sponsorLinkInput.value;
      scheduleSponsorSave();
      return;
    }
    var benefitNameInput = event.target.closest("[data-benefit-name]");
    if (benefitNameInput) {
      var namedBenefit = benefitById(benefitNameInput.getAttribute("data-benefit-name"));
      if (namedBenefit) namedBenefit.name = benefitNameInput.value;
      scheduleBenefitSave();
      return;
    }
    var benefitLinkInput = event.target.closest("[data-benefit-link]");
    if (benefitLinkInput) {
      var linkedBenefit = benefitById(benefitLinkInput.getAttribute("data-benefit-link"));
      if (linkedBenefit) linkedBenefit.link = benefitLinkInput.value;
      scheduleBenefitSave();
      return;
    }
    if (event.target.form && event.target.form.id === "sponsor-form" && sponsorDraft) {
      if (event.target.name === "name") sponsorDraft.formName = event.target.value;
      if (event.target.name === "link") sponsorDraft.formLink = event.target.value;
    }
    if (event.target.form && event.target.form.id === "benefit-form" && benefitDraft) {
      if (event.target.name === "name") benefitDraft.formName = event.target.value;
      if (event.target.name === "link") benefitDraft.formLink = event.target.value;
    }
    var sponsorFilter = event.target.closest("[data-sponsor-filter]");
    if (sponsorFilter && sponsorFilter.tagName !== "SELECT") {
      sponsorFilters[sponsorFilter.getAttribute("data-sponsor-filter")] = sponsorFilter.value;
      var sponsorHead = sponsorFilter.closest("th");
      if (sponsorHead) sponsorHead.classList.toggle("is-filtered", sponsorFilter.value.trim() !== "");
      paintSponsorRows();
      return;
    }
    var locationFilter = event.target.closest("[data-location-filter]");
    if (locationFilter && locationFilter.tagName !== "SELECT") {
      locationFilters[locationFilter.getAttribute("data-location-filter")] = locationFilter.value;
      var locationHead = locationFilter.closest("th");
      if (locationHead) locationHead.classList.toggle("is-filtered", locationFilter.value.trim() !== "");
      paintLocationRows();
      return;
    }
    var benefitFilter = event.target.closest("[data-benefit-filter]");
    if (benefitFilter && benefitFilter.tagName !== "SELECT") {
      benefitFilters[benefitFilter.getAttribute("data-benefit-filter")] = benefitFilter.value;
      var benefitHead = benefitFilter.closest("th");
      if (benefitHead) benefitHead.classList.toggle("is-filtered", benefitFilter.value.trim() !== "");
      paintBenefitRows();
      return;
    }
    var filter = event.target.closest("[data-filter]");
    if (filter) applyRosterFilter(filter);
  });

  app.addEventListener("focusout", function (event) {
    var sponsorField = event.target.closest("[data-sponsor-name], [data-sponsor-link]");
    if (sponsorField) {
      var sponsorFieldId = sponsorField.getAttribute("data-sponsor-name") || sponsorField.getAttribute("data-sponsor-link");
      setTimeout(function () {
        captureSponsorEdits();
        var sponsorFieldItem = sponsorById(sponsorFieldId);
        if (!sponsorFieldItem) return;
        var sponsorNow = sponsorFieldItem.name + "\n" + (sponsorFieldItem.link || "");
        if (sponsorSaved[sponsorFieldId] === sponsorNow) return;
        if (!String(sponsorFieldItem.name || "").trim()) {
          setStatus("Escribe el nombre del patrocinador.");
          return;
        }
        if (sponsorFieldItem.link && !/^https?:\/\//i.test(sponsorFieldItem.link)) {
          setStatus("El enlace debe empezar por https://.");
          return;
        }
        saveSponsorList(sponsors, "Patrocinador actualizado.");
      }, 0);
      return;
    }
    var benefitField = event.target.closest("[data-benefit-name], [data-benefit-link]");
    if (!benefitField) return;
    var benefitFieldId = benefitField.getAttribute("data-benefit-name") || benefitField.getAttribute("data-benefit-link");
    setTimeout(function () {
      captureBenefitEdits();
      var benefitFieldItem = benefitById(benefitFieldId);
      if (!benefitFieldItem) return;
      var benefitNow = benefitFieldItem.name + "\n" + (benefitFieldItem.link || "");
      if (benefitSaved[benefitFieldId] === benefitNow) return;
      if (!String(benefitFieldItem.name || "").trim()) {
        setStatus("Escribe el nombre del beneficio.");
        return;
      }
      if (benefitFieldItem.link && !/^https?:\/\//i.test(benefitFieldItem.link)) {
        setStatus("El enlace debe empezar por https://.");
        return;
      }
      saveBenefitList(benefits, "Beneficio actualizado.");
    }, 0);
  });

  app.addEventListener("change", function (event) {
    var matchColumnBox = event.target.closest("[data-match-column]");
    if (matchColumnBox) {
      var matchColumnKey = matchColumnBox.getAttribute("data-match-column");
      var matchVisible = matchShownColumns().length;
      if (!matchColumnBox.checked && matchVisible <= 1) {
        matchColumnBox.checked = true;
        setStatus("Deja al menos una columna visible.");
        return;
      }
      if (matchColumnBox.checked) delete hiddenMatchColumns[matchColumnKey];
      else hiddenMatchColumns[matchColumnKey] = true;
      saveMatchColumns();
      if (status.textContent === "Deja al menos una columna visible.") setStatus("");
      render();
      return;
    }
    if (event.target.id === "bracket-cup" || event.target.id === "standings-cup") {
      bracketCup = event.target.value;
      var board = document.getElementById("bracket-board");
      var standings = document.getElementById("standings-board");
      if (board) board.innerHTML = bracketCup ? bracketBoard(bracketCup) : "<p class=\"bracket-empty\">Agrega un torneo para ver el cuadro.</p>";
      if (standings) standings.innerHTML = bracketCup ? standingsBoard(bracketCup) : "<p class=\"bracket-empty\">Agrega un torneo para ver la tabla.</p>";
      return;
    }
    var scoreInput = event.target.closest("[data-score-match]");
    if (scoreInput) {
      var scoreCell = scoreInput.closest(".score-cell");
      if (scoreInput.hasAttribute("data-score-penalties")) {
        var shootout = scoreCell && scoreCell.querySelector(".is-shootout");
        if (shootout) shootout.hidden = !scoreInput.checked;
      }
      if (scoreCell && scoreInput.hasAttribute("data-score-withdrawal")) {
        var sideSelect = scoreCell.querySelector("[data-withdrawal-side]");
        if (sideSelect) sideSelect.hidden = !scoreInput.checked;
        if (scoreInput.checked) {
          var postBox = scoreCell.querySelector("[data-score-postponed]");
          var postNote = scoreCell.querySelector("[data-postpone-note]");
          if (postBox) postBox.checked = false;
          if (postNote) postNote.hidden = true;
        }
      }
      if (scoreCell && scoreInput.hasAttribute("data-score-postponed")) {
        var noteField = scoreCell.querySelector("[data-postpone-note]");
        if (noteField) noteField.hidden = !scoreInput.checked;
        if (scoreInput.checked) {
          var withdrawalToggle = scoreCell.querySelector("[data-score-withdrawal]");
          var withdrawalSide = scoreCell.querySelector("[data-withdrawal-side]");
          if (withdrawalToggle) withdrawalToggle.checked = false;
          if (withdrawalSide) withdrawalSide.hidden = true;
        }
      }
      saveMatchScore(scoreInput.getAttribute("data-score-match"));
      return;
    }
    var matchSelect = event.target.closest("select[data-match-filter]");
    if (matchSelect) {
      matchFilters[matchSelect.getAttribute("data-match-filter")] = matchSelect.value;
      var matchSelectHead = matchSelect.closest("th");
      if (matchSelectHead) matchSelectHead.classList.toggle("is-filtered", matchSelect.value !== "");
      paintMatchRows();
      return;
    }
    if (event.target.id === "selected-tournament") {
      selectedBracketTournament = event.target.value;
      return;
    }
    if (event.target.id === "team-select-all") {
      var teamMark = event.target.checked;
      cupTeams.forEach(function (team) {
        if (teamMark) selectedCupTeams[team.id] = true;
        else delete selectedCupTeams[team.id];
      });
      document.querySelectorAll("[data-select-team]").forEach(function (box) {
        var teamOn = Boolean(selectedCupTeams[box.getAttribute("data-select-team")]);
        box.checked = teamOn;
        var teamRow = box.closest("tr");
        if (teamRow) teamRow.classList.toggle("is-selected", teamOn);
      });
      paintTeamBracket();
      return;
    }
    var teamBox = event.target.closest("[data-select-team]");
    if (teamBox) {
      var pickedTeam = teamBox.getAttribute("data-select-team");
      if (teamBox.checked) selectedCupTeams[pickedTeam] = true;
      else delete selectedCupTeams[pickedTeam];
      var pickedRow = teamBox.closest("tr");
      if (pickedRow) pickedRow.classList.toggle("is-selected", teamBox.checked);
      paintTeamBracket();
      return;
    }
    if (event.target.id === "sponsor-select-all") {
      var sponsorMark = event.target.checked;
      visibleSponsors().forEach(function (item) {
        if (sponsorMark) selectedSponsors[item.id] = true;
        else delete selectedSponsors[item.id];
      });
      paintSponsorRows();
      return;
    }
    var sponsorBox = event.target.closest("[data-select-sponsor]");
    if (sponsorBox) {
      var sponsorId = sponsorBox.getAttribute("data-select-sponsor");
      if (sponsorBox.checked) selectedSponsors[sponsorId] = true;
      else delete selectedSponsors[sponsorId];
      var sponsorRow = sponsorBox.closest("tr");
      if (sponsorRow) sponsorRow.classList.toggle("is-selected", sponsorBox.checked);
      syncSponsorSelection();
      return;
    }
    var sponsorPhotoFilter = event.target.closest("select[data-sponsor-filter]");
    if (sponsorPhotoFilter) {
      sponsorFilters.photo = sponsorPhotoFilter.value;
      var sponsorPhotoHead = sponsorPhotoFilter.closest("th");
      if (sponsorPhotoHead) sponsorPhotoHead.classList.toggle("is-filtered", sponsorPhotoFilter.value !== "");
      paintSponsorRows();
      return;
    }
    if (event.target.id === "benefit-select-all") {
      var mark = event.target.checked;
      visibleBenefits().forEach(function (item) {
        if (mark) selectedBenefits[item.id] = true;
        else delete selectedBenefits[item.id];
      });
      paintBenefitRows();
      return;
    }
    var benefitBox = event.target.closest("[data-select-benefit]");
    if (benefitBox) {
      var benefitId = benefitBox.getAttribute("data-select-benefit");
      if (benefitBox.checked) selectedBenefits[benefitId] = true;
      else delete selectedBenefits[benefitId];
      var benefitRow = benefitBox.closest("tr");
      if (benefitRow) benefitRow.classList.toggle("is-selected", benefitBox.checked);
      syncBenefitSelection();
      return;
    }
    var locationDayFilter = event.target.closest("select[data-location-filter]");
    if (locationDayFilter) {
      locationFilters.day = locationDayFilter.value;
      var locationDayHead = locationDayFilter.closest("th");
      if (locationDayHead) locationDayHead.classList.toggle("is-filtered", locationDayFilter.value !== "");
      paintLocationRows();
      return;
    }
    var benefitPhotoFilter = event.target.closest("select[data-benefit-filter]");
    if (benefitPhotoFilter) {
      benefitFilters.photo = benefitPhotoFilter.value;
      var photoHead = benefitPhotoFilter.closest("th");
      if (photoHead) photoHead.classList.toggle("is-filtered", benefitPhotoFilter.value !== "");
      paintBenefitRows();
      return;
    }
    var filter = event.target.closest("select[data-filter], input[type=\"date\"][data-filter]");
    if (filter) applyRosterFilter(filter);
  });

  function reorderPartners(kind, fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    var source = kind === "sponsor" ? sponsors : benefits;
    var fromIndex = -1;
    var toIndex = -1;
    source.forEach(function (item, index) {
      if (item.id === fromId) fromIndex = index;
      if (item.id === toId) toIndex = index;
    });
    if (fromIndex < 0 || toIndex < 0) return;
    var next = source.slice();
    var moved = next.splice(fromIndex, 1)[0];
    next.splice(toIndex, 0, moved);
    var done = function (result) {
      if (!result.ok) setStatus(result.data.error || "No se pudo guardar el orden.");
      else if (kind === "sponsor") paintSponsorRows();
      else paintBenefitRows();
      var handle = document.querySelector("[data-drag-partner=\"" + kind + "\"][data-partner-id=\"" + fromId + "\"]");
      if (handle) handle.focus();
    };
    if (kind === "sponsor") {
      sponsors = next;
      saveSponsorList(sponsors, "Orden actualizado.").then(done);
    } else {
      benefits = next;
      saveBenefitList(benefits, "Orden actualizado.").then(done);
    }
  }

  app.addEventListener("dragstart", function (event) {
    var partnerHandle = event.target.closest("[data-drag-partner]");
    if (partnerHandle) {
      dragColumn = "";
      dragPartner = {
        kind: partnerHandle.getAttribute("data-drag-partner"),
        id: partnerHandle.getAttribute("data-partner-id")
      };
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", dragPartner.id);
      }
      var partnerRow = partnerHandle.closest("tr");
      if (partnerRow) partnerRow.classList.add("is-dragging");
      return;
    }
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
    if (dragPartner) {
      var partnerRow = event.target.closest("tr[data-partner-row=\"" + dragPartner.kind + "\"]");
      if (!partnerRow) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      document.querySelectorAll(".benefit-table tr.is-drop-target").forEach(function (el) {
        if (el !== partnerRow) el.classList.remove("is-drop-target");
      });
      if (partnerRow.getAttribute("data-partner-id") !== dragPartner.id) partnerRow.classList.add("is-drop-target");
      return;
    }
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
    if (dragPartner) {
      var partnerRow = event.target.closest("tr[data-partner-row=\"" + dragPartner.kind + "\"]");
      if (!partnerRow) return;
      event.preventDefault();
      var moving = dragPartner;
      dragPartner = null;
      document.querySelectorAll(".is-dragging, .is-drop-target").forEach(function (el) {
        el.classList.remove("is-dragging", "is-drop-target");
      });
      reorderPartners(moving.kind, moving.id, partnerRow.getAttribute("data-partner-id"));
      return;
    }
    var cell = columnTarget(event.target);
    if (!cell || !dragColumn) return;
    event.preventDefault();
    var from = dragColumn;
    dragColumn = "";
    moveColumn(from, cell.getAttribute("data-column"), false);
  });

  app.addEventListener("dragend", function () {
    dragColumn = "";
    dragPartner = null;
    document.querySelectorAll(".is-dragging, .is-drop-target").forEach(function (el) {
      el.classList.remove("is-dragging", "is-drop-target");
    });
  });

  app.addEventListener("keydown", function (event) {
    var partnerHandle = event.target.closest("[data-drag-partner]");
    if (partnerHandle && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      var kind = partnerHandle.getAttribute("data-drag-partner");
      var id = partnerHandle.getAttribute("data-partner-id");
      var shown = kind === "sponsor" ? visibleSponsors() : visibleBenefits();
      var index = -1;
      shown.forEach(function (item, itemIndex) { if (item.id === id) index = itemIndex; });
      var target = shown[index + (event.key === "ArrowUp" ? -1 : 1)];
      if (target) reorderPartners(kind, id, target.id);
      return;
    }
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
    if (event.target.id === "cup-form") {
      event.preventDefault();
      submitCup(event.target);
      return;
    }
    if (event.target.id === "team-form") {
      event.preventDefault();
      submitCupTeam(event.target);
      return;
    }
    if (event.target.id === "match-form") {
      event.preventDefault();
      submitCupMatch(event.target);
      return;
    }
    if (event.target.id === "location-form") {
      event.preventDefault();
      submitLocation(event.target);
      return;
    }
    if (event.target.id === "sponsor-form") {
      event.preventDefault();
      submitSponsor(event.target);
      return;
    }
    if (event.target.id === "benefit-form") {
      event.preventDefault();
      submitBenefit(event.target);
      return;
    }
    if (event.target.id === "analytics-form") {
      event.preventDefault();
      saveAnalytics(event.target);
      return;
    }
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
  var pendingPartnerRemove = null;
  var removePartnerDialog = document.getElementById("remove-partner-dialog");
  function saveLocationList(list, message) {
    return api("/api/admin/locations", "PUT", { locations: list }).then(function (result) {
      if (!result.ok) {
        setStatus(result.data.error || "No se pudo guardar la sede.");
        return result;
      }
      locations = result.data.locations || [];
      setStatus(message || "");
      render();
      return result;
    });
  }

  function askPartnerRemove(title, copy, action, note) {
    pendingPartnerRemove = action;
    document.getElementById("remove-partner-title").textContent = title;
    document.getElementById("remove-partner-copy").textContent = copy;
    document.getElementById("remove-partner-note").textContent = note || "Esta acción quita el registro y su foto. No se puede deshacer.";
    removePartnerDialog.showModal();
  }
  document.getElementById("cancel-remove-partner").addEventListener("click", function () {
    pendingPartnerRemove = null;
    removePartnerDialog.close();
  });
  removePartnerDialog.addEventListener("cancel", function () { pendingPartnerRemove = null; });
  document.getElementById("confirm-remove-partner").addEventListener("click", function () {
    var action = pendingPartnerRemove;
    pendingPartnerRemove = null;
    removePartnerDialog.close();
    if (action) action();
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

  var logoImage = null;
  var logoZoom = 1;
  var logoX = 0;
  var logoY = 0;
  var logoDrag = null;
  var logoBox = 320;

  function logoCover() {
    return Math.max(logoBox / logoImage.width, logoBox / logoImage.height);
  }

  function paintTeamLogoEditor() {
    var canvas = document.getElementById("team-logo-canvas");
    if (!canvas || !logoImage) return;
    var context = canvas.getContext("2d");
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = logoBox * ratio;
    canvas.height = logoBox * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    var scale = logoCover() * logoZoom;
    var width = logoImage.width * scale;
    var height = logoImage.height * scale;
    var minX = logoBox - width;
    var minY = logoBox - height;
    if (logoX > 0) logoX = 0;
    if (logoY > 0) logoY = 0;
    if (logoX < minX) logoX = minX;
    if (logoY < minY) logoY = minY;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, logoBox, logoBox);
    context.drawImage(logoImage, logoX, logoY, width, height);
  }

  function setTeamLogoZoom(next) {
    if (!logoImage) return;
    var zoom = Math.min(3, Math.max(1, next));
    var oldScale = logoCover() * logoZoom;
    var nextScale = logoCover() * zoom;
    var centerX = (logoBox / 2 - logoX) / oldScale;
    var centerY = (logoBox / 2 - logoY) / oldScale;
    logoZoom = zoom;
    logoX = logoBox / 2 - centerX * nextScale;
    logoY = logoBox / 2 - centerY * nextScale;
    var slider = document.getElementById("team-logo-zoom");
    if (slider) slider.value = String(zoom);
    paintTeamLogoEditor();
  }

  function openTeamLogoEditor(src) {
    var image = new Image();
    image.onload = function () {
      logoImage = image;
      logoZoom = 1;
      logoX = 0;
      logoY = 0;
      paintTeamLogoEditor();
      var slider = document.getElementById("team-logo-zoom");
      if (slider) slider.value = "1";
      var status = document.getElementById("team-logo-editor-status");
      if (status) status.textContent = "";
      var dialog = document.getElementById("team-logo-dialog");
      if (dialog && !dialog.open) dialog.showModal();
    };
    image.onerror = function () {
      var status = document.getElementById("team-logo-status");
      if (status) status.textContent = "El logo no se pudo abrir.";
    };
    image.src = src;
  }

  function closeTeamLogoEditor() {
    logoImage = null;
    logoDrag = null;
    var dialog = document.getElementById("team-logo-dialog");
    if (dialog && dialog.open) dialog.close();
  }

  function applyTeamLogoEdit() {
    if (!logoImage) return;
    var scale = logoCover() * logoZoom;
    var sourceX = Math.max(0, -logoX / scale);
    var sourceY = Math.max(0, -logoY / scale);
    var sourceSize = logoBox / scale;
    var output = document.createElement("canvas");
    output.width = 800;
    output.height = 800;
    var context = output.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 800, 800);
    context.drawImage(logoImage, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 800, 800);
    teamLogoData = output.toDataURL("image/jpeg", 0.8);
    teamLogoRemoved = false;
    closeTeamLogoEditor();
    paintTeamLogo();
    var status = document.getElementById("team-logo-status");
    if (status) status.textContent = "Logo listo. Guarda el equipo para publicarlo.";
  }

  var teamLogoCanvas = document.getElementById("team-logo-canvas");
  teamLogoCanvas.addEventListener("pointerdown", function (event) {
    if (!logoImage) return;
    logoDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: logoX, oy: logoY };
    teamLogoCanvas.setPointerCapture(event.pointerId);
  });
  teamLogoCanvas.addEventListener("pointermove", function (event) {
    if (!logoDrag || event.pointerId !== logoDrag.id) return;
    logoX = logoDrag.ox + (event.clientX - logoDrag.x);
    logoY = logoDrag.oy + (event.clientY - logoDrag.y);
    paintTeamLogoEditor();
  });
  teamLogoCanvas.addEventListener("pointerup", function () { logoDrag = null; });
  teamLogoCanvas.addEventListener("pointercancel", function () { logoDrag = null; });
  document.getElementById("team-logo-zoom").addEventListener("input", function (event) {
    setTeamLogoZoom(Number(event.target.value) || 1);
  });
  document.getElementById("team-logo-zoom-out").addEventListener("click", function () { setTeamLogoZoom(logoZoom - 0.15); });
  document.getElementById("team-logo-zoom-in").addEventListener("click", function () { setTeamLogoZoom(logoZoom + 0.15); });
  document.getElementById("apply-team-logo").addEventListener("click", applyTeamLogoEdit);
  document.getElementById("close-team-logo").addEventListener("click", closeTeamLogoEditor);

  api("/api/session", "GET").then(function (result) {
    if (!result.ok) return;
    csrf = result.data.csrf;
    totpEnabled = Boolean(result.data.totpEnabled);
    loadClub().then(openApp).catch(openLogin);
  });
})();
