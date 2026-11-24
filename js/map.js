(function () {
  var mount = document.querySelector("[data-sede-map]");
  if (!mount) return;

  var fallback = [
    {
      id: "sur-1",
      zone: "Guerreras Sur 1",
      name: "Cancha 5.11",
      lines: ["Cra 56 #12a-01", "Cali, Valle del Cauca"],
      lat: 3.405995,
      lng: -76.53663,
      maps: "https://www.google.com/maps/search/?api=1&query=Cancha+5.11+Cra+56+12a-01+Cali"
    },
    {
      id: "sur-2",
      zone: "Guerreras Sur 2",
      name: "Cancha Tiro de Esquina",
      lines: ["Cra 70 #13-90", "Cali, Valle del Cauca"],
      lat: 3.3929357,
      lng: -76.5377499,
      maps: "https://www.google.com/maps/search/?api=1&query=Cancha+Tiro+de+Esquina+Cra+70+13-90+Cali"
    },
    {
      id: "norte",
      zone: "Guerreras Norte",
      name: "Cancha Wembley",
      lines: ["Calle 58 Norte con Avenida 3 Norte", "Cali, Valle del Cauca"],
      lat: 3.490045,
      lng: -76.521075,
      maps: "https://www.google.com/maps/search/?api=1&query=Cancha+Wembley+Calle+58+Norte+Avenida+3+Norte+Cali"
    },
    {
      id: "campo",
      zone: "Guerreras Ciudad del Campo",
      name: "Cancha Campo Verde",
      lines: ["Cra 7U #93-171", "Juanchito, Valle del Cauca"],
      lat: 3.452348,
      lng: -76.472938,
      maps: "https://www.google.com/maps/search/?api=1&query=Cancha+Campo+Verde+Carrera+7U+93-171+Juanchito"
    }
  ];
  var places = fallback.slice();

  function asPlace(item) {
    var lat = Number(item && item.lat);
    var lng = Number(item && item.lng);
    var lines = String(item && item.address || "").split("\n").map(function (line) { return line.trim(); }).filter(Boolean);
    if (!item || !item.id || !Number.isFinite(lat) || !Number.isFinite(lng) || !lines.length) return null;
    return {
      id: String(item.id),
      zone: String(item.team || ""),
      name: String(item.field || ""),
      lines: lines,
      lat: lat,
      lng: lng,
      maps: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([item.field].concat(lines).join(", "))
    };
  }

  function loadPlaces() {
    return fetch("/api/locations", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("locations");
        return response.json();
      })
      .then(function (data) {
        places = Array.isArray(data.locations) ? data.locations.map(asPlace).filter(Boolean) : [];
      })
      .catch(function () { places = fallback.slice(); });
  }

  var markers = {};
  var ready = null;
  var map = null;

  function popup(place) {
    var box = document.createElement("div");
    box.className = "sede-pop";
    var zone = document.createElement("p");
    zone.className = "index";
    zone.textContent = place.zone;
    var title = document.createElement("h3");
    title.textContent = place.name;
    var address = document.createElement("p");
    place.lines.forEach(function (line, index) {
      if (index) address.append(document.createElement("br"));
      address.append(document.createTextNode(line));
    });
    var link = document.createElement("a");
    link.href = place.maps;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Cómo llegar";
    box.append(zone, title, address, link);
    return box;
  }

  function pinIcon(place) {
    return L.divIcon({
      className: "sede-pin-wrap",
      html: '<button type="button" class="sede-pin" aria-label="' + place.zone + ", " + place.name + '"><img src="assets/logo.png" alt="" width="44" height="44"></button>',
      iconSize: [44, 52],
      iconAnchor: [22, 50],
      popupAnchor: [0, -46]
    });
  }

  function markOpen(id) {
    Object.keys(markers).forEach(function (key) {
      var button = markers[key].getElement() && markers[key].getElement().querySelector(".sede-pin");
      if (button) button.classList.toggle("is-open", key === id);
    });
  }

  function showAll() {
    if (!map || !places.length) return;
    map.invalidateSize();
    if (places.length === 1) {
      map.setView([places[0].lat, places[0].lng], 15, { animate: false });
    } else {
      map.fitBounds(places.map(function (place) { return [place.lat, place.lng]; }), {
        paddingTopLeft: [40, 68],
        paddingBottomRight: [40, 24],
        animate: false
      });
    }
    layoutPins();
  }

  function layoutPins() {
    var ids = Object.keys(markers);
    var points = {};
    ids.forEach(function (id) {
      points[id] = map.latLngToContainerPoint(markers[id].getLatLng());
    });
    var offsets = {};
    ids.forEach(function (id) { offsets[id] = { x: 0, y: 0 }; });
    ids.forEach(function (id, index) {
      for (var next = index + 1; next < ids.length; next += 1) {
        var other = ids[next];
        var dx = points[other].x - points[id].x;
        var dy = points[other].y - points[id].y;
        if (Math.hypot(dx, dy) >= 76) continue;
        var north = points[id].y <= points[other].y ? id : other;
        var south = north === id ? other : id;
        offsets[north].x = 38;
        offsets[south].x = -38;
      }
    });
    ids.forEach(function (id) {
      var wrap = markers[id].getElement();
      if (!wrap) return;
      var pin = wrap.querySelector(".sede-pin");
      if (!pin) return;
      var shift = offsets[id];
      var moved = shift.x !== 0 || shift.y !== 0;
      pin.style.transform = moved ? "translate(" + shift.x + "px," + shift.y + "px)" : "";
      wrap.classList.toggle("is-shifted", moved);
    });
  }

  function focusPlace(id) {
    var marker = markers[id];
    if (!marker || !map) return;
    showAll();
    markOpen(id);
    marker.openPopup();
  }

  function mapLimits() {
    var lats = places.map(function (place) { return place.lat; });
    var lngs = places.map(function (place) { return place.lng; });
    var latSpan = Math.max.apply(null, lats) - Math.min.apply(null, lats);
    var lngSpan = Math.max.apply(null, lngs) - Math.min.apply(null, lngs);
    var latPad = Math.max(0.12, latSpan * 0.8);
    var lngPad = Math.max(0.12, lngSpan * 0.8);
    return {
      minZoom: latSpan < 0.4 && lngSpan < 0.4 ? 11 : 6,
      bounds: [
        [Math.min.apply(null, lats) - latPad, Math.min.apply(null, lngs) - lngPad],
        [Math.max.apply(null, lats) + latPad, Math.max.apply(null, lngs) + lngPad]
      ]
    };
  }

  function start() {
    if (ready) return ready;
    ready = loadPlaces().then(function () {
      return new Promise(function (resolve, reject) {
        if (window.L) {
          resolve();
          return;
        }
        var script = document.createElement("script");
        script.src = "js/leaflet.js";
        script.onload = function () { resolve(); };
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }).then(function () {
      var status = mount.querySelector(".sede-map-status");
      if (!places.length) {
        if (status) status.textContent = "Todavía no hay sedes en el mapa.";
        return;
      }
      if (status) status.remove();
      var limits = mapLimits();
      map = L.map(mount, {
        scrollWheelZoom: false,
        zoomControl: true,
        minZoom: limits.minZoom,
        maxZoom: 18,
        maxBounds: limits.bounds,
        maxBoundsViscosity: 0.85
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        updateWhenIdle: true,
        maxZoom: 18
      }).addTo(map);

      places.forEach(function (place) {
        var marker = L.marker([place.lat, place.lng], { icon: pinIcon(place), keyboard: true, title: place.name });
        var popupWidth = Math.max(160, Math.min(240, mount.clientWidth - 72));
        marker.bindPopup(popup(place), { closeButton: true, autoPan: false, maxWidth: popupWidth, minWidth: 150 });
        marker.on("popupopen", function () { markOpen(place.id); });
        marker.on("popupclose", function () { markOpen(""); });
        marker.addTo(map);
        markers[place.id] = marker;
      });
      map.on("zoomend", layoutPins);
      window.addEventListener("resize", showAll);
      showAll();
      var id = location.hash.replace("#", "");
      if (markers[id]) focusPlace(id);
    });
    return ready;
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      observer.disconnect();
      start();
    }, { rootMargin: "200px" });
    observer.observe(mount);
  } else {
    start();
  }

  if (/^#[a-zA-Z0-9_-]{1,40}$/.test(location.hash)) start();

  function openFromHash() {
    var id = location.hash.replace("#", "");
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)) return;
    start().then(function () { if (markers[id]) focusPlace(id); });
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href^='#']");
    if (!link || link.getAttribute("href") === "#") return;
    openFromHash();
  });

  window.addEventListener("hashchange", openFromHash);
})();
