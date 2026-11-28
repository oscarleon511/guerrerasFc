"use strict";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const FORMATS = {
  8: { groups: 2, size: 4 },
  12: { groups: 4, size: 3 },
  16: { groups: 4, size: 4 },
  20: { groups: 4, size: 5 },
  24: { groups: 6, size: 4 }
};

function place(group, rank) {
  return rank + "° Grupo " + group;
}

function roundRobin(teams) {
  const list = teams.slice();
  if (list.length < 2) return [];
  if (list.length % 2) list.push("");
  const count = list.length;
  const rounds = [];
  for (let round = 0; round < count - 1; round += 1) {
    const pairs = [];
    for (let index = 0; index < count / 2; index += 1) {
      const home = list[index];
      const away = list[count - 1 - index];
      if (home && away) pairs.push([home, away]);
    }
    rounds.push(pairs);
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list.length = 0;
    list.push(fixed);
    rest.forEach(function (id) { list.push(id); });
  }
  return rounds;
}

function groupWaves(groups) {
  const letters = Object.keys(groups);
  const byRound = [];
  letters.forEach(function (letter) {
    roundRobin(groups[letter]).forEach(function (pairs, index) {
      if (!byRound[index]) byRound[index] = [];
      pairs.forEach(function (pair) {
        byRound[index].push({
          stage: "group",
          group: letter,
          round: index + 1,
          team1Id: pair[0],
          team2Id: pair[1],
          label1: "",
          label2: ""
        });
      });
    });
  });
  return byRound;
}

function knockoutWaves(teamCount) {
  const waves = [];
  function wave(stage, rows) {
    waves.push(rows.map(function (row) {
      return {
        stage: stage,
        group: "",
        round: waves.length + 1,
        team1Id: "",
        team2Id: "",
        label1: row[0],
        label2: row[1]
      };
    }));
  }
  if (teamCount === 8) {
    wave("semi", [
      [place("A", 1), place("B", 2)],
      [place("B", 1), place("A", 2)]
    ]);
  } else if (teamCount === 24) {
    wave("r16", [
      [place("A", 1), "Mejor 3° (1)"],
      [place("B", 1), "Mejor 3° (2)"],
      [place("C", 1), "Mejor 3° (3)"],
      [place("D", 1), "Mejor 3° (4)"],
      [place("E", 1), place("F", 2)],
      [place("F", 1), place("E", 2)],
      [place("A", 2), place("D", 2)],
      [place("B", 2), place("C", 2)]
    ]);
    wave("quarter", [
      ["Ganador octavos 1", "Ganador octavos 2"],
      ["Ganador octavos 3", "Ganador octavos 4"],
      ["Ganador octavos 5", "Ganador octavos 6"],
      ["Ganador octavos 7", "Ganador octavos 8"]
    ]);
  } else {
    wave("quarter", [
      [place("A", 1), place("B", 2)],
      [place("B", 1), place("A", 2)],
      [place("C", 1), place("D", 2)],
      [place("D", 1), place("C", 2)]
    ]);
  }
  if (teamCount !== 8) {
    wave("semi", [
      ["Ganador cuartos 1", "Ganador cuartos 2"],
      ["Ganador cuartos 3", "Ganador cuartos 4"]
    ]);
  }
  wave("third", [["Perdedor semifinal 1", "Perdedor semifinal 2"]]);
  wave("final", [["Ganador semifinal 1", "Ganador semifinal 2"]]);
  return waves;
}

function clock(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

function nextDate(iso) {
  const parts = iso.split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return date.getUTCFullYear() + "-" + month + "-" + day;
}

function startMinutes(time) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || "");
  if (!match) return 8 * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function schedule(waves, fields, date, time) {
  const names = Array.isArray(fields) ? fields.filter(Boolean).slice(0, 6) : [];
  const lanes = Math.max(1, names.length || 1);
  const slot = 25;
  let day = date || "";
  let cursor = startMinutes(time);
  const matches = [];
  waves.forEach(function (wave) {
    for (let index = 0; index < wave.length; index += lanes) {
      if (cursor + slot > 24 * 60) {
        cursor = 8 * 60;
        if (day) day = nextDate(day);
      }
      wave.slice(index, index + lanes).forEach(function (match, lane) {
        const copy = {};
        Object.keys(match).forEach(function (key) { copy[key] = match[key]; });
        copy.field = names[lane] || "";
        copy.date = day;
        copy.time = day ? clock(cursor) : "";
        matches.push(copy);
      });
      cursor += slot;
    }
  });
  return matches;
}

function buildBracket(teamIds, fields, date, time) {
  const ids = Array.isArray(teamIds) ? teamIds.filter(Boolean) : [];
  const format = FORMATS[ids.length];
  if (!format) {
    return { error: "El cuadro se arma con 8, 12, 16, 20 o 24 equipos. Este torneo tiene " + ids.length + "." };
  }
  const groups = {};
  for (let index = 0; index < format.groups; index += 1) {
    groups[LETTERS[index]] = ids.slice(index * format.size, (index + 1) * format.size);
  }
  const waves = groupWaves(groups).concat(knockoutWaves(ids.length));
  return { matches: schedule(waves, fields, date, time), groups: groups };
}

function scored(match) {
  if (!match || match.score1 === "" || match.score2 === "" || match.score1 == null || match.score2 == null) return false;
  const home = Number(match.score1);
  const away = Number(match.score2);
  return Number.isInteger(home) && Number.isInteger(away) && home >= 0 && home <= 99 && away >= 0 && away <= 99;
}

