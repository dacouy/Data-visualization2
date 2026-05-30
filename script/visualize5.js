(() => {
// visualize5.js - state x age ASFR heatmap (Part 4, second visual). Data: data/part4/asfr_state_2024.csv
const ASFR_CSV_URL = "data/part4/asfr_state_2024.csv";
const AGE_ORDER = ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49"];
const ALL_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT", "Australia"];
const ASFR_EPS = 1e-6;

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
  const keys = new Set(rows.map((row) => `${row.state}|${row.age_group}`));
  const missing = [];
  for (const state of ALL_STATES) {
    for (const age of AGE_ORDER) {
      if (!keys.has(`${state}|${age}`)) missing.push([state, age]);
    }
  }
  if (missing.length) console.warn("ASFR grid missing cells:", missing);
}

function buildYOrderAndPeaks(rows) {
  const byState = {};
  rows.forEach((row) => {
    if (!byState[row.state]) byState[row.state] = [];
    byState[row.state].push(row);
  });

  const peakAge = {};
  const peakIndex = {};
  ALL_STATES.forEach((state) => {
    const best = byState[state].reduce((winner, row) => (row.asfr > winner.asfr ? row : winner));
    peakAge[state] = best.age_group;
    peakIndex[state] = AGE_ORDER.indexOf(best.age_group);
  });

  const tieOrder = { ACT: 0, NSW: 1, VIC: 2, SA: 3, WA: 4, TAS: 5, QLD: 6, NT: 7 };
  const nonAustralia = ALL_STATES.filter((state) => state !== "Australia");
  const yOrder = [
    ...nonAustralia.slice().sort((a, b) => {
      if (peakIndex[b] !== peakIndex[a]) return peakIndex[b] - peakIndex[a];
      return tieOrder[a] - tieOrder[b];
    }),
    "Australia",
  ];

  const maxByState = Object.fromEntries(
    ALL_STATES.map((state) => [state, Math.max(...byState[state].map((row) => row.asfr))])
  );
  const enriched = rows.map((row) => ({
    ...row,
    is_peak: Math.abs(row.asfr - maxByState[row.state]) < ASFR_EPS,
    label_color:
      row.asfr > 80 || row.age_group === "25-29" || row.age_group === "35-39" || (row.state === "NT" && row.age_group === "20-24")
        ? "white"
        : "#1c1c1c",
  }));

  const earliestIndex = Math.min(...nonAustralia.map((state) => peakIndex[state]));
  const earliestStates = nonAustralia.filter((state) => peakIndex[state] === earliestIndex).sort();
  return {
    enriched,
    yOrder,
    peakAge,
    earliestStates,
    earliestBand: AGE_ORDER[earliestIndex],
  };
}

function buildChartSubtitle(peakAge, earliestStates, earliestBand, rows) {
  const nonAustralia = ALL_STATES.filter((state) => state !== "Australia");
  const bands = new Set(nonAustralia.map((state) => peakAge[state]));

  if (bands.size === 1) {
    const band = [...bands][0];
    const actTeen = rows.find((row) => row.state === "ACT" && row.age_group === "15-19").asfr;
    const ntTeen = rows.find((row) => row.state === "NT" && row.age_group === "15-19").asfr;
    return (
      `Darker cells mean a higher age-specific fertility rate (births per 1,000 women in that age group). ` +
      `The bold outline marks each state or territory’s peak cell; every jurisdiction peaks at ${band}. ` +
      `At 15-19, the NT (${ntTeen.toFixed(1)}) is far above the ACT (${actTeen.toFixed(1)}).`
    );
  }

  return (
    `Darker cells mean a higher age-specific fertility rate (births per 1,000 women in that age group). ` +
    `The bold outline marks each state or territory’s peak cell. ACT peaks at ${peakAge.ACT}; ` +
    `${earliestStates.join(" and ")} peak in the ${earliestBand} band, the earliest modal band among states.`
  );
}

function buildHeatmapSpec(rows, yOrder) {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 360,
    background: null,
    data: { values: rows },
    layer: [
      {
        mark: {
          type: "rect",
          strokeWidth: 0,
        },
        encoding: {
          x: {
            field: "age_group",
            type: "ordinal",
            sort: AGE_ORDER,
            axis: {
              title: "Age group (years)",
              labelAngle: 0,
              labelFontSize: 13,
              titleFontSize: 14,
              labelColor: "#4A4038",
              titleColor: "#4A4038",
              domain: false,
              tickColor: "#dacfc0",
            },
          },
          y: {
            field: "state",
            type: "ordinal",
            sort: yOrder,
            axis: {
              title: "State / territory",
              labelFontSize: 13,
              titleFontSize: 14,
              labelColor: "#4A4038",
              titleColor: "#4A4038",
              domain: false,
              tickColor: "#dacfc0",
            },
          },
          color: {
            field: "asfr",
            type: "quantitative",
            scale: { range: ["#fff5eb", "#7f0f0f"] },
            legend: {
              title: "ASFR / 1,000",
              orient: "right",
              direction: "vertical",
              offset: 18,
              gradientLength: 330,
              gradientThickness: 14,
              titleLimit: 120,
              titleAlign: "center",
              titleOrient: "top",
              titleFont: "Times New Roman",
              labelFont: "Times New Roman",
              titleFontSize: 13,
              labelFontSize: 12,
            },
          },
          tooltip: [
            { field: "state", type: "nominal", title: "State" },
            { field: "age_group", type: "nominal", title: "Age group" },
            { field: "asfr", type: "quantitative", title: "ASFR per 1,000 women", format: ".1f" },
          ],
        },
      },
      {
        transform: [{ filter: "datum.is_peak" }],
        mark: {
          type: "rect",
          fill: "transparent",
          stroke: "#1c1c1c",
          strokeWidth: 2.4,
        },
        encoding: {
          x: { field: "age_group", type: "ordinal", sort: AGE_ORDER },
          y: { field: "state", type: "ordinal", sort: yOrder },
          tooltip: [
            { field: "state", type: "nominal", title: "State" },
            { field: "age_group", type: "nominal", title: "Peak age group" },
            { field: "asfr", type: "quantitative", title: "ASFR per 1,000 women", format: ".1f" },
          ],
        },
      },
      {
        mark: {
          type: "text",
          font: "Times New Roman",
          fontSize: 13,
          fontWeight: "bold",
        },
        encoding: {
          x: { field: "age_group", type: "ordinal", sort: AGE_ORDER },
          y: { field: "state", type: "ordinal", sort: yOrder },
          text: { field: "asfr", type: "quantitative", format: ".1f" },
          color: {
            condition: { test: "datum.label_color === 'white'", value: "white" },
            value: "#1c1c1c",
          },
          tooltip: [
            { field: "state", type: "nominal", title: "State" },
            { field: "age_group", type: "nominal", title: "Age group" },
            { field: "asfr", type: "quantitative", title: "ASFR per 1,000 women", format: ".1f" },
          ],
        },
      },
    ],
    config: {
      font: "Times New Roman",
      view: { stroke: null },
    },
  };
}

