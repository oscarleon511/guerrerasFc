(function () {
  var list = document.getElementById("event-list");
  var missing = document.getElementById("event-missing");
  if (!list) return;

  function mediaUrl(id, file) {
    return "/api/events/media?id=" + encodeURIComponent(id) + "&file=" + encodeURIComponent(file);
  }

  function sanitizeNote(value) {
    var allowed = { b: 1, strong: 1, i: 1, em: 1, u: 1, p: 1, br: 1, ul: 1, ol: 1, li: 1, div: 1 };
    var html = String(value || "").replace(/\0/g, "");
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

  function formatWhen(item) {
    var parts = String(item.date || "").split("-");
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var text = date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (item.time) text += " · " + item.time;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function copyLink(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
      return;
    }
    fallbackCopy(text, done);
  }

  function fallbackCopy(text, done) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); done(); } catch (error) {}
    area.remove();
  }

  function shareEvent(item, status) {
    var url = new URL("eventos.html", location.href);
    url.search = "?evento=" + encodeURIComponent(item.id);
    var payload = { title: item.name, text: item.name, url: url.toString() };
    function copied() { status.textContent = "Enlace copiado."; }
    if (navigator.share) {
      navigator.share(payload).catch(function (error) {
        if (error && error.name === "AbortError") return;
        copyLink(payload.url, copied);
      });
      return;
    }
    copyLink(payload.url, copied);
  }

  function addPhotos(article, item) {
    var photos = item.photos;
    if (photos.length === 1) {
      var single = document.createElement("img");
      single.className = "event-photo";
      single.src = mediaUrl(item.id, photos[0]);
      single.alt = "Foto de " + item.name;
      article.appendChild(single);
      return;
    }
    var root = document.createElement("div");
    root.className = "event-carousel";
    var slides = document.createElement("div");
    slides.className = "event-slides";
    photos.forEach(function (file, index) {
      var img = document.createElement("img");
      img.src = mediaUrl(item.id, file);
      img.alt = "Foto " + (index + 1) + " de " + item.name;
      if (index === 0) img.className = "is-on";
      slides.appendChild(img);
    });
    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "event-nav event-prev";
    prev.setAttribute("aria-label", "Foto anterior");
    prev.textContent = "‹";
    var next = document.createElement("button");
    next.type = "button";
    next.className = "event-nav event-next";
    next.setAttribute("aria-label", "Foto siguiente");
    next.textContent = "›";
    var dots = document.createElement("div");
    dots.className = "event-dots";
    photos.forEach(function (file, index) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", "Foto " + (index + 1));
      if (index === 0) {
        dot.className = "is-on";
        dot.setAttribute("aria-current", "true");
      }
      dots.appendChild(dot);
    });
    var index = 0;
    function show(nextIndex) {
      index = (nextIndex + photos.length) % photos.length;
      Array.prototype.forEach.call(slides.children, function (img, i) {
        img.classList.toggle("is-on", i === index);
      });
      Array.prototype.forEach.call(dots.children, function (dot, i) {
        var on = i === index;
        dot.classList.toggle("is-on", on);
        if (on) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }
    prev.addEventListener("click", function () { show(index - 1); });
    next.addEventListener("click", function () { show(index + 1); });
    Array.prototype.forEach.call(dots.children, function (dot, i) {
      dot.addEventListener("click", function () { show(i); });
    });
    root.appendChild(slides);
    root.appendChild(prev);
    root.appendChild(next);
    root.appendChild(dots);
    article.appendChild(root);
  }

  function addVideo(article, item) {
    var video = document.createElement("video");
    video.className = "event-video";
    video.controls = true;
    video.preload = "metadata";
    video.src = mediaUrl(item.id, item.video);
    video.setAttribute("aria-label", "Video de " + item.name);
    article.appendChild(video);
  }

  function render(events) {
    list.innerHTML = "";
    if (!events.length) {
      var empty = document.createElement("p");
      empty.textContent = "Todavía no hay eventos.";
      list.appendChild(empty);
      return;
    }
    events.forEach(function (item) {
      var article = document.createElement("article");
      article.className = "event-card";
      article.id = "evento-" + item.id;
      var heading = document.createElement("h2");
      heading.textContent = item.name;
      var when = document.createElement("p");
      when.className = "event-when";
      when.textContent = formatWhen(item);
      article.appendChild(heading);
      article.appendChild(when);
      if (item.place) {
        var place = document.createElement("p");
        place.className = "event-place";
        place.textContent = item.place;
        article.appendChild(place);
      }
      if (item.photos && item.photos.length) addPhotos(article, item);
      if (item.video) addVideo(article, item);
      if (item.note && String(item.note).replace(/<[^>]+>/g, "").trim()) {
        var note = document.createElement("div");
        note.className = "event-note";
        note.innerHTML = sanitizeNote(item.note);
        article.appendChild(note);
      }
      var actions = document.createElement("div");
      actions.className = "event-share";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn";
      button.textContent = "Compartir";
      var status = document.createElement("p");
      status.className = "event-share-status";
      status.setAttribute("role", "status");
      button.addEventListener("click", function () { shareEvent(item, status); });
      actions.appendChild(button);
      actions.appendChild(status);
      article.appendChild(actions);
      list.appendChild(article);
    });
  }

  fetch("/api/events", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : { events: [] }; })
    .then(function (data) {
      var events = Array.isArray(data.events) ? data.events.slice() : [];
      events.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return String(b.time || "").localeCompare(String(a.time || ""));
      });
      render(events);
      var focusId = new URLSearchParams(location.search).get("evento") || "";
      if (!focusId) return;
      var target = document.getElementById("evento-" + focusId);
      if (target) {
        target.classList.add("is-target");
        target.scrollIntoView({ block: "start" });
        return;
      }
      if (missing) {
        missing.hidden = false;
        missing.textContent = "Este evento no está publicado.";
      }
    })
    .catch(function () {
      list.textContent = "No se pudieron cargar los eventos.";
    });
})();
