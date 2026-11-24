(function () {
  var wall = document.querySelector(".logo-wall");
  var dialog = document.querySelector("[data-sponsor-dialog]");
  var photo = dialog.querySelector("[data-sponsor-photo]");
  var name = dialog.querySelector("[data-sponsor-name]");
  var go = dialog.querySelector("[data-sponsor-go]");
  var touchScreen = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  function openSponsor(src, label, href) {
    photo.alt = label || "";
    name.textContent = label || "";
    if (photo.getAttribute("src") !== src) photo.src = src;
    if (href) {
      go.href = href;
      go.hidden = false;
    } else {
      go.hidden = true;
      go.removeAttribute("href");
    }
    dialog.showModal();
  }

  function prepare(item, button) {
    item.classList.add("benefit-tile");
    var label = button.getAttribute("data-label") || "";
    var href = button.getAttribute("data-href") || "";
    var hover = document.createElement("div");
    hover.className = "benefit-hover";
    var title = document.createElement("strong");
    title.textContent = label;
    hover.appendChild(title);
    if (href) {
      var link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = href;
      hover.appendChild(link);
    }
    item.appendChild(hover);
    function show() {
      openSponsor(button.getAttribute("data-sponsor"), label, href);
    }
    button.addEventListener("click", function (event) {
      if (event.target.closest("a")) return;
      if (touchScreen || event.detail === 0) show();
    });
    item.addEventListener("dblclick", function (event) {
      if (event.target.closest("a")) return;
      show();
    });
  }

  function showWall() {
    var has = wall.children.length > 0;
    wall.classList.toggle("is-empty", !has);
    var empty = document.querySelector("[data-sponsor-empty]");
    var hint = document.querySelector("[data-sponsor-hint]");
    if (empty) empty.hidden = has;
    if (hint) hint.hidden = !has;
  }

  if (wall) {
    Array.prototype.forEach.call(wall.children, function (item) {
      var button = item.querySelector("[data-sponsor]");
      if (button) prepare(item, button);
    });
    showWall();
    fetch("api/sponsors", { cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        var list = data && data.sponsors;
        if (!list || !list.length) return;
        list.forEach(function (sponsor) {
          var src = "api/sponsors/media?id=" + encodeURIComponent(sponsor.id) + "&file=" + encodeURIComponent(sponsor.photo);
          var item = document.createElement("li");
          var button = document.createElement("button");
          button.type = "button";
          button.setAttribute("data-sponsor", src);
          button.setAttribute("data-label", sponsor.name || "");
          if (sponsor.link) button.setAttribute("data-href", sponsor.link);
          var image = document.createElement("img");
          image.src = src;
          image.alt = sponsor.name || "";
          image.width = 400;
          image.height = 200;
          image.loading = "lazy";
          image.decoding = "async";
          button.appendChild(image);
          item.appendChild(button);
          wall.appendChild(item);
          prepare(item, button);
        });
        showWall();
      })
      .catch(function () {});
  }

  dialog.querySelector("[data-sponsor-close]").addEventListener("click", function () {
    dialog.close();
  });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
})();
