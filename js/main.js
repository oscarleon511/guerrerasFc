(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var KEY = "guerreras-pedido";
  var EXTRA = "guerreras-pedido-extra";

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
      var extra = {};
      try { extra = JSON.parse(localStorage.getItem(EXTRA)) || {}; } catch (error) { extra = {}; }
      if (sede && !sede.value && extra.sede) sede.value = extra.sede;
      if (sede && sede.value) text += "\nSede: " + sede.value;
      if (extra.pago) text += "\nPago: " + extra.pago;
      if (nota && nota.value.trim()) text += "\nNota: " + nota.value.trim();
      text += "\n¿Me confirman cupo, talla y cómo realizar el pago?";
      window.open("https://wa.me/573146777099?text=" + encodeURIComponent(text), "_blank", "noopener");
    });
  }

  renderBadge(load());
  renderCart(load());

  if (!document.querySelector("[data-join-dialog]")) {
    document.body.insertAdjacentHTML("beforeend",
      '<dialog class="join-dialog" data-join-dialog aria-labelledby="join-title">' +
        '<form class="join-card" id="join-form">' +
          '<div class="join-body">' +
            '<h2 id="join-title">Quiero ser Guerrera</h2>' +
            '<p class="join-lead">Gracias por interesarte en ser parte de nuestro equipo. Ten en cuenta que el primer paso para entrar a la familia incluye la evaluación para ubicarte en la categoría A, B o C. Por favor provee la siguiente información.</p>' +
            '<label class="field" for="join-sede">Sede de interés' +
              '<select id="join-sede" name="sede" data-join-sede required>' +
                '<option value="">Elige una sede</option>' +
                '<option>Norte · El Monumental</option>' +
                '<option>Sur 1 · Tiro de Esquina</option>' +
                '<option>Sur 2 · Cancha 5.11</option>' +
              '</select>' +
              '<span class="field-error" data-error-for="join-sede"></span>' +
            '</label>' +
            '<label class="field" for="join-name">Nombre' +
              '<input id="join-name" name="nombre" type="text" autocomplete="name" required>' +
              '<span class="field-error" data-error-for="join-name"></span>' +
            '</label>' +
            '<label class="field" for="join-phone">Teléfono' +
              '<input id="join-phone" name="telefono" type="tel" autocomplete="tel" inputmode="tel" required>' +
              '<span class="field-error" data-error-for="join-phone"></span>' +
            '</label>' +
            '<label class="field" for="join-age">Edad' +
              '<input id="join-age" name="edad" type="number" inputmode="numeric" min="18" step="1" required aria-describedby="join-age-error">' +
              '<span class="field-error" id="join-age-error" data-error-for="join-age"></span>' +
            '</label>' +
            '<label class="field" for="join-notes">Notas' +
              '<textarea id="join-notes" name="notas" rows="4" maxlength="4000" placeholder="Déjanos saber más sobre ti" required></textarea>' +
              '<span class="char-count" data-note-count>0 / 4000</span>' +
              '<span class="field-error" data-error-for="join-notes"></span>' +
            '</label>' +
          '</div>' +
          '<div class="join-actions">' +
            '<button class="btn btn-ghost" type="button" data-join-cancel>Cancelar</button>' +
            '<button class="btn" type="submit" disabled>Quiero ser Guerrera</button>' +
          '</div>' +
        '</form>' +
      '</dialog>' +
      '<dialog class="join-dialog" data-join-thanks>' +
        '<div class="join-card">' +
          '<p class="join-thanks">Hemos recibido tu mensaje, un entrenador te contactará lo más pronto posible.</p>' +
          '<div class="join-actions">' +
            '<button class="btn" type="button" data-thanks-close>Cerrar</button>' +
          '</div>' +
        '</div>' +
      '</dialog>'
    );
  }

  var joinDialog = document.querySelector("[data-join-dialog]");
  var joinButtons = document.querySelectorAll("[data-join]");
  if (joinDialog && joinButtons.length) {
    var joinForm = document.querySelector("#join-form");
    var joinSede = joinDialog.querySelector("[data-join-sede]");
    var joinName = document.querySelector("#join-name");
    var joinPhone = document.querySelector("#join-phone");
    var joinAge = document.querySelector("#join-age");
    var joinNotes = document.querySelector("#join-notes");
    var noteCount = joinDialog.querySelector("[data-note-count]");
    var joinSend = joinForm.querySelector('button[type="submit"]');
    var thanks = document.querySelector("[data-join-thanks]");
    var pageSede = document.querySelector("#sede");
    var AGE_MSG = "La inscripción está abierta a mujeres mayores de 18 años en adelante";

    try {
      var saved = JSON.parse(localStorage.getItem(EXTRA)) || {};
      if (pageSede && saved.sede) pageSede.value = saved.sede;
    } catch (error) {}

    function showError(input, message) {
      var error = joinForm.querySelector("[data-error-for='" + input.id + "']");
      input.classList.toggle("is-invalid", Boolean(message));
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
      if (!error) return;
      error.textContent = message || "";
      error.classList.toggle("is-on", Boolean(message));
    }

    function ageMessage(value) {
      if (!String(value).trim()) return "Completa este campo.";
      var age = Number(value);
      if (!Number.isFinite(age) || age < 18) return AGE_MSG;
      return "";
    }

    function paintCount() {
      noteCount.textContent = joinNotes.value.length + " / 4000";
    }

    function formReady() {
      var age = Number(joinAge.value);
      return Boolean(joinSede.value) &&
        Boolean(joinName.value.trim()) &&
        Boolean(joinPhone.value.trim()) &&
        Boolean(joinNotes.value.trim()) &&
        Number.isFinite(age) &&
        age >= 18;
    }

    function paintSend() {
      joinSend.disabled = !formReady();
    }

    joinForm.addEventListener("input", function () {
      paintCount();
      paintSend();
    });
    joinForm.addEventListener("change", paintSend);

    joinAge.addEventListener("input", function () {
      if (!joinAge.value.trim()) {
        showError(joinAge, "");
        return;
      }
      showError(joinAge, ageMessage(joinAge.value));
    });

    joinButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        closeMenu();
        joinForm.reset();
        joinForm.querySelectorAll(".is-invalid").forEach(function (input) {
          showError(input, "");
        });
        paintCount();
        paintSend();
        joinDialog.showModal();
      });
    });

    joinDialog.querySelector("[data-join-cancel]").addEventListener("click", function () {
      joinDialog.close();
    });

    joinDialog.addEventListener("click", function (event) {
      if (event.target === joinDialog) joinDialog.close();
    });

    joinForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var fields = [
        [joinSede, joinSede.value ? "" : "Completa este campo."],
        [joinName, joinName.value.trim() ? "" : "Completa este campo."],
        [joinPhone, joinPhone.value.trim() ? "" : "Completa este campo."],
        [joinAge, ageMessage(joinAge.value)],
        [joinNotes, joinNotes.value.trim() ? "" : "Completa este campo."]
      ];
      var firstInvalid = null;
      fields.forEach(function (pair) {
        showError(pair[0], pair[1]);
        if (pair[1] && !firstInvalid) firstInvalid = pair[0];
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      var text = "Hola Alex Rueda, quiero ser parte de Guerreras FC.\n\n" +
        "Nombre: " + joinName.value.trim() + "\n" +
        "Teléfono: " + joinPhone.value.trim() + "\n" +
        "Edad: " + joinAge.value.trim() + "\n" +
        "Sede: " + joinSede.value + "\n" +
        "Notas: " + joinNotes.value.trim();
      window.open("https://wa.me/573146777099?text=" + encodeURIComponent(text), "_blank", "noopener");
      joinDialog.close();
      thanks.showModal();
    });

    thanks.querySelector("[data-thanks-close]").addEventListener("click", function () {
      thanks.close();
    });

    thanks.addEventListener("click", function (event) {
      if (event.target === thanks) thanks.close();
    });
  }

  var heroLogo = document.querySelector(".hero-logo");
  if (heroLogo) {
    var seen = false;
    try { seen = sessionStorage.getItem("guerreras-logo-spin") === "1"; } catch (error) { seen = false; }
    if (!seen) {
      heroLogo.classList.add("is-kick");
      try { sessionStorage.setItem("guerreras-logo-spin", "1"); } catch (error) {}
      heroLogo.addEventListener("animationend", function () {
        heroLogo.classList.remove("is-kick");
      });
    }
  }

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
