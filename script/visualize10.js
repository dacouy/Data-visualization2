(() => {
const FAN_URL = "data/part7/population_scenario_fan_2024_2071.csv";

const COLORS = {
  low: "#8B3A2E",
  medium: "#8B1A1A",
  high: "#2D6B2D",
  highBand: "#9fbd8b",
  lowBand: "#b97868",
  children: "#b45b54",
  working: "#8B3A2E",
  older: "#1A3A5C",
  oldest: "#5f2f24",
  grid: "#e8ded2",
  muted: "#6f6255",
  ink: "#1c1c1c",
  rule: "#dacfc0",
};

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
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      year: Number(row.year),
      scenario: row.scenario,
      scenario_label: row.scenario.charAt(0).toUpperCase() + row.scenario.slice(1),
      total_population: Number(row.total_population),
      children_0_14: Number(row.children_0_14),
      working_15_64: Number(row.working_15_64),
      older_65_plus: Number(row.older_65_plus),
      oldest_85_plus: Number(row.oldest_85_plus),
      children_share: Number(row.children_share),
      working_share: Number(row.working_share),
      older_share: Number(row.older_share),
      oldest_share: Number(row.oldest_share),
      old_age_dependency: Number(row.old_age_dependency),
    };
  });
}

function formatMillions(value, digits = 1) {
  return `${(value / 1_000_000).toFixed(digits)}M`;
}

function groupRows(rows) {
  const byYear = new Map();
  rows.forEach((row) => {
    if (!byYear.has(row.year)) byYear.set(row.year, {});
    byYear.get(row.year)[row.scenario] = row;
  });
  return [...byYear.entries()]
    .map(([year, scenarios]) => ({ year, ...scenarios }))
    .filter((row) => row.low && row.medium && row.high)
    .sort((a, b) => a.year - b.year);
}

function buildFanRows(yearly) {
  return yearly.map((row) => ({
    year: row.year,
    high: row.high.total_population,
    medium: row.medium.total_population,
    low: row.low.total_population,
    high_medium_gap: row.high.total_population - row.medium.total_population,
    medium_low_gap: row.medium.total_population - row.low.total_population,
  }));
}

function buildEndpointRows(yearly) {
  const last = yearly[yearly.length - 1];
  return [
    {
      year: last.year,
      scenario_label: "High",
      total_population: last.high.total_population,
      label: `High ${formatMillions(last.high.total_population, 1)}`,
    },
    {
      year: last.year,
      scenario_label: "Medium",
      total_population: last.medium.total_population,
      label: `Medium ${formatMillions(last.medium.total_population, 1)}`,
    },
    {
      year: last.year,
      scenario_label: "Low",
      total_population: last.low.total_population,
      label: `Low ${formatMillions(last.low.total_population, 1)}`,
    },
  ];
}

