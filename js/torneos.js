(function () {
  var list = document.getElementById("cup-list");
  var stages = [
    ["group", "Fase de grupos"],
    ["r16", "Octavos de final"],
    ["quarter", "Cuartos de final"],
    ["semi", "Semifinal"],
    ["third", "Tercer puesto"],
    ["final", "Final"],
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

  function side(team, label, away, champion) {
    var name = team ? team.name : (label || "Por definir");
    var mark = logo(team);
    var image = mark ? "<img src=\"" + escapeHtml(mark) + "\" alt=\"\">" : "";
    var badge = champion ? "<span class=\"cup-champion-badge\">Campeón</span>" : "";
    return "<div class=\"cup-side" + (away ? " is-away" : "") + (champion ? " is-champion" : "") + "\">" + image + "<span>" + escapeHtml(name) + badge + "</span></div>";
  }

  function winnerSide(match) {
    if (!match || match.postponed === true || !match.team1Id || !match.team2Id) return "";
    if (match.withdrawal === "1") return "2";
    if (match.withdrawal === "2") return "1";
    var home = scoreNumber(match.score1);
    var away = scoreNumber(match.score2);
    if (home === null || away === null) return "";
    if (home !== away) return home > away ? "1" : "2";
    if (match.penalties !== true) return "";
    var pensHome = scoreNumber(match.penalty1);
    var pensAway = scoreNumber(match.penalty2);
    if (pensHome === null || pensAway === null || pensHome === pensAway) return "";
    return pensHome > pensAway ? "1" : "2";
  }

  function championId(matches) {
    var finals = matches.filter(function (match) { return match.stage === "final"; });
    if (finals.length !== 1) return "";
    var side = winnerSide(finals[0]);
    if (side === "1") return finals[0].team1Id;
    if (side === "2") return finals[0].team2Id;
    return "";
  }

  function when(match) {
    var bits = [];
    if (match.field) bits.push(match.field);
    if (match.date) bits.push(day(match.date));
    if (match.time) bits.push(clock(match.time));
    return bits.length ? "<p class=\"cup-when\">" + escapeHtml(bits.join(" · ")) + "</p>" : "";
  }

  function scoreNumber(value) {
    if (value === "" || value == null) return null;
    var number = Number(value);
    if (!Number.isInteger(number) || number < 0 || number > 99) return null;
    return number;
  }

  function scoreLabel(match) {
    if (match.postponed === true) return "Aplazado";
    if (match.withdrawal === "1" || match.withdrawal === "2") return "Retiro";
    var home = scoreNumber(match.score1);
    var away = scoreNumber(match.score2);
    if (home === null || away === null) return "vs";
    var text = home + " – " + away;
    var pensHome = scoreNumber(match.penalty1);
    var pensAway = scoreNumber(match.penalty2);
    if (match.penalties && pensHome !== null && pensAway !== null) text += " (" + pensHome + "–" + pensAway + " pen.)";
    return text;
  }

  function statusNote(match, teams) {
    if (match.postponed === true) {
      var note = String(match.postponeNote || "").trim();
      return note ? "<p class=\"cup-status\">" + escapeHtml(note) + "</p>" : "";
    }
    if (match.withdrawal === "1" || match.withdrawal === "2") {
      var team = teamById(teams, match.withdrawal === "1" ? match.team1Id : match.team2Id);
      var name = team ? team.name : ((match.withdrawal === "1" ? match.label1 : match.label2) || "Un equipo");
      return "<p class=\"cup-status\">Se retira " + escapeHtml(name) + " y pierde el partido.</p>";
    }
    return "";
  }

  function matchHtml(match, teams) {
    var decided = match.postponed === true || match.withdrawal === "1" || match.withdrawal === "2" || (scoreNumber(match.score1) !== null && scoreNumber(match.score2) !== null);
    var champion = match.stage === "final" ? winnerSide(match) : "";
    return "<article class=\"cup-match" + (decided ? " is-played" : "") + (champion ? " is-final" : "") + "\">" +
      side(teamById(teams, match.team1Id), match.label1, false, champion === "1") +
      "<span class=\"cup-score" + (decided ? " is-result" : "") + "\">" + scoreLabel(match) + "</span>" +
      side(teamById(teams, match.team2Id), match.label2, true, champion === "2") +
      statusNote(match, teams) +
      when(match) +
      "</article>";
  }

  function championBanner(matches, teams) {
    var team = teamById(teams, championId(matches));
    if (!team) return "";
    var mark = logo(team);
    var image = mark ? "<img src=\"" + escapeHtml(mark) + "\" alt=\"\">" : "";
    return "<section class=\"cup-champion\"><p>Campeón del torneo</p><div>" + image + "<strong>" + escapeHtml(team.name) + "</strong></div></section>";
  }

  function teamCard(team) {
    var mark = logo(team);
    var image = mark ? "<img src=\"" + escapeHtml(mark) + "\" alt=\"\">" : "";
    var info = team.info ? "<div class=\"cup-info\">" + rich(team.info) + "</div>" : "";
    return "<figure class=\"cup-team\">" + image + "<figcaption>" + escapeHtml(team.name) + "</figcaption>" + info + "</figure>";
  }

  function blankStanding(team) {
    return { team: team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
  }

  function applyStanding(row, goalsFor, goalsAgainst) {
    row.played += 1;
    row.goalsFor += goalsFor;
    row.goalsAgainst += goalsAgainst;
    if (goalsFor > goalsAgainst) {
      row.won += 1;
      row.points += 3;
    } else if (goalsFor === goalsAgainst) {
      row.drawn += 1;
      row.points += 1;
    } else row.lost += 1;
  }

  function applyWalkover(row, won) {
    row.played += 1;
    if (won) {
      row.won += 1;
      row.points += 3;
    } else row.lost += 1;
  }

  function standingRows(matches, teams, letter) {
    var rows = {};
    teams.forEach(function (team) {
      if (letter) {
        var inGroup = matches.some(function (match) {
          return match.stage === "group" && match.group === letter && (match.team1Id === team.id || match.team2Id === team.id);
        });
        if (!inGroup) return;
      }
      rows[team.id] = blankStanding(team);
    });
    matches.forEach(function (match) {
      if (match.postponed === true || !rows[match.team1Id] || !rows[match.team2Id]) return;
      if (letter) {
        if (match.stage !== "group" || match.group !== letter) return;
      } else if (match.stage !== "match") return;
      if (match.withdrawal === "1" || match.withdrawal === "2") {
        applyWalkover(rows[match.team1Id], match.withdrawal === "2");
        applyWalkover(rows[match.team2Id], match.withdrawal === "1");
        return;
      }
      var home = scoreNumber(match.score1);
      var away = scoreNumber(match.score2);
      if (home === null || away === null) return;
      applyStanding(rows[match.team1Id], home, away);
      applyStanding(rows[match.team2Id], away, home);
    });
    return Object.keys(rows).map(function (id) { return rows[id]; }).sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;
      var diffA = a.goalsFor - a.goalsAgainst;
      var diffB = b.goalsFor - b.goalsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.name.localeCompare(b.team.name, "es");
    });
  }

  function goalDiff(row) {
    var diff = row.goalsFor - row.goalsAgainst;
    return diff > 0 ? "+" + diff : String(diff);
  }

  function standingTeam(team) {
    var mark = logo(team);
    var image = mark ? "<img src=\"" + escapeHtml(mark) + "\" alt=\"\">" : "";
    return "<span class=\"cup-standing-team\">" + image + escapeHtml(team.name) + "</span>";
  }

  function standingsTable(rows) {
    var body = rows.map(function (row, index) {
      return "<tr><td>" + (index + 1) + "</td><td>" + standingTeam(row.team) + "</td><td>" + row.played + "</td><td>" + row.won + "</td><td>" + row.drawn + "</td><td>" + row.lost + "</td><td>" + row.goalsFor + "</td><td>" + row.goalsAgainst + "</td><td>" + goalDiff(row) + "</td><td class=\"is-points\">" + row.points + "</td></tr>";
    }).join("");
    return "<div class=\"cup-table-wrap\"><table class=\"cup-table\"><thead><tr><th>Pos</th><th>Equipo</th><th title=\"Partidos jugados\">PJ</th><th title=\"Ganados\">PG</th><th title=\"Empatados\">PE</th><th title=\"Perdidos\">PP</th><th title=\"Goles a favor\">GF</th><th title=\"Goles en contra\">GC</th><th title=\"Diferencia de goles\">DG</th><th title=\"Puntos\">Pts</th></tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  function standingsLegend() {
    return "<p class=\"cup-legend\">PJ partidos, PG ganados, PE empatados, PP perdidos, GF goles a favor, GC goles en contra, DG diferencia, Pts puntos. Una victoria suma 3 y un empate suma 1. Si un equipo se retira, pierde el partido y no suma goles. Un partido aplazado no entra en la tabla.</p>";
  }

  function groups(matches, teams) {
    var letters = [];
    matches.forEach(function (match) {
      if (match.stage === "group" && match.group && letters.indexOf(match.group) === -1) letters.push(match.group);
    });
    letters.sort();
    if (!letters.length) return "";
    return "<h3>Grupos</h3>" + standingsLegend() + letters.map(function (letter) {
      var rows = matches.filter(function (match) { return match.stage === "group" && match.group === letter; });
      return "<section class=\"cup-group\"><h3>Grupo " + escapeHtml(letter) + "</h3>" + standingsTable(standingRows(rows, teams, letter)) + "<div class=\"cup-matches\">" + rows.map(function (match) { return matchHtml(match, teams); }).join("") + "</div></section>";
    }).join("");
  }

  function plainStandings(matches, teams) {
    if (!teams.length || matches.some(function (match) { return match.stage === "group"; })) return "";
    if (!matches.some(function (match) { return match.stage === "match"; })) return "";
    return "<h3>Posiciones</h3>" + standingsLegend() + standingsTable(standingRows(matches, teams, ""));
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
      championBanner(ownMatches, teams) +
      (ownTeams.length ? "<h3>Equipos</h3><div class=\"cup-teams\">" + ownTeams.map(teamCard).join("") + "</div>" : "") +
      plainStandings(ownMatches, ownTeams) +
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
