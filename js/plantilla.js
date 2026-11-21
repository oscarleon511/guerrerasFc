(function () {
  var dialog = document.querySelector("[data-player-card]");
  if (!dialog) return;

  var photo = dialog.querySelector("[data-card-photo]");
  var nameEl = dialog.querySelector("[data-card-name]");
  var numEl = dialog.querySelector("[data-card-num]");
  var posEl = dialog.querySelector("[data-card-pos]");
  var statEls = dialog.querySelectorAll("[data-stat]");
  var stats = ["pac", "sho", "pas", "dri", "def", "phy"];
  var roles = { POR: "Portera", DEF: "Defensa", CEN: "Centrocampista", DEL: "Delantera" };
  var order = ["POR", "DEF", "CEN", "DEL"];

  function seedFrom(name) {
    var h = 2166136261;
    for (var i = 0; i < name.length; i++) {
      h ^= name.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function roll(seed, salt) {
    var x = Math.imul(seed ^ salt, 1664525) + 1013904223;
    return 51 + ((x >>> 0) % 49);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function openCard(button) {
    var name = button.getAttribute("data-name");
    var seed = seedFrom(name);
    var values = {};
    var total = 0;
    stats.forEach(function (key, index) {
      values[key] = roll(seed, index + 1);
      total += values[key];
    });
    nameEl.textContent = name;
    numEl.textContent = String(Math.round(total / stats.length));
    posEl.textContent = button.getAttribute("data-pos");
    statEls.forEach(function (el) {
      el.textContent = values[el.getAttribute("data-stat")];
    });
    photo.alt = name;
    photo.src = button.getAttribute("data-photo");
    dialog.showModal();
  }

  function bind(button) {
    button.addEventListener("click", function () { openCard(button); });
  }

  function render(players) {
    var groups = { POR: [], DEF: [], CEN: [], DEL: [] };
    players.forEach(function (player) {
      if (!player || player.visible === false || !groups[player.position]) return;
      groups[player.position].push(player);
    });
    order.forEach(function (position) {
      var section = document.querySelector('[data-squad="' + position + '"]');
      if (!section) return;
      var grid = section.querySelector(".squad-grid");
      var list = groups[position];
      section.hidden = list.length === 0;
      grid.innerHTML = list.map(function (player) {
        var name = escapeHtml(player.name);
        var number = escapeHtml(player.number);
        var role = escapeHtml(roles[player.position] || "");
        var width = Number(player.cardWidth) || 240;
        var height = Number(player.cardHeight) || 560;
        return '<article class="player"><button type="button" class="player-open" data-player data-name="' + name + '" data-num="' + number + '" data-pos="' + escapeHtml(player.position) + '" data-photo="' + escapeHtml(player.portrait) + '" aria-label="Ver ficha de ' + name + '"><img src="' + escapeHtml(player.card) + '" width="' + width + '" height="' + height + '" alt="" loading="lazy" decoding="async"><p class="player-num">' + number + '</p><p class="player-role">' + role + '</p></button></article>';
      }).join("");
      grid.querySelectorAll("[data-player]").forEach(bind);
    });
  }

  dialog.querySelector("[data-card-close]").addEventListener("click", function () {
    dialog.close();
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });

  fetch("data/players.json", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (players) {
      if (Array.isArray(players)) render(players);
    })
    .catch(function () {});
})();
