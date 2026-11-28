(function () {
  var band = document.querySelector("[data-sponsor-marquee]");
  if (!band) return;
  var track = band.querySelector(".sponsor-track");

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function logo(sponsor) {
    var src = "/api/sponsors/media?id=" + encodeURIComponent(sponsor.id) + "&file=" + encodeURIComponent(sponsor.photo);
    var name = sponsor.name || "Patrocinador";
    return "<a href=\"patrocinadores.html\" aria-label=\"" + escapeHtml(name) + ", ver patrocinadores\"><img src=\"" + escapeHtml(src) + "\" alt=\"\"></a>";
  }

  fetch("/api/sponsors", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      var list = data && Array.isArray(data.sponsors) ? data.sponsors.filter(function (item) { return item && item.photo; }) : [];
      if (!list.length || !track) return;
      var row = list.map(logo).join("");
      track.innerHTML = row + row;
      track.style.animationDuration = Math.max(80, list.length * 6) + "s";
      band.hidden = false;
    })
    .catch(function () {});
})();
