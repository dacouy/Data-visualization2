// visualize5.js — state × age ASFR heatmap (Part 4, second visual). Data: data/asfr_state_2024.csv
const ASFR_CSV_URL = "data/asfr_state_2024.csv";
const AGE_ORDER = ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49"];
const ALL_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT", "Australia"];
const ASFR_EPS = 1e-6;

const COLOR_LOW = "#fff5eb";
const COLOR_HIGH = "#7f0f0f";

function parseAsfrCsv(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [state, age_group, asfr] = line.split(",");
      return { state, age_group, asfr: Number(asfr) };
    });
}

function verifyGrid(rows) {
  const keys = new Set(rows.map((r) => `${r.state}|${r.age_group}`));
  const missing = [];
  for (const st of ALL_STATES) {
    for (const ag of AGE_ORDER) {
      if (!keys.has(`${st}|${ag}`)) missing.push([st, ag]);
    }
  }
  if (missing.length) console.warn("ASFR grid missing cells:", missing);
  else console.info("ASFR grid: 9×7 = 63 cells OK.");
  return missing;
}

function ageGroupIndex(ag) {
  return AGE_ORDER.indexOf(ag);
}

function buildYOrderAndPeaks(rows) {
  const byState = {};
  for (const r of rows) {
    if (!byState[r.state]) byState[r.state] = [];
    byState[r.state].push(r);
  }
  const peakIdx = {};
  const peakAge = {};
  for (const st of ALL_STATES) {
    let best = -Infinity;
    let peak = null;
    for (const r of byState[st]) {
      if (r.asfr > best) {
        best = r.asfr;
        peak = r.age_group;
      }
    }
    peakIdx[st] = ageGroupIndex(peak);
    peakAge[st] = peak;
  }

  const tieNoAu = { ACT: 0, NSW: 1, VIC: 2, SA: 3, WA: 4, TAS: 5, QLD: 6, NT: 7 };
  const nonAu = ALL_STATES.filter((s) => s !== "Australia");
  const yOrder = [
    ...nonAu.slice().sort((a, b) => {
      const ia = peakIdx[a];
      const ib = peakIdx[b];
      if (ib !== ia) return ib - ia;
      return tieNoAu[a] - tieNoAu[b];
    }),
    "Australia",
  ];

  const maxByState = {};
  for (const st of ALL_STATES) {
    maxByState[st] = Math.max(...byState[st].map((r) => r.asfr));
  }

  const enriched = rows.map((r) => {
    const isPeak = Math.abs(r.asfr - maxByState[r.state]) < ASFR_EPS;
    return {
      ...r,
      is_peak: isPeak ? 1 : 0,
    };
  });

  const minPeakIdx = Math.min(...nonAu.map((s) => peakIdx[s]));
  const earliestStates = nonAu.filter((s) => peakIdx[s] === minPeakIdx).sort();
  const earliestBand = AGE_ORDER[minPeakIdx];

  return { enriched, yOrder, peakAge, earliestStates, earliestBand };
}

function buildChartSubtitle(peakAge, earliestStates, earliestBand, rows) {
  const nonAu = ALL_STATES.filter((s) => s !== "Australia");
  const bands = new Set(nonAu.map((s) => peakAge[s]));
  if (bands.size === 1) {
    const band = [...bands][0];
    const actTeen = rows.find((r) => r.state === "ACT" && r.age_group === "15-19").asfr;
    const ntTeen = rows.find((r) => r.state === "NT" && r.age_group === "15-19").asfr;
    return (
      `Every jurisdiction’s highest ASFR is in the ${band} band (thick border = peak cell per row). ` +
      `At 15–19 the NT (${ntTeen.toFixed(1)}) is far above the ACT (${actTeen.toFixed(1)}) per 1,000 women. `
    );
  }
  const act = peakAge.ACT;
  const earliestList = earliestStates.join(" and ");
  return (
    `ACT peaks at ${act}. ` +
    `${earliestList} peak in the ${earliestBand} band — earliest modal band among states. `
  );
}

