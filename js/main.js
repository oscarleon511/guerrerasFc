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

  var SEDE_ADDRESS = {
    "Guerreras Sur 1 · Cancha 5.11": "Cra 56 #12a-01, Cali, Valle del Cauca",
    "Guerreras Sur 2 · Cancha Tiro de Esquina": "Cra 70 #13-90, Cali, Valle del Cauca",
    "Guerreras Norte · Cancha Wembley": "Calle 58 Norte con Avenida 3 Norte, Cali, Valle del Cauca",
    "Guerreras Ciudad del Campo · Cancha Campo Verde": "Cra 7U #93-171, Juanchito, Valle del Cauca"
  };

  function sedeLabelHtml(value, empty) {
    if (!value) return empty;
    var address = SEDE_ADDRESS[value];
    var html = escapeHtml(value);
    if (address) html += '<span class="sede-address">' + escapeHtml(address) + "</span>";
    return html;
  }

  function renderBadge(items) {
    var count = items.reduce(function (sum, item) { return sum + item.qty; }, 0);
    document.querySelectorAll("[data-cart-count]").forEach(function (node) {
      node.textContent = count ? "(" + count + ")" : "";
    });
    document.querySelectorAll("[data-product-count]").forEach(function (node) {
      var id = node.getAttribute("data-product-count");
      var found = items.find(function (item) { return item.id === id; });
      var qty = found ? found.qty : 0;
      node.textContent = qty;
      var button = node.closest("[data-product-cart]");
      if (button) {
        var name = button.closest("[data-name]").getAttribute("data-name");
        button.setAttribute("aria-label", "Ver " + name + " en tu pedido, " + qty + (qty === 1 ? " unidad" : " unidades"));
      }
    });
  }

  var SIZES = [
    ["xs", "XS"],
    ["s", "S"],
    ["m", "M"],
    ["l", "L"],
    ["xl", "XL"]
  ];
  var KIT = "El uniforme incluye camiseta, pantaloneta y medias. El número de la camiseta se acuerda con el entrenador.";
  var ID_ERROR = "Guerreras id enter seems to be incorrect, please try again";
  var showProblems = false;
  var refreshSend = function () {};
  var paintInscripcion = function () {};

  function isUniform(id) {
    return id === "entrenamiento" || id === "competencia";
  }

  function validGuerrerasId(value) {
    return /^\d{4,10}$/.test(String(value).trim());
  }

  function addItem(id, name, price) {
    var items = load();
    var found = items.find(function (item) { return item.id === id; });
    if (found) found.qty += 1;
    else items.push({ id: id, name: name, price: price, qty: 1, size: "" });
    save(items);
  }

  function changeQty(id, delta) {
    var items = load().map(function (item) {
      if (item.id === id) item.qty += delta;
      return item;
    }).filter(function (item) { return item.qty > 0; });
    save(items);
  }

  function setSize(id, size) {
    var items = load();
    items.forEach(function (item) {
      if (item.id === id) item.size = size;
    });
    localStorage.setItem(KEY, JSON.stringify(items));
    refreshSend();
  }

  function addInscripcion() {
    var items = load();
    if (items.some(function (item) { return item.id === "inscripcion"; })) return;
    items.push({ id: "inscripcion", name: "Inscripción", price: 70000, qty: 1, size: "" });
    save(items);
  }

  function removeInscripcion() {
    save(load().filter(function (item) { return item.id !== "inscripcion"; }));
  }

  function renderCart(items) {
    var list = document.querySelector("[data-cart-list]");
    var total = document.querySelector("[data-cart-total]");
    var send = document.querySelector("[data-send]");
    if (!list || !total || !send) return;

    if (!items.length) {
      list.innerHTML = "<p>Todavía no hay artículos. Agrega la inscripción, la mensualidad o un uniforme.</p>";
      total.textContent = money(0);
      paintInscripcion();
      refreshSend();
      return;
    }

    list.innerHTML = items.map(function (item) {
      var name = escapeHtml(item.name);
      var id = escapeHtml(item.id);
      var extra = "";
      if (isUniform(item.id)) {
        var options = '<option value="">Elige la talla</option>' + SIZES.map(function (size) {
          var selected = item.size === size[0] ? " selected" : "";
          return '<option value="' + size[0] + '"' + selected + ">" + size[1] + "</option>";
        }).join("");
        var sizeInvalid = showProblems && !item.size;
        extra =
          '<label class="field cart-size">Talla' +
            '<select data-size="' + id + '"' + (sizeInvalid ? ' class="is-invalid" aria-invalid="true"' : "") + ">" + options + "</select>" +
            (sizeInvalid ? '<span class="field-error is-on">Elige una talla.</span>' : "") +
          "</label>" +
          '<p class="cart-kit">' + KIT + "</p>";
      }
      var qty = item.id === "inscripcion"
        ? '<button type="button" data-dec="' + id + '" aria-label="Quitar ' + name + '">−</button>'
        : '<button type="button" data-dec="' + id + '" aria-label="Quitar uno de ' + name + '">−</button>' +
          "<span>" + item.qty + "</span>" +
          '<button type="button" data-inc="' + id + '" aria-label="Agregar otro de ' + name + '">+</button>';
      var units = item.qty > 1 ? '<p class="cart-unit">' + item.qty + " × " + money(item.price) + "</p>" : "";
      return (
        '<article class="cart-item">' +
          '<div class="cart-item-head"><span class="cart-name">' + name + '</span><strong class="cart-line-total">' + money(item.price * item.qty) + "</strong></div>" +
          units +
          extra +
          '<div class="cart-item-foot"><div class="qty">' + qty + "</div></div>" +
        "</article>"
      );
    }).join("");
    list.innerHTML = '<p class="cart-heading">Artículos</p><div class="cart-items">' + list.innerHTML + "</div>";

    var sum = items.reduce(function (acc, item) { return acc + item.price * item.qty; }, 0);
    total.textContent = money(sum);
    paintInscripcion();
    refreshSend();
  }

  document.querySelectorAll("[data-add]").forEach(function (button) {
    button.addEventListener("click", function () {
      var card = button.closest("[data-id]");
      addItem(card.dataset.id, card.dataset.name, Number(card.dataset.price));
    });
  });

  document.querySelectorAll("[data-product-cart]").forEach(function (button) {
    button.addEventListener("click", function () {
      var order = document.querySelector("#pedido");
      if (order) order.scrollIntoView({ behavior: "smooth", block: "start" });
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
    cartRoot.addEventListener("change", function (event) {
      var select = event.target.closest("[data-size]");
      if (!select) return;
      setSize(select.getAttribute("data-size"), select.value);
      if (select.value) {
        select.classList.remove("is-invalid");
        select.removeAttribute("aria-invalid");
        var error = select.parentNode.querySelector(".field-error");
        if (error) error.remove();
      }
    });
  }

  var form = document.querySelector("#pedido-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });

    var pedidoName = document.querySelector("#pedido-name");
    var memberSwitch = document.querySelector("#member-switch");
    var memberLabel = document.querySelector("#member-switch-label");
    var existingPlayer = document.querySelector("#existing-player");
    var pedidoId = document.querySelector("#pedido-id");
    var idCheck = document.querySelector("#id-check");
    var idError = document.querySelector("#id-error");
    var nameError = form.querySelector("[data-error-for='pedido-name']");
    var nota = document.querySelector("#nota");
    var notaCount = form.querySelector("[data-nota-count]");
    var sede = document.querySelector("#sede");
    var orderSedeBtn = document.querySelector("#sede-btn");
    var orderSedeLabel = document.querySelector("[data-order-sede-label]");
    var orderSedeList = document.querySelector("#sede-list");
    var idStatus = "";

    function paintClear(input) {
      var clear = form.querySelector("[data-clear-for='" + input.id + "']");
      if (clear) clear.classList.toggle("is-on", input.value.length >= 1);
    }

    function paintId() {
      var has = pedidoId.value.length >= 1;
      idCheck.disabled = !has;
      idCheck.classList.toggle("is-valid", idStatus === "valid");
      idCheck.classList.toggle("is-invalid", idStatus === "invalid");
      var message = idStatus === "invalid" ? ID_ERROR : "";
      idError.textContent = message;
      idError.classList.toggle("is-on", Boolean(message));
      pedidoId.classList.toggle("is-invalid", Boolean(message));
      if (message) pedidoId.setAttribute("aria-invalid", "true");
      else pedidoId.removeAttribute("aria-invalid");
      paintClear(pedidoId);
    }

    function paintName() {
      paintClear(pedidoName);
      var message = showProblems && !pedidoName.value.trim() ? "Completa este campo." : "";
      nameError.textContent = message;
      nameError.classList.toggle("is-on", Boolean(message));
      pedidoName.classList.toggle("is-invalid", Boolean(message));
    }

    function paintNota() {
      notaCount.textContent = nota.value.length + " / 4000";
    }

    function existingOn() {
      return memberSwitch.getAttribute("aria-checked") === "true";
    }

    function hasInscripcion() {
      return load().some(function (item) { return item.id === "inscripcion"; });
    }

    paintInscripcion = function () {
      var button = document.querySelector("#add-inscripcion");
      if (!button) return;
      button.hidden = existingOn() || hasInscripcion();
    };

    refreshSend = function () {
      var send = document.querySelector("[data-send]");
      if (!send) return;
      var items = load();
      var missingSize = items.some(function (item) { return isUniform(item.id) && !item.size; });
      var memberOk = !existingOn() || idStatus === "valid";
      send.disabled = !pedidoName.value.trim() || !memberOk || missingSize || !sede.value || !nota.value.trim() || !items.length;
    };

    memberSwitch.addEventListener("click", function () {
      var on = !existingOn();
      memberSwitch.setAttribute("aria-checked", on ? "true" : "false");
      memberLabel.textContent = on ? "Jugadora existente" : "Nueva integrante";
      existingPlayer.hidden = !on;
      if (!on) idStatus = "";
      if (on && hasInscripcion()) removeInscripcion();
      paintId();
      paintInscripcion();
      refreshSend();
    });

    document.querySelector("#add-inscripcion").addEventListener("click", addInscripcion);

    pedidoName.addEventListener("input", function () {
      paintName();
      refreshSend();
    });
    pedidoId.addEventListener("input", function () {
      idStatus = "";
      paintId();
      refreshSend();
    });
    nota.addEventListener("input", function () {
      paintNota();
      refreshSend();
    });
    function paintOrderSede() {
      orderSedeLabel.innerHTML = sedeLabelHtml(sede.value, "Todavía no elijo");
      orderSedeBtn.classList.toggle("is-placeholder", !sede.value);
      orderSedeList.querySelectorAll("[role='option']").forEach(function (option) {
        option.setAttribute("aria-selected", option.getAttribute("data-value") === sede.value ? "true" : "false");
      });
    }

    function closeOrderSede() {
      orderSedeList.hidden = true;
      orderSedeBtn.setAttribute("aria-expanded", "false");
    }

    orderSedeBtn.addEventListener("click", function () {
      var open = orderSedeList.hidden;
      orderSedeList.hidden = !open;
      orderSedeBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    orderSedeList.addEventListener("click", function (event) {
      var option = event.target.closest("[role='option']");
      if (!option) return;
      sede.value = option.getAttribute("data-value");
      paintOrderSede();
      closeOrderSede();
      refreshSend();
    });

    document.addEventListener("click", function (event) {
      if (!event.target.closest("#pedido-form .sede-pick")) closeOrderSede();
    });

    sede.addEventListener("change", function () {
      paintOrderSede();
      refreshSend();
    });
    paintOrderSede();
    paintName();
    paintId();
    paintNota();
    paintInscripcion();
    refreshSend();

    form.addEventListener("click", function (event) {
      var clear = event.target.closest("[data-clear-for]");
      if (!clear) return;
      var input = document.getElementById(clear.getAttribute("data-clear-for"));
      input.value = "";
      if (input === pedidoId) idStatus = "";
      paintName();
      paintId();
      refreshSend();
      input.focus();
    });

    idCheck.addEventListener("click", function () {
      if (idCheck.disabled) return;
      idStatus = validGuerrerasId(pedidoId.value) ? "valid" : "invalid";
      paintId();
      refreshSend();
    });

    document.body.insertAdjacentHTML("beforeend",
      '<dialog class="join-dialog order-dialog" data-order-dialog aria-labelledby="order-title">' +
        '<div class="join-card">' +
          '<div class="join-body">' +
            '<h2 id="order-title">Revisa tu pedido</h2>' +
            '<div data-order-summary></div>' +
          '</div>' +
          '<div class="join-actions">' +
            '<button class="btn btn-ghost" type="button" data-order-edit>Editar</button>' +
            '<button class="btn btn-ghost" type="button" data-order-cancel>Cancelar pedido</button>' +
            '<button class="btn" type="button" data-order-send>Enviar pedido</button>' +
          '</div>' +
        '</div>' +
      '</dialog>' +
      '<dialog class="join-dialog" data-order-sent>' +
        '<div class="join-card">' +
          '<p class="join-thanks">Tu pedido ha sido enviado y un entrenador responderá tu solicitud dentro de 24 horas.</p>' +
          '<div class="join-actions">' +
            '<button class="btn" type="button" data-order-sent-close>Cerrar</button>' +
          '</div>' +
        '</div>' +
      '</dialog>'
    );

    var orderDialog = document.querySelector("[data-order-dialog]");
    var orderSummary = orderDialog.querySelector("[data-order-summary]");
    var orderSent = document.querySelector("[data-order-sent]");

    function sizeLabel(value) {
      var match = SIZES.find(function (size) { return size[0] === value; });
      return match ? match[1] : "";
    }

    function readOrder() {
      return {
        items: load(),
        name: pedidoName.value.trim(),
        existing: existingOn(),
        guerrerasId: pedidoId.value.trim(),
        idOk: !existingOn() || idStatus === "valid",
        sede: sede.value,
        nota: nota.value.trim()
      };
    }

    function orderProblems(order) {
      var missingSize = order.items.some(function (item) { return isUniform(item.id) && !item.size; });
      var memberOk = !order.existing || order.idOk;
      return !order.name || !memberOk || missingSize || !order.sede || !order.nota || !order.items.length;
    }

    function paintOrder(order) {
      var member = order.existing ? "Jugadora existente · ID " + order.guerrerasId : "Nueva integrante";
      var lines = order.items.map(function (item) {
        var detail = item.qty + " × " + money(item.price);
        if (isUniform(item.id)) detail += " · Talla " + sizeLabel(item.size);
        var kit = isUniform(item.id) ? '<p class="cart-kit">' + KIT + "</p>" : "";
        return '<article class="cart-item"><div class="cart-item-head"><span class="cart-name">' + escapeHtml(item.name) + '</span><strong class="cart-line-total">' + money(item.price * item.qty) + '</strong></div><p class="cart-unit">' + escapeHtml(detail) + "</p>" + kit + "</article>";
      }).join("");
      var sum = order.items.reduce(function (acc, item) { return acc + item.price * item.qty; }, 0);
      var sedeText = sedeLabelHtml(order.sede, "Todavía no elijo");
      var noteBlock = order.nota ? '<div class="order-block"><p class="order-label">Nota</p><p>' + escapeHtml(order.nota) + "</p></div>" : "";
      orderSummary.innerHTML =
        '<div class="order-block"><p class="order-label">Nombre completo</p><p>' + escapeHtml(order.name) + "</p></div>" +
        '<div class="order-block"><p class="order-label">Integrante</p><p>' + escapeHtml(member) + "</p></div>" +
        '<p class="cart-heading">Artículos</p><div class="cart-items">' + lines + "</div>" +
        '<p class="cart-total">Total de referencia <strong>' + money(sum) + "</strong></p>" +
        '<div class="order-block"><p class="order-label">Sede de interés o dónde recoger el pedido</p><p>' + sedeText + "</p></div>" +
        noteBlock;
    }

    function whatsAppText(order) {
      var lines = order.items.map(function (item) {
        var size = isUniform(item.id) ? ", talla " + sizeLabel(item.size) : "";
        return "- " + item.qty + " × " + item.name + size + " (" + money(item.price) + ") = " + money(item.price * item.qty);
      });
      var sum = order.items.reduce(function (acc, item) { return acc + item.price * item.qty; }, 0);
      var text = "Hola Guerreras FC, quiero hacer este pedido.\n\n" +
        "Nombre: " + order.name + "\n" +
        (order.existing ? "Jugadora existente\nID Guerreras: " + order.guerrerasId : "Nueva integrante") +
        "\n\n" + lines.join("\n");
      if (order.items.some(function (item) { return isUniform(item.id); })) {
        text += "\n\n" + KIT;
      }
      text += "\n\nTotal de referencia: " + money(sum);
      text += "\nSede: " + (order.sede || "Todavía no elijo");
      if (SEDE_ADDRESS[order.sede]) text += "\nDirección: " + SEDE_ADDRESS[order.sede];
      if (order.nota) text += "\nNota: " + order.nota;
      text += "\n\n¿Me confirman cupo y cómo realizar el pago?";
      return text;
    }

    document.querySelector("[data-send]").addEventListener("click", function () {
      var order = readOrder();
      if (!order.items.length) return;
      showProblems = true;
      paintName();
      renderCart(order.items);
      if (order.existing && idStatus !== "valid") {
        if (!pedidoId.value.trim()) {
          idError.textContent = "Completa este campo.";
          idError.classList.add("is-on");
          pedidoId.classList.add("is-invalid");
        } else if (idStatus !== "invalid") {
          idError.textContent = "Confirma el ID Guerreras.";
          idError.classList.add("is-on");
        }
      }
      if (orderProblems(order)) {
        var focus = !order.name ? pedidoName : (order.existing && idStatus !== "valid" ? pedidoId : form.querySelector("[data-size].is-invalid"));
        if (focus) focus.focus();
        return;
      }
      paintOrder(order);
      orderDialog.showModal();
    });

    orderDialog.querySelector("[data-order-edit]").addEventListener("click", function () {
      orderDialog.close();
      var order = document.querySelector("#pedido");
      if (order) order.scrollIntoView({ behavior: "smooth", block: "start" });
      pedidoName.focus();
    });

    orderDialog.querySelector("[data-order-cancel]").addEventListener("click", function () {
      orderDialog.close();
    });

    orderDialog.addEventListener("click", function (event) {
      if (event.target === orderDialog) orderDialog.close();
    });

    orderDialog.querySelector("[data-order-send]").addEventListener("click", function () {
      var order = readOrder();
      if (orderProblems(order)) {
        orderDialog.close();
        document.querySelector("[data-send]").click();
        return;
      }
      window.open("https://wa.me/573146777099?text=" + encodeURIComponent(whatsAppText(order)), "_blank", "noopener");
      orderDialog.close();
      orderSent.showModal();
    });

    function clearOrder() {
      pedidoName.value = "";
      nota.value = "";
      sede.value = "";
      pedidoId.value = "";
      idStatus = "";
      showProblems = false;
      memberSwitch.setAttribute("aria-checked", "false");
      memberLabel.textContent = "Nueva integrante";
      existingPlayer.hidden = true;
      paintName();
      paintId();
      paintNota();
      paintOrderSede();
      save([]);
    }

    orderSent.querySelector("[data-order-sent-close]").addEventListener("click", function () {
      orderSent.close();
    });

    orderSent.addEventListener("click", function (event) {
      if (event.target === orderSent) orderSent.close();
    });

    orderSent.addEventListener("close", clearOrder);
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
            '<div class="field">Sede de interés' +
              '<div class="sede-pick">' +
                '<button class="sede-pick-btn" id="join-sede-btn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="join-sede-list">' +
                  '<span data-sede-label>Elige una sede</span>' +
                  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</button>' +
                '<ul class="sede-pick-list" id="join-sede-list" role="listbox" hidden>' +
                  '<li role="option" data-value="" aria-selected="true">Elige una sede</li>' +
                  '<li role="option" data-value="Guerreras Sur 1 · Cancha 5.11">Guerreras Sur 1 · Cancha 5.11<span class="sede-address">Cra 56 #12a-01, Cali, Valle del Cauca</span></li>' +
                  '<li role="option" data-value="Guerreras Sur 2 · Cancha Tiro de Esquina">Guerreras Sur 2 · Cancha Tiro de Esquina<span class="sede-address">Cra 70 #13-90, Cali, Valle del Cauca</span></li>' +
                  '<li role="option" data-value="Guerreras Norte · Cancha Wembley">Guerreras Norte · Cancha Wembley<span class="sede-address">Calle 58 Norte con Avenida 3 Norte, Cali, Valle del Cauca</span></li>' +
                  '<li role="option" data-value="Guerreras Ciudad del Campo · Cancha Campo Verde">Guerreras Ciudad del Campo · Cancha Campo Verde<span class="sede-address">Cra 7U #93-171, Juanchito, Valle del Cauca</span></li>' +
                '</ul>' +
                '<input id="join-sede" name="sede" data-join-sede type="hidden" value="">' +
              '</div>' +
              '<span class="field-error" data-error-for="join-sede"></span>' +
            '</div>' +
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
    var sedeButton = joinDialog.querySelector(".sede-pick-btn");
    var sedeLabel = joinDialog.querySelector("[data-sede-label]");
    var sedeList = joinDialog.querySelector(".sede-pick-list");
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
      if (pageSede && saved.sede) {
        pageSede.value = saved.sede;
        pageSede.dispatchEvent(new Event("change"));
      }
    } catch (error) {}

    function showError(input, message) {
      var error = joinForm.querySelector("[data-error-for='" + input.id + "']");
      var target = input.id === "join-sede" ? sedeButton : input;
      target.classList.toggle("is-invalid", Boolean(message));
      if (message) target.setAttribute("aria-invalid", "true");
      else target.removeAttribute("aria-invalid");
      if (!error) return;
      error.textContent = message || "";
      error.classList.toggle("is-on", Boolean(message));
    }

    function closeSedeList() {
      sedeList.hidden = true;
      sedeButton.setAttribute("aria-expanded", "false");
    }

    function paintSedeLabel() {
      sedeLabel.innerHTML = sedeLabelHtml(joinSede.value, "Elige una sede");
      sedeButton.classList.toggle("is-placeholder", !joinSede.value);
      sedeList.querySelectorAll("[role='option']").forEach(function (option) {
        option.setAttribute("aria-selected", option.getAttribute("data-value") === joinSede.value ? "true" : "false");
      });
    }

    sedeButton.addEventListener("click", function () {
      var open = sedeList.hidden;
      sedeList.hidden = !open;
      sedeButton.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        var selected = sedeList.querySelector("[aria-selected='true']");
        if (selected) selected.scrollIntoView({ block: "nearest" });
      }
    });

    sedeList.addEventListener("click", function (event) {
      var option = event.target.closest("[role='option']");
      if (!option) return;
      joinSede.value = option.getAttribute("data-value");
      paintSedeLabel();
      closeSedeList();
      showError(joinSede, "");
      paintSend();
    });

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
        closeSedeList();
        paintSedeLabel();
        joinForm.querySelectorAll(".is-invalid").forEach(function (input) {
          showError(input, "");
        });
        sedeButton.classList.remove("is-invalid");
        sedeButton.removeAttribute("aria-invalid");
        paintCount();
        paintSend();
        joinDialog.showModal();
      });
    });

    joinDialog.querySelector("[data-join-cancel]").addEventListener("click", function () {
      joinDialog.close();
    });

    joinDialog.addEventListener("click", function (event) {
      if (!event.target.closest(".sede-pick")) closeSedeList();
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
        (firstInvalid.id === "join-sede" ? sedeButton : firstInvalid).focus();
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