function buildSpec(rows) {
  const yearly = groupRows(rows);
  const fanRows = buildFanRows(yearly);
  const lineRows = rows.map((row) => ({
    ...row,
    population_label: formatMillions(row.total_population, 2),
  }));
  const endpointRows = buildEndpointRows(yearly);

  const baseX = {
    field: "year",
    type: "quantitative",
    scale: { domain: [2024, 2071] },
    axis: {
      values: [2024, 2035, 2045, 2055, 2065, 2071],
      format: "d",
      labelAngle: 0,
      labelColor: COLORS.muted,
      tickColor: COLORS.rule,
      domainColor: COLORS.rule,
      grid: false,
      title: null,
    },
  };

  const totalYAxis = {
    title: "Total population (millions)",
    titleAngle: 0,
    titleAnchor: "end",
    titleAlign: "left",
    titleY: -12,
    titleColor: COLORS.muted,
    titleFont: "Times New Roman",
    titleFontSize: 13,
    values: [28000000, 34000000, 40000000, 46000000],
    labelExpr: "datum.value / 1000000 + 'M'",
    labelColor: COLORS.muted,
    tickColor: COLORS.rule,
    domainColor: COLORS.rule,
    gridColor: COLORS.grid,
    gridOpacity: 1,
  };

  const totalY = {
    field: "total_population",
    type: "quantitative",
    scale: { domain: [26000000, 47000000], zero: false },
    axis: totalYAxis,
  };

    return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    background: null,
    autosize: { type: "fit-x", contains: "padding" },
    width: "container",
    height: 340,
    padding: { top: 18, right: 28, bottom: 8, left: 8 },
    layer: [
          {
            data: { values: fanRows },
            mark: { type: "area", color: COLORS.highBand, opacity: 0.42, interpolate: "monotone" },
            encoding: {
              x: baseX,
              y: {
                field: "high",
                type: "quantitative",
                scale: { domain: [26000000, 47000000], zero: false },
                axis: totalYAxis,
              },
              y2: { field: "medium" },
              tooltip: [
                { field: "year", type: "ordinal", title: "Year" },
                { field: "high_medium_gap", type: "quantitative", title: "High minus medium", format: ",.0f" },
              ],
            },
          },
          {
            data: { values: fanRows },
            mark: { type: "area", color: COLORS.lowBand, opacity: 0.4, interpolate: "monotone" },
            encoding: {
              x: baseX,
              y: {
                field: "medium",
                type: "quantitative",
                scale: { domain: [26000000, 47000000], zero: false },
                axis: totalYAxis,
              },
              y2: { field: "low" },
              tooltip: [
                { field: "year", type: "ordinal", title: "Year" },
                { field: "medium_low_gap", type: "quantitative", title: "Medium minus low", format: ",.0f" },
              ],
            },
          },
          {
            data: { values: lineRows },
            mark: { type: "line", interpolate: "monotone", point: false },
            encoding: {
              x: baseX,
              y: totalY,
              color: {
                field: "scenario_label",
                type: "nominal",
                scale: {
                  domain: ["High", "Medium", "Low"],
                  range: [COLORS.high, COLORS.medium, COLORS.low],
                },
                legend: null,
              },
              strokeWidth: {
                condition: { test: "datum.scenario === 'medium'", value: 4 },
                value: 2.4,
              },
              opacity: {
                condition: { test: "datum.scenario === 'low'", value: 0.68 },
                value: 1,
              },
              tooltip: [
                { field: "year", type: "ordinal", title: "Year" },
                { field: "scenario_label", type: "nominal", title: "Scenario" },
                { field: "total_population", type: "quantitative", title: "Population", format: ",.0f" },
              ],
            },
          },
          {
            data: { values: endpointRows },
            mark: {
              type: "text",
              align: "left",
              baseline: "middle",
              dx: 10,
              font: "Times New Roman",
              fontSize: 15,
              fontWeight: "bold",
            },
            encoding: {
              x: baseX,
              y: totalY,
              text: { field: "label" },
              color: {
                field: "scenario_label",
                type: "nominal",
                scale: {
                  domain: ["High", "Medium", "Low"],
                  range: [COLORS.high, COLORS.medium, COLORS.low],
                },
                legend: null,
              },
              tooltip: null,
            },
          },
        ],
    config: {
      font: "Times New Roman",
      axis: {
        labelFont: "Times New Roman",
        titleFont: "Times New Roman",
        labelFontSize: 12,
        titleFontSize: 13,
      },
      view: { stroke: null },
    },
  };
}

async function renderFanChart() {
  const container = document.querySelector("#population-futures-chart");
  if (!container) return;

  try {
    const response = await fetch(FAN_URL);
    if (!response.ok) throw new Error("Could not load population scenario CSV.");

    const rows = parseCsv(await response.text());
    await vegaEmbed(container, buildSpec(rows), {
      actions: false,
      renderer: "svg",
    });

    const legend = document.createElement("div");
    legend.className = "fan-legend";
    legend.setAttribute("aria-label", "Projection scenario legend");
    legend.innerHTML = `
      <span><i style="background:${COLORS.high}"></i>High</span>
      <span><i style="background:${COLORS.medium}"></i>Medium</span>
      <span><i style="background:${COLORS.low}"></i>Low</span>
    `;
    container.prepend(legend);
  } catch (error) {
    console.error("Population futures fan chart failed:", error);
    container.innerHTML = `<p class="error-message">Could not load population futures chart: ${error.message}</p>`;
  }
}

renderFanChart();
})();
