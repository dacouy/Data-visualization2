(() => {
const HOUSING_TFR_URL = "data/part5/tfr_house_price_2009_2024.csv";
const HOUSE_COLOR = "#1A3A5C";
const TFR_COLOR = "#8B1A1A";
const START_YEAR = 2009;
const END_YEAR = 2024;

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
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, ""));

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function toNumber(value) {
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function getCombinedRows(rows) {
  const data = rows
    .map((row) => ({
      year: toNumber(row.year),
      tfr: toNumber(row.tfr),
      house_price_index: toNumber(row.house_price_index),
      replacement: 2.1,
    }))
    .filter(
      (row) =>
        row.year >= START_YEAR &&
        row.year <= END_YEAR &&
        row.tfr !== null &&
        row.house_price_index !== null
    )
    .sort((a, b) => a.year - b.year);

  const byYear = new Set(data.map((row) => row.year));
  const missingYears = [];
  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    if (!byYear.has(year)) missingYears.push(year);
  }
  if (missingYears.length) console.warn("VIZ 7 missing joined years:", missingYears);

  return data;
}

function buildHousingSpec(data) {
  const houseMax = Math.ceil((Math.max(...data.map((row) => row.house_price_index)) + 8) / 10) * 10;

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 430,
    background: null,
    data: { values: data },
    layer: [
      {
        mark: {
          type: "bar",
          color: HOUSE_COLOR,
          opacity: 0.34,
          tooltip: true,
        },
        encoding: {
          x: {
            field: "year",
            type: "ordinal",
            sort: data.map((row) => row.year),
            axis: {
              title: null,
              labelAngle: 0,
              labelColor: "#4A4038",
              tickColor: "#dacfc0",
              domainColor: "#dacfc0",
              values: data.map((row) => row.year).filter((year) => year % 2 === 1 || year === END_YEAR),
            },
          },
          y: {
            field: "house_price_index",
            type: "quantitative",
            scale: { domain: [0, houseMax] },
            axis: {
              orient: "right",
              title: "House price index (bar)",
              titleColor: HOUSE_COLOR,
              titleFontSize: 13,
              titlePadding: 14,
              labelColor: HOUSE_COLOR,
              labelPadding: 4,
              values: [0, 30, 60, 90, 120, 150],
              grid: false,
              domainColor: "#dacfc0",
              tickColor: "#dacfc0",
            },
          },
          tooltip: [
            { field: "year", type: "ordinal", title: "Year" },
            { field: "house_price_index", type: "quantitative", title: "House price index", format: ".1f" },
          ],
        },
      },
      {
        mark: {
          type: "line",
          color: TFR_COLOR,
          strokeWidth: 3,
          point: {
            filled: true,
            size: 80,
            color: TFR_COLOR,
            stroke: "white",
            strokeWidth: 1.5,
          },
        },
        encoding: {
          x: {
            field: "year",
            type: "ordinal",
            sort: data.map((row) => row.year),
            axis: {
              title: null,
              labelAngle: 0,
              labelColor: "#4A4038",
              tickColor: "#dacfc0",
              domainColor: "#dacfc0",
            },
          },
          y: {
            field: "tfr",
            type: "quantitative",
            scale: { domain: [1.3, 2.15], zero: false },
            axis: {
              orient: "left",
              title: "Total fertility rate (line)",
              titleColor: TFR_COLOR,
              titleFontSize: 13,
              titlePadding: 16,
              labelColor: TFR_COLOR,
              values: [1.4, 1.6, 1.8, 2.0],
              gridColor: "#D8CFC0",
              gridOpacity: 0.55,
              domainColor: "#dacfc0",
              tickColor: "#dacfc0",
            },
          },
          tooltip: [
            { field: "year", type: "ordinal", title: "Year" },
            { field: "tfr", type: "quantitative", title: "TFR", format: ".3f" },
            { field: "house_price_index", type: "quantitative", title: "House price index", format: ".1f" },
          ],
        },
      },
      {
        mark: {
          type: "rule",
          color: "#777777",
          strokeDash: [5, 4],
          strokeWidth: 1,
        },
        encoding: {
          y: {
            datum: 2.1,
            type: "quantitative",
            scale: { domain: [1.3, 2.15], zero: false },
            axis: null,
          },
        },
      },
      {
        data: { values: [{ year: END_YEAR, replacement: 2.1, label: "Replacement level" }] },
        mark: {
          type: "text",
          align: "right",
          baseline: "bottom",
          dx: -4,
          dy: -4,
          font: "Times New Roman",
          fontSize: 12,
          color: "#666666",
        },
        encoding: {
          x: { field: "year", type: "ordinal", sort: data.map((row) => row.year) },
          y: {
            field: "replacement",
            type: "quantitative",
            scale: { domain: [1.3, 2.15], zero: false },
            axis: null,
          },
          text: { field: "label", type: "nominal" },
        },
      },
    ],
    resolve: { scale: { y: "independent" } },
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

async function renderHousingTimeline() {
  const container = document.querySelector("#housing-tfr-chart");

  try {
    const response = await fetch(HOUSING_TFR_URL);
    if (!response.ok) throw new Error("Could not load VIZ 7 joined data file.");
    const data = getCombinedRows(parseCsv(await response.text()));
    await vegaEmbed(container, buildHousingSpec(data), { actions: false, renderer: "svg" });
  } catch (error) {
    console.error("VIZ 7 failed:", error);
    if (container) {
      container.innerHTML = `<p class="error-message">Could not load The Housing Trap chart: ${error.message}</p>`;
    }
  }
}

renderHousingTimeline();
})();
