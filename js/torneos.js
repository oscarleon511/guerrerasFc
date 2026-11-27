(function () {
  var list = document.getElementById("cup-list");
  var stages = [
    ["group", "Fase de grupos"],
    ["r16", "Octavos de final"],
    ["quarter", "Cuartos de final"],
    ["semi", "Semifinal"],
    ["final", "Final"],
    ["third", "Tercer puesto"],
    ["match", "Partidos"]
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function rich(value) {
    var allowed = { b: 1, strong: 1, i: 1, em: 1, u: 1, p: 1, br: 1, ul: 1, ol: 1, li: 1, div: 1 };
    return String(value || "").replace(/<[^>]+>/g, function (tag) {
      var match = /^<\s*(\/)?\s*([a-z0-9]+)/i.exec(tag);
      if (!match || !allowed[match[2].toLowerCase()]) return "";
      var name = match[2].toLowerCase();
      if (name === "br") return "<br>";
      return match[1] ? "</" + name + ">" : "<" + name + ">";
    });
  }

  function clock(value) {
    var match = /^(\d{2}):(\d{2})$/.exec(value || "");
    if (!match) return "";
    var hour = Number(match[1]);
    var shown = hour % 12 || 12;
    return shown + ":" + match[2] + " " + (hour < 12 ? "a. m." : "p. m.");
  }

  function day(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return "";
    var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function teamById(teams, id) {
    for (var i = 0; i < teams.length; i += 1) if (teams[i].id === id) return teams[i];
    return null;
  }

  function logo(team) {
    if (!team || !team.logo) return "";
    return "/api/tournaments/media?id=" + encodeURIComponent(team.id) + "&file=" + encodeURIComponent(team.logo);
  }

  function side(team, label, away) {
    var name = team ? team.name : (label || "Por definir");
    var mark = logo(team);
    var image = mark ? "<img src=\"" + escapeHtml(mark) + "\" alt=\"\">" : "";
    return "<div class=\"cup-side" + (away ? " is-away" : "") + "\">" + image + "<span>" + escapeHtml(name) + "</span></div>";
  }

  function when(match) {
    var bits = [];
    if (match.field) bits.push(match.field);
    if (match.date) bits.push(day(match.date));
    if (match.time) bits.push(clock(match.time));
    return bits.length ? "<p class=\"cup-when\">" + escapeHtml(bits.join(" · ")) + "</p>" : "";
  }

  function matchHtml(match, teams) {
    return "<article class=\"cup-match\">" +
      side(teamById(teams, match.team1Id), match.label1, false) +
      "<span class=\"cup-score\">vs</span>" +
      side(teamById(teams, match.team2Id), match.label2, true) +
      when(match) +
      "</article>";
  }

  function teamCard(team) {
    var mark = logo(team);
    var image = mark ? "<img src=\"" + escapeHtml(mark) + "\" alt=\"\">" : "";
    var info = team.info ? "<div class=\"cup-info\">" + rich(team.info) + "</div>" : "";
    return "<figure class=\"cup-team\">" + image + "<figcaption>" + escapeHtml(team.name) + "</figcaption>" + info + "</figure>";
  }

  function groups(matches, teams) {
    var letters = [];
    matches.forEach(function (match) {
      if (match.stage === "group" && match.group && letters.indexOf(match.group) === -1) letters.push(match.group);
    });
    letters.sort();
    if (!letters.length) return "";
    return "<h3>Grupos</h3>" + letters.map(function (letter) {
      var rows = matches.filter(function (match) { return match.stage === "group" && match.group === letter; });
      return "<section class=\"cup-group\"><h3>Grupo " + escapeHtml(letter) + "</h3><div class=\"cup-matches\">" + rows.map(function (match) { return matchHtml(match, teams); }).join("") + "</div></section>";
    }).join("");
  }

  function knockout(matches, teams) {
    var html = stages.filter(function (stage) { return stage[0] !== "group"; }).map(function (stage) {
      var rows = matches.filter(function (match) { return match.stage === stage[0]; });
      if (!rows.length) return "";
      return "<h3>" + stage[1] + "</h3><div class=\"cup-matches\">" + rows.map(function (match) { return matchHtml(match, teams); }).join("") + "</div>";
    }).join("");
    var groupRows = matches.some(function (match) { return match.stage === "group"; });
    if (!groupRows) {
      var plain = matches.filter(function (match) { return match.stage === "match"; });
      if (plain.length && html.indexOf("Partidos") === -1) {
        html = "<h3>Partidos</h3><div class=\"cup-matches\">" + plain.map(function (match) { return matchHtml(match, teams); }).join("") + "</div>" + html;
      }
    }
    return html;
  }

  function tournamentCard(cup, teams, matches) {
    var ownTeams = teams.filter(function (team) { return team.tournamentId === cup.id; });
    var ownMatches = matches.filter(function (match) { return match.tournamentId === cup.id; });
    var meta = [];
    if (cup.location) meta.push(cup.location);
    if (cup.date) meta.push(day(cup.date));
    if (cup.time) meta.push(clock(cup.time));
    return "<article class=\"cup-card\" id=\"" + escapeHtml(cup.id) + "\"><h2>" + escapeHtml(cup.name) + "</h2>" +
      (meta.length ? "<p class=\"cup-meta\">" + escapeHtml(meta.join(" · ")) + "</p>" : "") +
      (cup.address ? "<p class=\"cup-address\">" + escapeHtml(cup.address) + "</p>" : "") +
      (cup.info ? "<div class=\"cup-info\">" + rich(cup.info) + "</div>" : "") +
      (ownTeams.length ? "<h3>Equipos</h3><div class=\"cup-teams\">" + ownTeams.map(teamCard).join("") + "</div>" : "") +
      groups(ownMatches, teams) +
      knockout(ownMatches, teams) +
      "</article>";
  }

  fetch("/api/tournaments", { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      var cups = data && Array.isArray(data.tournaments) ? data.tournaments : [];
      var teams = data && Array.isArray(data.teams) ? data.teams : [];
      var matches = data && Array.isArray(data.matches) ? data.matches : [];
      var free = teams.filter(function (team) { return !team.tournamentId; });
      if (!cups.length && !free.length) {
        list.innerHTML = "<p>Todavía no hay torneos publicados.</p>";
        return;
      }
      var html = cups.map(function (cup) { return tournamentCard(cup, teams, matches); }).join("");
      if (free.length) {
        html += "<article class=\"cup-card\"><h2>Equipos</h2><p class=\"cup-meta\">Estos equipos no están en un torneo.</p><div class=\"cup-teams\">" + free.map(teamCard).join("") + "</div></article>";
      }
      list.innerHTML = html;
    })
    .catch(function () {
      list.innerHTML = "<p>No se pudieron cargar los torneos.</p>";
    });
})();
