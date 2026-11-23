(function () {
  var FILES = {
    sedes: "sedes.html",
    plantilla: "plantilla.html",
    nosotras: "nosotras.html",
    patrocinadores: "patrocinadores.html",
    beneficios: "beneficios.html",
    eventos: "eventos.html",
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

  var host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    fetch("api/session", { credentials: "same-origin" }).then(function (response) {
      if (response.status !== 401 && response.status !== 200) return;
      var legal = document.querySelector(".legal");
      if (!legal || document.querySelector("[data-admin-link]")) return;
      var line = document.createElement("p");
      var link = document.createElement("a");
      link.href = "GFCCaliAdmin";
      link.setAttribute("data-admin-link", "");
      link.textContent = "Administración";
      line.appendChild(link);
      legal.appendChild(line);
    }).catch(function () {});
  }

  fetch("data/site-settings.json", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(apply)
    .catch(function () {});
})();
