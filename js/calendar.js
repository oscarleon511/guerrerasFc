(function () {
  var root = document.querySelector("[data-calendar]");
  if (!root) return;

  var sessions = {
    1: [
      { time: "8:00 p. m.", name: "Tiro de Esquina · Sur 2", place: "Cra 70 #13-90, Cali", href: "#sur-2", short: "Sur 2" }
    ],
    2: [
      { time: "8:00 p. m.", name: "Cancha 5.11 · Sur 1", place: "Cra 56 #12a-01, Cali", href: "#sur-1", short: "Sur 1" }
    ],
    6: [
      { time: "4:00 p. m.", name: "Cancha 5.11 · Sur 1", place: "Cra 56 #12a-01, Cali", href: "#sur-1", short: "Sur 1" },
      { time: "4:00 p. m.", name: "Tiro de Esquina · Sur 2", place: "Cra 70 #13-90, Cali", href: "#sur-2", short: "Sur 2" }
    ]
  };

  var months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var weekdays = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var view = "week";
  var cursor = dateOnly(new Date());
  var clubEvents = [];
  var title = root.querySelector("[data-cal-title]");
  var grid = root.querySelector("[data-cal-grid]");
  var prev = root.querySelector("[data-cal-prev]");
  var next = root.querySelector("[data-cal-next]");
  var dialog = document.querySelector("[data-cal-dialog]");
  var dialogTitle = document.getElementById("cal-dialog-title");
  var eventsBox = document.querySelector("[data-cal-events]");

  function dateOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, amount) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
  }

  function startOfWeek(date) {
    var day = date.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    return addDays(date, diff);
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function cap(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function pad(number) {
    return (number < 10 ? "0" : "") + number;
  }

  function iso(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function clock(value) {
    var match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
    if (!match) return String(value || "");
    var hour = Number(match[1]);
    var suffix = hour >= 12 ? "p. m." : "a. m.";
    var shown = hour % 12 || 12;
    return shown + ":" + match[2] + " " + suffix;
  }

  function plainName(value) {
    return String(value || "").replace(/\*/g, "").replace(/\s+/g, " ").trim();
  }

  function forDay(date) {
    var list = (sessions[date.getDay()] || []).map(function (item) {
      return {
        kind: "training",
        time: item.time,
        name: item.name,
        place: item.place,
        href: item.href,
        short: item.short
      };
    });
    var key = iso(date);
    clubEvents.forEach(function (item) {
      if (item.date !== key) return;
      var name = plainName(item.name);
      list.push({
        kind: "event",
        id: item.id,
        time: clock(item.time),
        name: name,
        place: String(item.place || "").trim(),
        short: name.length > 28 ? name.slice(0, 27).trim() + "…" : name,
        href: "eventos.html?evento=" + encodeURIComponent(item.id)
      });
    });
    return list;
  }

  function activityLabel(events) {
    var clubs = events.filter(function (item) { return item.kind === "event"; }).length;
    var trainings = events.length - clubs;
    if (clubs && trainings) return " actividades";
    if (clubs) return clubs === 1 ? " evento" : " eventos";
    return trainings === 1 ? " entrenamiento" : " entrenamientos";
  }

  function weekTitle(start) {
    var end = addDays(start, 6);
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return start.getDate() + " – " + end.getDate() + " de " + months[start.getMonth()] + " de " + start.getFullYear();
    }
    if (start.getFullYear() === end.getFullYear()) {
      return start.getDate() + " de " + months[start.getMonth()] + " – " + end.getDate() + " de " + months[end.getMonth()] + " de " + start.getFullYear();
    }
    return start.getDate() + " de " + months[start.getMonth()] + " de " + start.getFullYear() + " – " + end.getDate() + " de " + months[end.getMonth()] + " de " + end.getFullYear();
  }

  function cell(date, outside) {
    var events = forDay(date);
    var node = document.createElement(events.length ? "button" : "div");
    node.className = "cal-day";
    if (events.some(function (item) { return item.kind === "event"; })) node.classList.add("is-event");
    if (events.length === 1) node.classList.add("is-one");
    if (events.length > 1) node.classList.add("is-many");
    if (outside) node.classList.add("is-out");
    if (sameDay(date, dateOnly(new Date()))) node.classList.add("is-today");
    if (events.length) node.type = "button";

    var dow = document.createElement("span");
    dow.className = "cal-dow";
    dow.textContent = cap(weekdays[date.getDay()]).slice(0, 3);
    var num = document.createElement("span");
    num.className = "cal-num";
    num.textContent = String(date.getDate());
    node.append(dow, num);

    if (events.length) {
      var count = document.createElement("span");
      count.className = "cal-count";
      var countN = document.createElement("span");
      countN.className = "cal-count-n";
      countN.textContent = String(events.length);
      var countLabel = document.createElement("span");
      countLabel.className = "cal-count-label";
      countLabel.textContent = activityLabel(events);
      count.append(countN, countLabel);

      var marks = document.createElement("span");
      marks.className = "cal-marks";
      marks.setAttribute("aria-hidden", "true");
      events.forEach(function () {
        marks.append(document.createElement("i"));
      });

      var preview = document.createElement("ul");
      preview.className = "cal-preview";
      events.forEach(function (event) {
        var item = document.createElement("li");
        item.textContent = event.short + " · " + event.time;
        preview.append(item);
      });

      node.append(count, marks, preview);
      var label = cap(weekdays[date.getDay()]) + " " + date.getDate() + " de " + months[date.getMonth()] + ", " +
        events.length + activityLabel(events);
      node.setAttribute("aria-label", label);
      node.addEventListener("click", function () { openDay(date, events); });
    }

    return node;
  }

  function render() {
    var today = dateOnly(new Date());
    root.classList.toggle("is-week", view === "week");
    root.classList.toggle("is-month", view === "month");
    prev.setAttribute("aria-label", view === "week" ? "Semana anterior" : "Mes anterior");
    next.setAttribute("aria-label", view === "week" ? "Semana siguiente" : "Mes siguiente");
    grid.replaceChildren();

    if (view === "week") {
      var start = startOfWeek(cursor);
      title.textContent = weekTitle(start);
      for (var i = 0; i < 7; i += 1) grid.append(cell(addDays(start, i), false));
      return;
    }

    title.textContent = cap(months[cursor.getMonth()]) + " de " + cursor.getFullYear();
    var first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    var day = startOfWeek(first);
    var guard = 0;
    do {
      grid.append(cell(day, day.getMonth() !== cursor.getMonth()));
      day = addDays(day, 1);
      guard += 1;
    } while ((day.getDay() !== 1 || day <= new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)) && guard < 42);
    if (!grid.children.length) grid.append(cell(today, false));
  }

  function openDay(date, events) {
    dialogTitle.textContent = cap(weekdays[date.getDay()]) + " " + date.getDate() + " de " + months[date.getMonth()];
    eventsBox.replaceChildren();
    events.forEach(function (event) {
      var time = document.createElement("p");
      time.className = "cal-time";
      time.textContent = event.time;
      var name = document.createElement("h4");
      name.textContent = event.name;
      var place = document.createElement("p");
      place.textContent = event.place;
      if (event.kind === "event") {
        var link = document.createElement("a");
        link.className = "cal-event";
        link.href = event.href;
        var more = document.createElement("span");
        more.className = "cal-more";
        more.textContent = "Ver evento";
        link.append(time, name, place, more);
        eventsBox.append(link);
        return;
      }
      var item = document.createElement("article");
      item.className = "cal-event";
      var sede = document.createElement("a");
      sede.href = event.href;
      sede.textContent = "Ver sede";
      sede.addEventListener("click", function () { dialog.close(); });
      item.append(time, name, place, sede);
      eventsBox.append(item);
    });
    if (events.length > 1) {
      eventsBox.tabIndex = 0;
      eventsBox.setAttribute("aria-label", "Entrenamientos de este día. Desplázate para verlos todos.");
    } else {
      eventsBox.removeAttribute("tabindex");
      eventsBox.removeAttribute("aria-label");
    }
    dialog.showModal();
    if (events.length > 1) eventsBox.focus();
  }

  prev.addEventListener("click", function () {
    cursor = view === "week" ? addDays(cursor, -7) : new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    render();
  });

  next.addEventListener("click", function () {
    cursor = view === "week" ? addDays(cursor, 7) : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    render();
  });

  root.querySelector("[data-cal-today]").addEventListener("click", function () {
    cursor = dateOnly(new Date());
    render();
  });

  root.querySelectorAll("[data-cal-view]").forEach(function (button) {
    button.addEventListener("click", function () {
      view = button.getAttribute("data-cal-view");
      root.querySelectorAll("[data-cal-view]").forEach(function (item) {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      render();
    });
  });

  dialog.querySelector("[data-cal-close]").addEventListener("click", function () { dialog.close(); });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });

  render();

  fetch("/api/events", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : { events: [] }; })
    .then(function (data) {
      clubEvents = Array.isArray(data.events) ? data.events : [];
      render();
    })
    .catch(function () {});
})();
