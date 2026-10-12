(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var KEY = "guerreras-pedido";

  function closeMenu() {
    if (!header || !toggle) return;
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    var label = toggle.querySelector(".sr-only");
    if (label) label.textContent = "Abrir menú";
  }

  if (toggle && header) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.querySelector(".sr-only").textContent = open ? "Cerrar menú" : "Abrir menú";
    });

    header.addEventListener("click", function (event) {
      if (event.target.closest(".menu-panel a, .site-nav a")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });
  }

  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    renderBadge(items);
    renderCart(items);
  }

  function money(value) {
    return "$" + Number(value).toLocaleString("es-CO");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function renderBadge(items) {
    var count = items.reduce(function (sum, item) { return sum + item.qty; }, 0);
    document.querySelectorAll("[data-cart-count]").forEach(function (node) {
      node.textContent = count ? "(" + count + ")" : "";
    });
  }

  function addItem(id, name, price) {
    var items = load();
    var found = items.find(function (item) { return item.id === id; });
    if (found) found.qty += 1;
    else items.push({ id: id, name: name, price: price, qty: 1 });
    save(items);
  }

  function changeQty(id, delta) {
    var items = load().map(function (item) {
      if (item.id === id) item.qty += delta;
      return item;
    }).filter(function (item) { return item.qty > 0; });
    save(items);
  }

  function renderCart(items) {
    var list = document.querySelector("[data-cart-list]");
    var total = document.querySelector("[data-cart-total]");
    var send = document.querySelector("[data-send]");
    if (!list || !total || !send) return;

    if (!items.length) {
      list.innerHTML = "<p>Todavía no hay artículos. Agrega la inscripción, la mensualidad o un uniforme.</p>";
      total.textContent = money(0);
      send.disabled = true;
      return;
    }

    list.innerHTML = items.map(function (item) {
      var name = escapeHtml(item.name);
      var id = escapeHtml(item.id);
      return (
        '<div class="cart-line">' +
          "<div><strong>" + name + "</strong><br>" + money(item.price) + "</div>" +
          '<div class="qty">' +
            '<button type="button" data-dec="' + id + '" aria-label="Quitar uno de ' + name + '">−</button>' +
            "<span>" + item.qty + "</span>" +
            '<button type="button" data-inc="' + id + '" aria-label="Agregar otro de ' + name + '">+</button>' +
          "</div>" +
          "<strong>" + money(item.price * item.qty) + "</strong>" +
        "</div>"
      );
    }).join("");

    var sum = items.reduce(function (acc, item) { return acc + item.price * item.qty; }, 0);
    total.textContent = money(sum);
    send.disabled = false;
  }

  document.querySelectorAll("[data-add]").forEach(function (button) {
    button.addEventListener("click", function () {
      var card = button.closest("[data-id]");
      addItem(card.dataset.id, card.dataset.name, Number(card.dataset.price));
    });
  });

  var cartRoot = document.querySelector("[data-cart-list]");
  if (cartRoot) {
    cartRoot.addEventListener("click", function (event) {
      var inc = event.target.closest("[data-inc]");
      var dec = event.target.closest("[data-dec]");
      if (inc) changeQty(inc.dataset.inc, 1);
      if (dec) changeQty(dec.dataset.dec, -1);
    });
  }

  var form = document.querySelector("#pedido-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });
  }

  var send = document.querySelector("[data-send]");
  if (send) {
    send.addEventListener("click", function () {
      var items = load();
      if (!items.length) return;
      var sede = document.querySelector("#sede");
      var nota = document.querySelector("#nota");
      var lines = items.map(function (item) {
        return "- " + item.qty + " × " + item.name + " (" + money(item.price) + ")";
      });
      var text = "Hola Guerreras FC, quiero ser parte del equipo. Mi pedido de referencia es:\n" +
        lines.join("\n");
      if (sede && sede.value) text += "\nSede: " + sede.value;
      if (nota && nota.value.trim()) text += "\nNota: " + nota.value.trim();
      text += "\n¿Me confirman cupo, talla y cómo realizar el pago?";
      window.open("https://wa.me/573146777099?text=" + encodeURIComponent(text), "_blank", "noopener");
    });
  }

  renderBadge(load());
  renderCart(load());

  var timeline = document.querySelector(".timeline");
  if (timeline) {
    timeline.addEventListener("click", function (event) {
      var control = event.target.closest(".year, .timeline-dot");
      if (!control) return;
      var item = control.closest("li");
      var select = !item.classList.contains("is-current");
      timeline.querySelectorAll("li").forEach(function (entry) {
        var on = select && entry === item;
        entry.classList.toggle("is-current", on);
        entry.querySelectorAll(".year, .timeline-dot").forEach(function (button) {
          button.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
    });
  }
})();