function addResult(row, goalsFor, goalsAgainst) {
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

function addWalkover(row, won) {
  row.played += 1;
  if (won) {
    row.won += 1;
    row.points += 3;
  } else row.lost += 1;
}

function withdrawalSide(match) {
  if (!match || match.postponed === true) return "";
  return match.withdrawal === "1" || match.withdrawal === "2" ? match.withdrawal : "";
}

function byStanding(names) {
  return function (a, b) {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return String(names[a.id] || a.id).localeCompare(String(names[b.id] || b.id), "es");
  };
}

function groupTable(matches, names) {
  const rows = {};
  matches.forEach(function (match) {
    [match.team1Id, match.team2Id].forEach(function (id) {
      if (!id || rows[id]) return;
      rows[id] = { id: id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    });
  });
  let played = false;
  matches.forEach(function (match) {
    if (match.postponed === true || !rows[match.team1Id] || !rows[match.team2Id]) return;
    const side = withdrawalSide(match);
    if (side) {
      played = true;
      addWalkover(rows[match.team1Id], side === "2");
      addWalkover(rows[match.team2Id], side === "1");
      return;
    }
    if (!scored(match)) return;
    played = true;
    addResult(rows[match.team1Id], Number(match.score1), Number(match.score2));
    addResult(rows[match.team2Id], Number(match.score2), Number(match.score1));
  });
  if (!played) return null;
  return Object.keys(rows).map(function (id) { return rows[id]; }).sort(byStanding(names));
}

function pairOutcome(list, number) {
  const match = list && list[number - 1];
  if (!match || !match.team1Id || !match.team2Id || match.postponed === true) return null;
  if (match.withdrawal === "1") return { winner: match.team2Id, loser: match.team1Id };
  if (match.withdrawal === "2") return { winner: match.team1Id, loser: match.team2Id };
  if (!scored(match)) return null;
  const home = Number(match.score1);
  const away = Number(match.score2);
  if (home !== away) {
    return home > away
      ? { winner: match.team1Id, loser: match.team2Id }
      : { winner: match.team2Id, loser: match.team1Id };
  }
  if (match.penalties !== true) return null;
  const homePens = Number(match.penalty1);
  const awayPens = Number(match.penalty2);
  if (!Number.isInteger(homePens) || !Number.isInteger(awayPens) || homePens === awayPens) return null;
  return homePens > awayPens
    ? { winner: match.team1Id, loser: match.team2Id }
    : { winner: match.team2Id, loser: match.team1Id };
}

function teamFromLabel(label, ranked, thirds, stages) {
  const group = /^(\d+)° Grupo ([A-F])$/.exec(label || "");
  if (group) {
    const table = ranked[group[2]];
    const row = table && table[Number(group[1]) - 1];
    return row ? row.id : "";
  }
  const best = /^Mejor 3° \((\d+)\)$/.exec(label || "");
  if (best) {
    const row = thirds[Number(best[1]) - 1];
    return row ? row.id : "";
  }
  const winner = /^Ganador (octavos|cuartos|semifinal) (\d+)$/.exec(label || "");
  if (winner) {
    const stage = { octavos: "r16", cuartos: "quarter", semifinal: "semi" }[winner[1]];
    const result = pairOutcome(stages[stage], Number(winner[2]));
    return result ? result.winner : "";
  }
  const loser = /^Perdedor semifinal (\d+)$/.exec(label || "");
  if (loser) {
    const result = pairOutcome(stages.semi, Number(loser[1]));
    return result ? result.loser : "";
  }
  return null;
}

function resolveTournament(matches, names) {
  const ranked = {};
  const grouped = {};
  matches.forEach(function (match) {
    if (match.stage !== "group" || !match.group) return;
    if (!grouped[match.group]) grouped[match.group] = [];
    grouped[match.group].push(match);
  });
  Object.keys(grouped).forEach(function (letter) {
    ranked[letter] = groupTable(grouped[letter], names);
  });
  const thirds = [];
  Object.keys(ranked).sort().forEach(function (letter) {
    if (ranked[letter] && ranked[letter][2]) thirds.push(ranked[letter][2]);
  });
  thirds.sort(byStanding(names));
  const stages = { r16: [], quarter: [], semi: [], final: [], third: [] };
  matches.forEach(function (match) {
    if (stages[match.stage]) stages[match.stage].push(match);
  });
  ["r16", "quarter", "semi", "final", "third"].forEach(function (stage) {
    stages[stage].forEach(function (match) {
      let changed = false;
      ["1", "2"].forEach(function (side) {
        const label = match["label" + side];
        if (!label) return;
        const nextId = teamFromLabel(label, ranked, thirds, stages);
        if (nextId === null || match["team" + side + "Id"] === nextId) return;
        match["team" + side + "Id"] = nextId;
        changed = true;
      });
      if (changed && (scored(match) || match.withdrawal === "1" || match.withdrawal === "2" || match.postponed === true)) {
        match.score1 = "";
        match.score2 = "";
        match.penalties = false;
        match.penalty1 = "";
        match.penalty2 = "";
        match.withdrawal = "";
        match.postponed = false;
        match.postponeNote = "";
      }
    });
  });
}

function resolveKnockout(matches, teams) {
  const names = {};
  (Array.isArray(teams) ? teams : []).forEach(function (team) {
    if (team && team.id) names[team.id] = team.name || team.id;
  });
  const copy = (Array.isArray(matches) ? matches : []).map(function (match) {
    const next = {};
    Object.keys(match || {}).forEach(function (key) { next[key] = match[key]; });
    return next;
  });
  const tournaments = [];
  copy.forEach(function (match) {
    if (match.tournamentId && tournaments.indexOf(match.tournamentId) === -1) tournaments.push(match.tournamentId);
  });
  tournaments.forEach(function (tournamentId) {
    resolveTournament(copy.filter(function (match) { return match.tournamentId === tournamentId; }), names);
  });
  return copy;
}

module.exports = { FORMATS, buildBracket, resolveKnockout };
