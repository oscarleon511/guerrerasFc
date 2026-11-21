(function () {
  var csrf = "";
  var tab = "inicio";
  var settings = null;
  var events = [];
  var players = [];
  var editingEvent = "";
  var editingPlayer = "";
  var rosterOpen = true;
  var rosterFilters = {};
  var rosterSort = { key: "", dir: "" };

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
    ["sede", "Sede de Entrenamiento"],
    ["category", "Categoria"],
    ["extra", "Categorias Adicionales"]
  ];

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

  function paintNav(container, items) {
    container.innerHTML = items.map(function (item) {
      var current = item.id === tab ? " aria-current=\"page\"" : "";
      return "<button type=\"button\" data-tab=\"" + item.id + "\"" + current + ">" + item.label + "</button>";
    }).join("");
  }

  function paintNavs() {
    paintNav(document.getElementById("site-tabs"), siteTabs);
    paintNav(document.getElementById("club-tabs"), clubTabs);
    title.textContent = tabMeta(tab).label;
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

  function eventForm() {
    var current = events.filter(function (item) { return item.id === editingEvent; })[0] || { name: "", date: "", time: "", place: "", note: "" };
    return "<form id=\"event-form\" class=\"form-grid\"><label class=\"field wide\">Nombre<input name=\"name\" required maxlength=\"80\" value=\"" + escapeHtml(current.name) + "\"></label><label class=\"field\">Fecha<input name=\"date\" type=\"date\" required value=\"" + escapeHtml(current.date) + "\"></label><label class=\"field\">Hora<input name=\"time\" type=\"time\" value=\"" + escapeHtml(current.time) + "\"></label><label class=\"field wide\">Lugar<input name=\"place\" maxlength=\"120\" value=\"" + escapeHtml(current.place) + "\"></label><label class=\"field wide\">Nota<textarea name=\"note\" maxlength=\"500\" rows=\"3\">" + escapeHtml(current.note) + "</textarea></label><div class=\"wide admin-actions\"><button class=\"btn\" type=\"submit\">" + (editingEvent ? "Guardar evento" : "Agregar evento") + "</button>" + (editingEvent ? "<button class=\"btn btn-ghost\" type=\"button\" id=\"cancel-event\">Cancelar</button>" : "") + "</div></form>";
  }

  function eventsPanel() {
    var list = events.length ? events.map(function (item) {
      var when = item.date + (item.time ? " · " + item.time : "");
      return "<article class=\"record\"><div><strong>" + escapeHtml(item.name) + "</strong><p>" + escapeHtml(when) + (item.place ? " · " + escapeHtml(item.place) : "") + "</p></div><div class=\"record-actions\"><button class=\"btn btn-ghost\" type=\"button\" data-edit-event=\"" + escapeHtml(item.id) + "\">Editar</button><button class=\"btn btn-ghost\" type=\"button\" data-delete-event=\"" + escapeHtml(item.id) + "\">Quitar</button></div></article>";
    }).join("") : "<p>No hay eventos.</p>";
    return "<article class=\"panel-card\"><p>Eventos internos del club. No se publican en el sitio.</p>" + eventForm() + "<div class=\"record-list\">" + list + "</div></article>";
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

  function playerForm() {
    return "<form id=\"player-form\" class=\"form-grid roster-form\"><label class=\"field\">Nombre completo<input name=\"name\" required maxlength=\"80\"></label><label class=\"field\">Apodo<input name=\"nickname\" maxlength=\"40\"></label><label class=\"field\">Posición<select name=\"position\">" + selectOptions(positions, "") + "</select></label><label class=\"field\">Edad<input name=\"age\" type=\"number\" min=\"1\" max=\"120\" required></label><label class=\"field\">País<input name=\"country\" maxlength=\"60\"></label><label class=\"field\">Ciudad<input name=\"city\" maxlength=\"80\"></label><label class=\"field\">Teléfono<input name=\"phone\" type=\"tel\" maxlength=\"40\"></label><label class=\"field\">Sede de entrenamiento<select name=\"sede\">" + selectOptions(sedes, "") + "</select></label><label class=\"field\">Categoría<select name=\"category\">" + selectOptions(categories, "") + "</select></label><label class=\"field\">Categorías adicionales<select name=\"extra\">" + selectOptions(extras, "") + "</select></label><div class=\"admin-actions\"><button class=\"btn\" type=\"submit\">Agregar jugadora</button></div></form>";
  }

  function rosterEditor(column, item) {
    var key = column[0];
    var value = item[key] == null ? "" : item[key];
    if (key === "position") return "<select class=\"roster-cell\" data-field=\"position\">" + selectOptions(positions, value) + "</select>";
    if (key === "sede") return "<select class=\"roster-cell\" data-field=\"sede\">" + selectOptions(sedes, value) + "</select>";
    if (key === "category") return "<select class=\"roster-cell\" data-field=\"category\">" + selectOptions(categories, value) + "</select>";
    if (key === "extra") return "<select class=\"roster-cell\" data-field=\"extra\">" + selectOptions(extras, value) + "</select>";
    if (key === "age") return "<input class=\"roster-cell\" data-field=\"age\" type=\"number\" min=\"1\" max=\"120\" required value=\"" + escapeHtml(value) + "\">";
    var max = key === "name" ? 80 : key === "nickname" || key === "phone" ? 40 : key === "country" ? 60 : 80;
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

  function visiblePlayers() {
    var filtered = players.filter(function (item) {
      return columns.every(function (column) {
        var query = String(rosterFilters[column[0]] || "").trim();
        if (!query) return true;
        return foldText(item[column[0]]).indexOf(foldText(query)) !== -1;
      });
    });
    if (!rosterSort.key) return filtered;
    var key = rosterSort.key;
    var dir = rosterSort.dir === "desc" ? -1 : 1;
    return filtered.slice().sort(function (a, b) {
      var aEmpty = String(a[key] == null ? "" : a[key]).trim() === "";
      var bEmpty = String(b[key] == null ? "" : b[key]).trim() === "";
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (key === "age") return (Number(a.age) - Number(b.age)) * dir;
      return String(a[key]).localeCompare(String(b[key]), "es", { sensitivity: "base", numeric: true }) * dir;
    });
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
      var cells = columns.map(function (column) {
        var marked = duplicate && (column[0] === "name" || column[0] === "age");
        var content = editing ? rosterEditor(column, item) : escapeHtml(item[column[0]]);
        return "<td" + (marked ? " class=\"is-duplicate\" title=\"Nombre y edad repetidos\"" : "") + ">" + content + "</td>";
      }).join("");
      var actions = editing
        ? "<button class=\"btn\" type=\"button\" data-save-player=\"" + escapeHtml(item.id) + "\">Guardar</button><button class=\"btn btn-ghost\" type=\"button\" data-cancel-edit>Cancelar</button>"
        : "<button class=\"btn btn-ghost\" type=\"button\" data-edit-player=\"" + escapeHtml(item.id) + "\">Editar</button><button class=\"btn btn-ghost\" type=\"button\" data-delete-player=\"" + escapeHtml(item.id) + "\">Quitar</button>";
      return "<tr" + (editing ? " class=\"is-editing\"" : "") + ">" + cells + "<td class=\"roster-actions\">" + actions + "</td></tr>";
    }).join("");
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
    document.querySelectorAll("[data-sort]").forEach(function (button) {
      var key = button.getAttribute("data-sort");
      var state = rosterSortState(key);
      button.parentNode.setAttribute("aria-sort", state);
      button.querySelector(".roster-arrow").textContent = rosterArrow(key);
    });
  }

  function playersPanel() {
    var rows = visiblePlayers();
    var head = columns.map(function (column) {
      var state = rosterSortState(column[0]);
      return "<th aria-sort=\"" + state + "\"><button type=\"button\" class=\"roster-sort\" data-sort=\"" + column[0] + "\"><span>" + escapeHtml(column[1]) + "</span><span class=\"roster-arrow\" aria-hidden=\"true\">" + rosterArrow(column[0]) + "</span></button><input class=\"roster-filter\" data-filter=\"" + column[0] + "\" type=\"search\" placeholder=\"Filtrar\" aria-label=\"Filtrar " + escapeHtml(column[1]) + "\" value=\"" + escapeHtml(rosterFilters[column[0]] || "") + "\"></th>";
    }).join("") + "<th>Acciones</th>";
    var emptyText = !players.length ? "No hay jugadoras." : "Ninguna jugadora coincide con el filtro.";
    var emptyHidden = rows.length ? " hidden" : "";
    return "<section class=\"roster-layout" + (rosterOpen ? " is-open" : "") + "\"><div class=\"roster-side panel-card\"><button type=\"button\" class=\"roster-toggle\" id=\"roster-toggle\" aria-expanded=\"" + (rosterOpen ? "true" : "false") + "\" aria-controls=\"roster-body\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path></svg>Agregar jugadora</button><div id=\"roster-body\"" + (rosterOpen ? "" : " hidden") + "><p>La plantilla pública con fotos no cambia.</p>" + playerForm() + "<div class=\"drop-zone\" id=\"roster-drop\"><p>Suelta el Excel aquí o elige un archivo.</p><div class=\"admin-actions\"><label class=\"btn\" for=\"roster-file\">Elegir Excel</label><a class=\"btn btn-ghost\" href=\"/api/admin/roster/template\">Descargar plantilla</a></div><input id=\"roster-file\" type=\"file\" accept=\".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\" hidden></div></div></div><div class=\"roster-grid panel-card\"><p>Las celdas en rojo repiten el mismo nombre completo y la misma edad.</p><div class=\"roster-frame\"><div class=\"roster-scroll\"><table><thead><tr>" + head + "</tr></thead><tbody id=\"roster-rows\">" + rosterRowHtml(rows) + "</tbody></table></div><p id=\"roster-empty\" class=\"roster-empty\"" + emptyHidden + ">" + emptyText + "</p></div></div></section>";
  }

  function render() {
    paintNavs();
    var site = siteTabs.filter(function (item) { return item.id === tab; })[0];
    if (site) {
      panel.innerHTML = sitePanel(site);
      return;
    }
    if (tab === "eventos") panel.innerHTML = eventsPanel();
    else if (tab === "jugadoras") panel.innerHTML = playersPanel();
    else panel.innerHTML = "<article class=\"panel-card\"><p>Cargando visitas…</p></article>";
  }

  function openApp() {
    login.hidden = true;
    app.hidden = false;
    render();
    title.focus();
  }

  function openLogin() {
    app.hidden = true;
    login.hidden = false;
    csrf = "";
    document.getElementById("password").value = "";
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
    api("/api/login", "POST", {
      username: document.getElementById("username").value,
      password: document.getElementById("password").value
    }).then(function (result) {
      button.disabled = false;
      if (!result.ok) {
        showError(loginError, result.data.error || "Usuario o contraseña incorrectos.");
        return;
      }
      csrf = result.data.csrf;
      return loadClub().then(openApp);
    }).catch(function () {
      button.disabled = false;
      showError(loginError, "No se pudo entrar. Intenta de nuevo.");
    });
  });

  document.getElementById("logout").addEventListener("click", function () {
    api("/api/logout", "POST", {}).then(openLogin);
  });

  app.addEventListener("click", function (event) {
    var tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      tab = tabButton.getAttribute("data-tab");
      editingEvent = "";
      editingPlayer = "";
      setStatus("");
      render();
      if (tab === "telemetria") showTelemetry();
      return;
    }
    var editEvent = event.target.closest("[data-edit-event]");
    if (editEvent) {
      editingEvent = editEvent.getAttribute("data-edit-event");
      render();
      return;
    }
    var deleteEvent = event.target.closest("[data-delete-event]");
    if (deleteEvent) {
      var eventId = deleteEvent.getAttribute("data-delete-event");
      var found = events.filter(function (item) { return item.id === eventId; })[0];
      if (!found || !window.confirm("¿Quitar el evento " + found.name + "?")) return;
      events = events.filter(function (item) { return item.id !== eventId; });
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
      editingEvent = "";
      render();
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
      var nextPlayer = { id: current.id };
      columns.forEach(function (column) {
        var input = row.querySelector("[data-field=\"" + column[0] + "\"]");
        nextPlayer[column[0]] = input ? String(input.value || "").trim() : "";
      });
      if (!nextPlayer.name) { setStatus("Escribe el nombre completo."); return; }
      var age = Number(nextPlayer.age);
      if (!Number.isInteger(age) || age < 1 || age > 120) { setStatus("La edad debe ser un número entre 1 y 120."); return; }
      nextPlayer.age = age;
      var roster = players.map(function (item) { return item.id === playerId ? nextPlayer : item; });
      saveRoster(roster, "Jugadora guardada.");
      return;
    }
    var deletePlayer = event.target.closest("[data-delete-player]");
    if (deletePlayer) {
      var deleteId = deletePlayer.getAttribute("data-delete-player");
      var player = players.filter(function (item) { return item.id === deleteId; })[0];
      if (!player) return;
      pendingDeleteId = player.id;
      document.getElementById("delete-player-copy").textContent = "¿Eliminar a " + player.name + "?";
      document.getElementById("delete-player-dialog").showModal();
    }
  });

  function saveRoster(list, message) {
    return api("/api/admin/roster", "PUT", { players: list }).then(function (result) {
      if (!result.ok) { setStatus(result.data.error || "No se pudo guardar."); return; }
      players = result.data.players;
      editingPlayer = "";
      setStatus(message);
      render();
    });
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
      api("/api/admin/roster/import", "POST", { file: base64 }).then(function (result) {
        if (!result.ok) { setStatus(result.data.error || "No se pudo cargar el archivo."); return; }
        players = result.data.players;
        editingPlayer = "";
        var repeated = players.filter(function (item) { return item.duplicate; }).length;
        setStatus("Se cargaron " + result.data.added + " jugadoras." + (repeated ? " Hay nombres y edades repetidos, marcados en rojo." : ""));
        render();
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

  app.addEventListener("input", function (event) {
    var filter = event.target.closest("[data-filter]");
    if (!filter) return;
    rosterFilters[filter.getAttribute("data-filter")] = filter.value;
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
    if (event.target.id === "event-form") {
      event.preventDefault();
      var data = new FormData(event.target);
      var next = {
        id: editingEvent || ("e-" + Date.now().toString(36)),
        name: String(data.get("name") || ""),
        date: String(data.get("date") || ""),
        time: String(data.get("time") || ""),
        place: String(data.get("place") || ""),
        note: String(data.get("note") || "")
      };
      var list = events.filter(function (item) { return item.id !== next.id; });
      list.push(next);
      api("/api/admin/events", "PUT", { events: list }).then(function (result) {
        if (!result.ok) { setStatus(result.data.error || "Revisa los datos del evento."); return; }
        events = result.data.events;
        editingEvent = "";
        setStatus("Evento guardado.");
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
        sede: String(form.get("sede") || ""),
        category: String(form.get("category") || ""),
        extra: String(form.get("extra") || "")
      };
      var roster = players.filter(function (item) { return item.id !== nextPlayer.id; });
      roster.push(nextPlayer);
      saveRoster(roster, "Jugadora agregada.");
    }
  });

  var pendingDeleteId = "";
  var deleteDialog = document.getElementById("delete-player-dialog");
  document.getElementById("cancel-delete-player").addEventListener("click", function () {
    pendingDeleteId = "";
    deleteDialog.close();
  });
  deleteDialog.addEventListener("cancel", function () { pendingDeleteId = ""; });
  document.getElementById("confirm-delete-player").addEventListener("click", function () {
    var deleteId = pendingDeleteId;
    pendingDeleteId = "";
    deleteDialog.close();
    if (!deleteId) return;
    saveRoster(players.filter(function (item) { return item.id !== deleteId; }), "Jugadora eliminada.");
  });

  var passwordDialog = document.getElementById("password-dialog");
  document.getElementById("open-password").addEventListener("click", function () {
    showError(document.getElementById("password-error"), "");
    passwordDialog.showModal();
  });
  document.getElementById("close-password").addEventListener("click", function () {
    passwordDialog.close();
  });
  document.getElementById("password-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var next = document.getElementById("next-password").value;
    var confirm = document.getElementById("confirm-password").value;
    if (next !== confirm) {
      showError(document.getElementById("password-error"), "La confirmación no coincide.");
      return;
    }
    api("/api/admin/password", "POST", {
      current: document.getElementById("current-password").value,
      next: next
    }).then(function (result) {
      if (!result.ok) {
        showError(document.getElementById("password-error"), result.data.error || "No se pudo cambiar la contraseña.");
        return;
      }
      csrf = result.data.csrf;
      event.target.reset();
      passwordDialog.close();
      setStatus("Contraseña actualizada.");
    });
  });

  api("/api/session", "GET").then(function (result) {
    if (!result.ok) return;
    csrf = result.data.csrf;
    loadClub().then(openApp).catch(openLogin);
  });
})();
