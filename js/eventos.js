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

  function frameAspect(ratio) {
    return { site: "16 / 10", instagram: "1 / 1", portrait: "4 / 5", story: "9 / 16", facebook: "1200 / 630" }[ratio] || "16 / 10";
  }

  function frameStyle(frame) {
    var fitted = frame || {};
    var ratio = frameAspect(fitted.ratio);
    var zoom = Number(fitted.zoom);
    var x = Number(fitted.x);
    var y = Number(fitted.y);
    if (!isFinite(zoom)) zoom = 1;
    if (!isFinite(x)) x = 0;
    if (!isFinite(y)) y = 0;
    return "--frame:" + ratio + ";--zoom:" + zoom + ";--pan-x:" + x + "%;--pan-y:" + y + "%";
  }

  function eventSlides(item) {
    var photos = item.photos || [];
    var video = item.video || "";
    var mode = item.mediaMode || "both";
    if (!video) mode = "photos";
    else if (!photos.length) mode = "video";
    var order = [];
    (item.mediaOrder || []).forEach(function (token) {
      if (token === "video") {
        if (video && order.indexOf("video") === -1) order.push("video");
      } else if (photos.indexOf(token) !== -1 && order.indexOf(token) === -1) order.push(token);
    });
    if (video && order.indexOf("video") === -1) order.unshift("video");
    photos.forEach(function (file) {
      if (order.indexOf(file) === -1) order.push(file);
    });
    var slides = [];
    order.forEach(function (token) {
      if (token === "video") {
        if (mode !== "photos") slides.push({ kind: "video", file: video });
      } else if (mode !== "video") slides.push({ kind: "photo", file: token });
    });
    return slides;
  }

  function addMedia(article, item) {
    var slides = eventSlides(item);
    if (!slides.length) return;
    var frame = item.videoFrame || { ratio: "site", zoom: 1, x: 0, y: 0 };
    function piece(slide, index) {
      if (slide.kind === "video") {
        var fit = document.createElement("div");
        fit.className = "event-video-fit" + (index === 0 ? " is-on" : "");
        fit.setAttribute("style", frameStyle(frame));
        var video = document.createElement("video");
        video.controls = true;
        video.preload = "metadata";
        video.src = mediaUrl(item.id, slide.file);
        video.setAttribute("aria-label", "Video de " + item.name);
        fit.appendChild(video);
        return fit;
      }
      var img = document.createElement("img");
      img.src = mediaUrl(item.id, slide.file);
      img.alt = "Foto " + (index + 1) + " de " + item.name;
      if (index === 0) img.className = "is-on";
      if (slides.length === 1) img.className = "event-photo";
      return img;
    }
    if (slides.length === 1) {
      article.appendChild(piece(slides[0], 0));
      return;
    }
    var root = document.createElement("div");
    root.className = "event-carousel";
    var strip = document.createElement("div");
    strip.className = "event-slides";
    slides.forEach(function (slide, index) { strip.appendChild(piece(slide, index)); });
    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "event-nav event-prev";
    prev.setAttribute("aria-label", "Anterior");
    prev.textContent = "‹";
    var next = document.createElement("button");
    next.type = "button";
    next.className = "event-nav event-next";
    next.setAttribute("aria-label", "Siguiente");
    next.textContent = "›";
    var dots = document.createElement("div");
    dots.className = "event-dots";
    var photoNumber = 0;
    slides.forEach(function (slide, slideIndex) {
      if (slide.kind === "photo") photoNumber += 1;
      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", slide.kind === "video" ? "Video" : "Foto " + photoNumber);
      if (slideIndex === 0) {
        dot.className = "is-on";
        dot.setAttribute("aria-current", "true");
      }
      dots.appendChild(dot);
    });
    var index = 0;
    function show(nextIndex) {
      index = (nextIndex + slides.length) % slides.length;
      var current = slides[index];
      strip.style.aspectRatio = current.kind === "video" ? frameAspect(frame.ratio) : "16 / 10";
      Array.prototype.forEach.call(strip.children, function (node, i) {
        var on = i === index;
        node.classList.toggle("is-on", on);
        if (node.tagName !== "VIDEO") {
          var nested = node.querySelector("video");
          if (nested && !on) nested.pause();
        }
      });
      Array.prototype.forEach.call(dots.children, function (dot, i) {
        var on = i === index;
        dot.classList.toggle("is-on", on);
        if (on) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }
    show(0);
    prev.addEventListener("click", function () { show(index - 1); });
    next.addEventListener("click", function () { show(index + 1); });
    Array.prototype.forEach.call(dots.children, function (dot, i) {
      dot.addEventListener("click", function () { show(i); });
    });
    root.appendChild(strip);
    root.appendChild(prev);
    root.appendChild(next);
    root.appendChild(dots);
    article.appendChild(root);
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
      addMedia(article, item);
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