function parseHex(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return [255, 245, 235];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function mixRgb(a, b, t) {
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(a[0] + (b[0] - a[0]) * u);
  const g = Math.round(a[1] + (b[1] - a[1]) * u);
  const bl = Math.round(a[2] + (b[2] - a[2]) * u);
  return `rgb(${r},${g},${bl})`;
}

function cellColor(asfr, minV, maxV) {
  const lo = parseHex(COLOR_LOW);
  const hi = parseHex(COLOR_HIGH);
  if (maxV <= minV) return mixRgb(lo, hi, 0.5);
  const t = (asfr - minV) / (maxV - minV);
  return mixRgb(lo, hi, t);
}

function renderDomHeatmap(container, enriched, yOrder) {
  const byKey = Object.fromEntries(enriched.map((r) => [`${r.state}|${r.age_group}`, r]));
  const values = enriched.map((r) => r.asfr);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);

  const root = document.createElement("div");
  root.className = "asfr-heatmap-root";

  const main = document.createElement("div");
  main.className = "asfr-heatmap-main";

  const table = document.createElement("table");
  table.className = "asfr-heatmap-table";
  table.setAttribute("role", "grid");
  table.setAttribute(
    "aria-label",
    "Age-specific fertility rate (ASFR) by state and age group: values are per 1,000 women, 2024"
  );

  const thead = document.createElement("thead");
  const trTop = document.createElement("tr");
  const corner = document.createElement("th");
  corner.className = "asfr-heatmap-corner";
  corner.scope = "col";
  corner.textContent = "";
  trTop.appendChild(corner);
  const xTitle = document.createElement("th");
  xTitle.className = "asfr-heatmap-x-title";
  xTitle.colSpan = AGE_ORDER.length;
  xTitle.scope = "colgroup";
  xTitle.textContent = "Age group (years)";
  trTop.appendChild(xTitle);
  thead.appendChild(trTop);

  const trAge = document.createElement("tr");
  const yTitle = document.createElement("th");
  yTitle.className = "asfr-heatmap-y-title";
  yTitle.scope = "col";
  yTitle.textContent = "State / territory";
  trAge.appendChild(yTitle);
  for (const ag of AGE_ORDER) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = ag;
    trAge.appendChild(th);
  }
  thead.appendChild(trAge);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const state of yOrder) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = state;
    tr.appendChild(th);
    for (const ag of AGE_ORDER) {
      const r = byKey[`${state}|${ag}`];
      const td = document.createElement("td");
      td.className = "asfr-heatmap-cell";
      if (r.is_peak) td.classList.add("asfr-heatmap-cell--peak");
      td.textContent = r.asfr.toFixed(1);
      td.style.backgroundColor = cellColor(r.asfr, minV, maxV);
      const whiteCol = ag === "25-29" || ag === "35-39";
      const whiteNt2024 = state === "NT" && ag === "20-24";
      td.style.color =
        whiteCol || whiteNt2024 || r.asfr > 80 ? "#ffffff" : "#1c1c1c";
      td.title = `${state}, ${ag}: ${r.asfr.toFixed(1)} (ASFR per 1,000 women)`;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  main.appendChild(table);

  const legend = document.createElement("div");
  legend.className = "asfr-heatmap-legend";
  legend.setAttribute("aria-hidden", "true");
  const legTitle = document.createElement("div");
  legTitle.className = "asfr-heatmap-legend-title";
  legTitle.textContent = "Age-specific rate (per 1,000 women)";
  const legBody = document.createElement("div");
  legBody.className = "asfr-heatmap-legend-body";
  const bar = document.createElement("div");
  bar.className = "asfr-heatmap-legend-bar";
  const ticks = document.createElement("div");
  ticks.className = "asfr-heatmap-legend-ticks";
  const steps = 5;
  for (let i = steps; i >= 0; i--) {
    const v = Math.round(minV + ((maxV - minV) * i) / steps);
    const span = document.createElement("span");
    span.textContent = String(v);
    ticks.appendChild(span);
  }
  legBody.appendChild(bar);
  legBody.appendChild(ticks);
  legend.appendChild(legTitle);
  legend.appendChild(legBody);

  root.appendChild(main);
  root.appendChild(legend);
  container.innerHTML = "";
  container.appendChild(root);
}

async function renderAsfrHeatmap() {
  const response = await fetch(ASFR_CSV_URL);
  const text = await response.text();
  const rows = parseAsfrCsv(text);
  verifyGrid(rows);
  const { enriched, yOrder, peakAge, earliestStates, earliestBand } = buildYOrderAndPeaks(rows);

  const chartSubtitle =
    buildChartSubtitle(peakAge, earliestStates, earliestBand, rows) +
    " Age-specific fertility by state, 2024.";

  const noteEl = document.getElementById("asfr-viz-note");
  if (noteEl) noteEl.textContent = chartSubtitle;

  const el = document.querySelector("#asfr-heatmap");
  if (!el) return;
  renderDomHeatmap(el, enriched, yOrder);
}

renderAsfrHeatmap();
