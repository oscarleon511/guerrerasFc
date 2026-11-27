(function () {
  var FILES = {
    sedes: "sedes.html",
    plantilla: "plantilla.html",
    nosotras: "nosotras.html",
    patrocinadores: "patrocinadores.html",
    beneficios: "beneficios.html",
    eventos: "eventos.html",
    torneos: "torneos.html",
    tienda: "tienda.html"
  };

  function currentFile() {
    var file = location.pathname.split("/").pop();
    if (!file) return "index.html";
    if (file.indexOf(".") === -1) return file + ".html";
    return file;
  }

  function hideLink(anchor) {
    var shop = anchor.closest(".nav-shop");
    if (shop) {
      shop.hidden = true;
      return;
    }
    var item = anchor.closest("li");
    if (item) {
      item.hidden = true;
      return;
    }
    anchor.hidden = true;
  }

  function apply(settings) {
    var pages = settings && settings.pages;
    if (!pages) return;
    var hidden = {};
    Object.keys(FILES).forEach(function (key) {
      if (pages[key] && pages[key].visible === false) hidden[FILES[key]] = true;
    });
    document.querySelectorAll("a[href]").forEach(function (anchor) {
      var href = anchor.getAttribute("href") || "";
      var file = href.split("#")[0].split("?")[0].split("/").pop();
      if (hidden[file]) hideLink(anchor);
    });
    var here = currentFile();
    if (!hidden[here]) return;
    var main = document.querySelector("main");
    if (!main) return;
    main.innerHTML = '<div class="wrap"><p class="index">Guerreras FC</p><h1>Esta sección no está disponible</h1><p>El club ocultó esta parte del sitio.</p><p><a class="btn" href="index.html">Volver al inicio</a></p></div>';
  }

  fetch("data/site-settings.json", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (settings) {
      apply(settings);
      installAnalytics(settings);
    })
    .catch(function () {});

  function validGoogleId(value) {
    return /^G-[A-Z0-9]{4,16}$/.test(String(value || "").trim().toUpperCase());
  }

  function validPixelId(value) {
    return /^\d{5,20}$/.test(String(value || "").replace(/\s+/g, ""));
  }

  function installGoogle(measurementId) {
    if (window.gtag) return;
    var id = String(measurementId).trim().toUpperCase();
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", id);
  }

  function installFacebook(pixelId) {
    if (window.fbq) return;
    var pixel = String(pixelId).replace(/\s+/g, "");
    var queue = function () {
      if (queue.callMethod) queue.callMethod.apply(queue, arguments);
      else queue.queue.push(arguments);
    };
    queue.push = queue;
    queue.loaded = true;
    queue.version = "2.0";
    queue.queue = [];
    window.fbq = queue;
    if (!window._fbq) window._fbq = queue;
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    var first = document.getElementsByTagName("script")[0];
    if (first && first.parentNode) first.parentNode.insertBefore(script, first);
    else document.head.appendChild(script);
    window.fbq("init", pixel);
    window.fbq("track", "PageView");
  }

  function installAnalytics(settings) {
    var analytics = settings && settings.analytics;
    if (!analytics) return;
    if (analytics.googleOn === true && validGoogleId(analytics.googleId)) installGoogle(analytics.googleId);
    if (analytics.facebookOn === true && validPixelId(analytics.facebookId)) installFacebook(analytics.facebookId);
  }
})();
