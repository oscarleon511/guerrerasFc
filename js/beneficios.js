(function () {
  var wall = document.querySelector(".benefit-wall");
  var dialog = document.querySelector("[data-benefit-dialog]");
  var photo = dialog.querySelector("[data-benefit-photo]");
  var name = dialog.querySelector("[data-benefit-name]");
  var go = dialog.querySelector("[data-benefit-go]");

  function openBenefit(src, label, href) {
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

  var touchScreen = window.matchMedia("(hover: none), (pointer: coarse)").matches;

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
      openBenefit(button.getAttribute("data-benefit"), label, href);
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
    var empty = document.querySelector("[data-benefit-empty]");
    var hint = document.querySelector("[data-benefit-hint]");
    if (empty) empty.hidden = has;
    if (hint) hint.hidden = !has;
  }

  if (wall) {
    Array.prototype.forEach.call(wall.children, function (item) {
      var button = item.querySelector("[data-benefit]");
      if (button) prepare(item, button);
    });
    showWall();
    fetch("api/benefits", { cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        var list = data && data.benefits;
        if (!list || !list.length) return;
        list.forEach(function (benefit) {
          var src = "api/benefits/media?id=" + encodeURIComponent(benefit.id) + "&file=" + encodeURIComponent(benefit.photo);
          var item = document.createElement("li");
          var button = document.createElement("button");
          button.type = "button";
          button.setAttribute("data-benefit", src);
          button.setAttribute("data-label", benefit.name || "");
          if (benefit.link) button.setAttribute("data-href", benefit.link);
          var image = document.createElement("img");
          image.src = src;
          image.alt = benefit.name || "";
          image.width = 480;
          image.height = 480;
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

  dialog.querySelector("[data-benefit-close]").addEventListener("click", function () {
    dialog.close();
  });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
})();
