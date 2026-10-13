(function () {
  var dialog = document.querySelector("[data-player-card]");
  if (!dialog) return;

  var photo = dialog.querySelector("[data-card-photo]");
  var nameEl = dialog.querySelector("[data-card-name]");
  var numEl = dialog.querySelector("[data-card-num]");
  var posEl = dialog.querySelector("[data-card-pos]");
  var statEls = dialog.querySelectorAll("[data-stat]");
  var stats = ["pac", "sho", "pas", "dri", "def", "phy"];

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

  document.querySelectorAll("[data-player]").forEach(function (button) {
    button.addEventListener("click", function () {
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
    });
  });

  dialog.querySelector("[data-card-close]").addEventListener("click", function () {
    dialog.close();
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
})();
