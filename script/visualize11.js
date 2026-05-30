(() => {
const STREAM_URL = "data/part6/population_pyramid_annual_2024_2071.csv";
const BANDS = ["0-14", "15-29", "30-44", "45-64", "65+"];
const BAND_COLOR = {
  "0-14": "#E8C9A0",
  "15-29": "#D99A5B",
  "30-44": "#C46B3D",
  "45-64": "#9E3B2E",
  "65+": "#5F1F1A",
};
const FONT = "Times New Roman";
const MUTED = "#6f6255";
const RULE = "#dacfc0";
const GAP = 7.2;

function bandOf(ageStart) {
  const age = Number(ageStart);
  if (age <= 14) return "0-14";
  if (age <= 29) return "15-29";
  if (age <= 44) return "30-44";
  if (age <= 64) return "45-64";
  return "65+";
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value.trim());
  return values;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, ""));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function buildStreamData(rows) {
  const byYearBand = {};
  rows.forEach((row) => {
    const year = Number(row.year);
    const band = bandOf(row.age_start);
    const population = Number(row.population);
    if (!Number.isFinite(year) || !Number.isFinite(population)) return;
    byYearBand[year] = byYearBand[year] || {};
    byYearBand[year][band] = (byYearBand[year][band] || 0) + population;
  });

  const allYears = Object.keys(byYearBand).map(Number).sort((a, b) => a - b);
  const firstYear = allYears[0];
  const lastYear = allYears[allYears.length - 1];
  const years = allYears.filter((year) => (year - firstYear) % 5 === 0);
  if (years[years.length - 1] !== lastYear) years.push(lastYear);

  const streamRows = [];
  years.forEach((year) => {
    const entries = BANDS.map((band) => ({ band, population: byYearBand[year][band] || 0 }));
    const total = entries.reduce((sum, entry) => sum + entry.population, 0);

    entries.forEach((entry) => {
      entry.share = (entry.population / total) * 100;
    });

    const sortedDesc = [...entries].sort((a, b) => b.share - a.share);
    sortedDesc.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    const bottomToTop = [...sortedDesc].reverse();
    const stackHeight = 100 + GAP * (BANDS.length - 1);
    let cum = -stackHeight / 2;
    bottomToTop.forEach((entry, index) => {
      const y0 = cum;
      const y1 = cum + entry.share;
      streamRows.push({
        year,
        band: entry.band,
        population: entry.population,
        rank: entry.rank,
        share: entry.share,
        y0,
        y1,
        y_mid: (y0 + y1) / 2,
      });
      cum = y1 + (index < bottomToTop.length - 1 ? GAP : 0);
    });
  });

  return streamRows;
}

function buildSpec(streamRows) {
  const years = [...new Set(streamRows.map((row) => row.year))].sort((a, b) => a - b);
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const labelRows = streamRows.filter((row) => row.year === maxYear);
  const maxAbs = Math.max(...streamRows.map((row) => Math.max(Math.abs(row.y0), Math.abs(row.y1))));
  const yScale = { domain: [-maxAbs * 1.04, maxAbs * 1.04], nice: false };

  const xEncoding = {
    field: "year",
    type: "quantitative",
    scale: { domain: [minYear, maxYear], nice: false },
    axis: {
      values: [2024, 2034, 2044, 2054, 2064, 2071],
      format: "d",
      labelAngle: 0,
      labelColor: MUTED,
      labelFontSize: 14,
      tickColor: RULE,
      domainColor: RULE,
      grid: true,
      gridColor: RULE,
      gridOpacity: 0.8,
      title: null,
    },
  };

  const areaLayer = (values) => ({
    data: { values },
    mark: {
      type: "area",
      interpolate: "catmull-rom",
      tension: 0.5,
      opacity: 0.95,
      stroke: "#FFFFFF",
      strokeWidth: 1,
    },
    encoding: {
      x: xEncoding,
      y: { field: "y1", type: "quantitative", scale: yScale, axis: null },
      y2: { field: "y0" },
      detail: { field: "band", type: "nominal" },
      color: {
        field: "band",
        type: "nominal",
        scale: { domain: BANDS, range: BANDS.map((band) => BAND_COLOR[band]) },
        legend: null,
      },
      tooltip: [
        { field: "year", type: "ordinal", title: "Year" },
        { field: "band", type: "nominal", title: "Age band" },
        { field: "share", type: "quantitative", title: "Share of population", format: ".1f" },
        { field: "population", type: "quantitative", title: "People", format: ",.0f" },
        { field: "rank", type: "ordinal", title: "Rank (1 = largest)" },
      ],
    },
  });

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 430,
    background: null,
    padding: { left: 34, right: 34, top: 10, bottom: 6 },
    layer: [
      areaLayer(streamRows.filter((row) => row.band !== "65+")),
      areaLayer(streamRows.filter((row) => row.band === "65+")),
      {
        data: { values: labelRows },
        mark: {
          type: "text",
          align: "left",
          baseline: "middle",
          dx: 6,
          clip: false,
          font: FONT,
          fontSize: 15,
          fontWeight: "bold",
          color: "#1c1c1c",
        },
        encoding: {
          x: { datum: maxYear, type: "quantitative", scale: { domain: [minYear, maxYear] } },
          y: { field: "y_mid", type: "quantitative", scale: yScale, axis: null },
          text: { field: "band" },
          tooltip: null,
        },
      },
    ],
    config: {
      font: FONT,
      axis: { labelFont: FONT, titleFont: FONT },
      view: { stroke: null },
    },
  };
}

async function renderAgeStream() {
  const container = document.querySelector("#age-stream-chart");
  if (!container) return;

  try {
    const response = await fetch(STREAM_URL);
    if (!response.ok) throw new Error("Could not load population projection CSV.");
    const streamRows = buildStreamData(parseCsv(await response.text()));
    if (streamRows.length < BANDS.length * 4) {
      throw new Error(`Only ${streamRows.length} stream rows available.`);
    }

    await vegaEmbed(container, buildSpec(streamRows), { actions: false, renderer: "svg" });

    const source = document.createElement("p");
    source.className = "map-note";
    source.textContent =
      "Each ribbon is an age band; thickness is its share of the population that year. " +
      "Bands are re-sorted by share at each plotted year, so a crossing means one band has overtaken another. " +
      "Source: ABS 3222.0 Population Projections, medium series.";
    container.appendChild(source);
  } catch (error) {
    console.error("Age streamgraph failed:", error);
    container.innerHTML = `<p class="error-message">Could not load the age streamgraph: ${error.message}</p>`;
  }
}

renderAgeStream();
})();