function centerLegendGradient(container) {
  const svg = container.querySelector("svg");
  if (!svg) return;
  const titleEl = svg.querySelector("g.role-legend-title text");
  const gradEl = svg.querySelector("g.role-legend-gradient rect");
  const labelEls = [...svg.querySelectorAll("g.role-legend-label text")];
  if (!titleEl || !gradEl) return;

  const titleCX = parseFloat(titleEl.getAttribute("x") || "0");
  const gradW = parseFloat(gradEl.getAttribute("width") || "14");
  const gradX = parseFloat(gradEl.getAttribute("x") || "0");
  const dx = titleCX - gradW / 2 - gradX;
  if (Math.abs(dx) < 0.5) return;

  gradEl.setAttribute("x", gradX + dx);
  labelEls.forEach((el) => {
    el.setAttribute("x", parseFloat(el.getAttribute("x") || "0") + dx);
  });
}

async function renderAsfrHeatmap() {
  const container = document.querySelector("#asfr-heatmap");

  try {
    const response = await fetch(ASFR_CSV_URL);
    if (!response.ok) throw new Error("Could not load ASFR state CSV.");
    const rows = parseAsfrCsv(await response.text());
    verifyGrid(rows);
    const { enriched, yOrder, peakAge, earliestStates, earliestBand } = buildYOrderAndPeaks(rows);

    const noteEl = document.getElementById("asfr-viz-note");
    if (noteEl) {
      noteEl.textContent = `${buildChartSubtitle(peakAge, earliestStates, earliestBand, rows)} Age-specific fertility by state, 2024.`;
    }

    if (!container) return;
    await vegaEmbed(container, buildHeatmapSpec(enriched, yOrder), { actions: false, renderer: "svg" });
    centerLegendGradient(container);
  } catch (error) {
    console.error("ASFR heatmap failed:", error);
    if (container) {
      container.innerHTML = `<p class="error-message">Could not load ASFR heatmap: ${error.message}</p>`;
    }
  }
}

renderAsfrHeatmap();
})();
