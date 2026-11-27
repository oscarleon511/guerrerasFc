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
  wave("final", [["Ganador semifinal 1", "Ganador semifinal 2"]]);
  wave("third", [["Perdedor semifinal 1", "Perdedor semifinal 2"]]);
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

module.exports = { FORMATS, buildBracket };
