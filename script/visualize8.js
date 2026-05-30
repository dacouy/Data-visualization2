(() => {
const EDUCATION_URL = "data/part5/education.csv";
const FERTILITY_URL = "data/part5/fertility_rate.csv";
const POPULATION_URL = "data/part5/population_2024.csv";
const POINT_COLOR = "#9B9690";
const TREND_COLOR = "#8B1A1A";
const HIGHLIGHT_COLORS = {
  AUS: "#8B1A1A",
  KOR: "#1A3A5C",
  CHN: "#A65F1A",
  IND: "#2F6F4E",
};
const AGGREGATE_CODES = new Set([
  "AFE", "AFW", "ARB", "CEB", "CSS", "EAP", "EAR", "EAS", "ECA", "ECS",
  "EMU", "EUU", "FCS", "HIC", "HPC", "IBD", "IBT", "IDA", "IDB", "IDX",
  "INX", "LAC", "LCN", "LDC", "LIC", "LMC", "LMY", "LTE", "MEA", "MIC",
  "MNA", "NAC", "OED", "OSS", "PRE", "PSS", "PST", "SAS", "SSA", "SSF",
  "SST", "TEA", "TEC", "TLA", "TMN", "TSA", "TSS", "UMC", "WLD",
]);
const COUNTRY_NAME_ALIASES = new Map(
  Object.entries({
    "bahamas the": "bahamas",
    "brunei darussalam": "brunei",
    "cabo verde": "cape verde",
    "congo dem rep": "dr congo",
    "congo rep": "republic of the congo",
    "cote d ivoire": "ivory coast",
    czechia: "czech republic",
    "egypt arab rep": "egypt",
    "gambia the": "gambia",
    "hong kong sar china": "hong kong",
    "iran islamic rep": "iran",
    "korea rep": "south korea",
    "kyrgyz republic": "kyrgyzstan",
    "lao pdr": "laos",
    "macao sar china": "macau",
    "russian federation": "russia",
    "slovak republic": "slovakia",
    "st kitts and nevis": "saint kitts and nevis",
    "st lucia": "saint lucia",
    "st vincent and the grenadines": "saint vincent and the grenadines",
    "syrian arab republic": "syria",
    turkiye: "turkey",
    "venezuela rb": "venezuela",
    "viet nam": "vietnam",
    "west bank and gaza": "palestine",
    "yemen rep": "yemen",
  })
);

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

function parseWdiCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headerIndex = lines.findIndex((line) =>
    parseCsvLine(line).some((value) => value.replace(/^\uFEFF/, "") === "Country Name")
  );
  if (headerIndex < 0) throw new Error("Could not find World Bank CSV header.");

  const headers = parseCsvLine(lines[headerIndex]).map((header) => header.replace(/^\uFEFF/, ""));
  return lines.slice(headerIndex + 1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function parseSimpleCsv(text) {
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

function countryKey(name) {
  const key = String(name ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return COUNTRY_NAME_ALIASES.get(key) ?? key;
}

function latestValue(row, startYear = 2019, endYear = 2024) {
  for (let year = endYear; year >= startYear; year -= 1) {
    const value = toNumber(row[String(year)]);
    if (value !== null) return { value, year };
  }
  return null;
}

function buildPopulationByCountry(populationRows) {
  const populationByCountry = new Map();
  populationRows.forEach((row) => {
    const country = row.Country;
    const population = toNumber(row["Population 2024"]);
    if (!country || population === null) return;
    populationByCountry.set(countryKey(country), population);
  });
  return populationByCountry;
}

function buildScatterData(educationRows, fertilityRows, populationRows) {
  const fertilityByCode = new Map();
  const populationByCountry = buildPopulationByCountry(populationRows);

  fertilityRows.forEach((row) => {
    const code = row["Country Code"];
    if (!code || AGGREGATE_CODES.has(code)) return;
    const latest = latestValue(row, 2024, 2024) ?? latestValue(row, 2019, 2024);
    if (latest) {
      fertilityByCode.set(code, {
        fertility: latest.value,
        fertilityYear: latest.year,
      });
    }
  });

  return educationRows
    .map((row) => {
      const code = row["Country Code"];
      if (!code || AGGREGATE_CODES.has(code)) return null;
      const education = latestValue(row, 2019, 2024);
      const fertility = fertilityByCode.get(code);
      if (!education || !fertility) return null;
      const highlight = HIGHLIGHT_COLORS[code] ? code : "Other";
      return {
        code,
        country: row["Country Name"],
        education: education.value,
        educationYear: education.year,
        fertility: fertility.fertility,
        fertilityYear: fertility.fertilityYear,
        population: populationByCountry.get(countryKey(row["Country Name"])) ?? null,
        population_for_size: populationByCountry.get(countryKey(row["Country Name"])) ?? 1_000_000,
        highlight,
        label: HIGHLIGHT_COLORS[code] ? code : "",
      };
    })
    .filter(Boolean)
    .filter((row) => row.education >= 0 && row.education <= 160 && row.fertility > 0)
    .sort((a, b) => a.education - b.education);
}

function linearRegression(rows) {
  const n = rows.length;
  const meanX = rows.reduce((sum, row) => sum + row.education, 0) / n;
  const meanY = rows.reduce((sum, row) => sum + row.fertility, 0) / n;
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  rows.forEach((row) => {
    const dx = row.education - meanX;
    const dy = row.fertility - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  });
  return {
    slope: numerator / denomX,
    intercept: meanY - (numerator / denomX) * meanX,
    r: numerator / Math.sqrt(denomX * denomY),
  };
}

function buildScatterSpec(rows) {
  const regression = linearRegression(rows);
  const xMax = Math.max(100, Math.ceil(Math.max(...rows.map((row) => row.education)) / 20) * 20);
  const yMax = Math.ceil(Math.max(...rows.map((row) => row.fertility)) * 2) / 2;

  // Draw the trend line only over the central span of the data (trim the high
  // education outliers like South Korea) so the dashed line is not too long.
  const eduSorted = rows.map((row) => row.education).sort((a, b) => a - b);
  const regressionExtent = [
    eduSorted[0],
    eduSorted[eduSorted.length - 2] +
      0.35 * (eduSorted[eduSorted.length - 1] - eduSorted[eduSorted.length - 2]),
  ];

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 500,
    background: null,
    data: { values: rows },
    layer: [
      {
        transform: [{ regression: "fertility", on: "education", extent: regressionExtent }],
        mark: {
          type: "line",
          color: TREND_COLOR,
          strokeDash: [3, 3],
          strokeWidth: 2.4,
          opacity: 0.85,
        },
        encoding: {
          x: {
            field: "education",
            type: "quantitative",
            scale: { domain: [0, xMax] },
            axis: {
              title: "Tertiary education enrolment (% gross)",
              titleColor: POINT_COLOR,
              labelColor: "#4A4038",
              grid: false,
              domainColor: "#8B8177",
              tickColor: "#8B8177",
            },
          },
          y: {
            field: "fertility",
            type: "quantitative",
            scale: { domain: [0, yMax] },
            axis: {
              title: "Fertility rate (births per woman)",
              titleColor: TREND_COLOR,
              labelColor: "#4A4038",
              gridColor: "#D8CFC0",
              gridOpacity: 0.45,
              domainColor: "#8B8177",
              tickColor: "#8B8177",
            },
          },
        },
      },
      {
        mark: {
          type: "circle",
          opacity: 0.48,
          stroke: "white",
          strokeWidth: 1,
        },
        encoding: {
          x: {
            field: "education",
            type: "quantitative",
            scale: { domain: [0, xMax] },
            axis: {
              title: "Tertiary education enrolment (% gross)",
              titleColor: POINT_COLOR,
              labelColor: "#4A4038",
              grid: false,
              domainColor: "#8B8177",
              tickColor: "#8B8177",
            },
          },
          y: {
            field: "fertility",
            type: "quantitative",
            scale: { domain: [0, yMax] },
            axis: {
              title: "Fertility rate (births per woman)",
              titleColor: TREND_COLOR,
              labelColor: "#4A4038",
              gridColor: "#D8CFC0",
              gridOpacity: 0.45,
              domainColor: "#8B8177",
              tickColor: "#8B8177",
            },
          },
          size: {
            field: "population_for_size",
            type: "quantitative",
            scale: { type: "sqrt", range: [18, 900] },
            legend: {
              title: "Population",
              values: [10_000_000, 100_000_000, 1_000_000_000],
              format: ".2s",
              titleFont: "Times New Roman",
              labelFont: "Times New Roman",
            },
          },
          color: {
            field: "highlight",
            type: "nominal",
            scale: {
              domain: ["Other", "AUS", "KOR", "CHN", "IND"],
              range: [POINT_COLOR, HIGHLIGHT_COLORS.AUS, HIGHLIGHT_COLORS.KOR, HIGHLIGHT_COLORS.CHN, HIGHLIGHT_COLORS.IND],
            },
            legend: null,
          },
          opacity: {
            condition: { test: "datum.highlight !== 'Other'", value: 0.96 },
            value: 0.34,
          },
          tooltip: [
            { field: "country", type: "nominal", title: "Country" },
            { field: "education", type: "quantitative", title: "Tertiary enrolment", format: ".1f" },
            { field: "educationYear", type: "ordinal", title: "Education year" },
            { field: "fertility", type: "quantitative", title: "Fertility rate", format: ".2f" },
            { field: "fertilityYear", type: "ordinal", title: "Fertility year" },
            { field: "population", type: "quantitative", title: "Population", format: ",.0f" },
          ],
        },
      },
      {
        transform: [{ filter: "datum.highlight !== 'Other'" }],
        mark: {
          type: "text",
          align: "left",
          baseline: "middle",
          dx: 8,
          font: "Times New Roman",
          fontSize: 12,
          fontWeight: "bold",
        },
        encoding: {
          x: { field: "education", type: "quantitative", scale: { domain: [0, xMax] } },
          y: { field: "fertility", type: "quantitative", scale: { domain: [0, yMax] } },
          text: { field: "label" },
          color: {
            field: "highlight",
            type: "nominal",
            scale: {
              domain: ["AUS", "KOR", "CHN", "IND"],
              range: [HIGHLIGHT_COLORS.AUS, HIGHLIGHT_COLORS.KOR, HIGHLIGHT_COLORS.CHN, HIGHLIGHT_COLORS.IND],
            },
            legend: null,
          },
        },
      },
      {
        data: {
          values: [
            {
              x: xMax,
              y: yMax * 0.96,
              label: `Correlation r = ${regression.r.toFixed(2)}`,
            },
          ],
        },
        mark: {
          type: "text",
          align: "right",
          font: "Times New Roman",
          fontSize: 13,
          fontWeight: "bold",
          color: TREND_COLOR,
        },
        encoding: {
          x: { field: "x", type: "quantitative", scale: { domain: [0, xMax] } },
          y: { field: "y", type: "quantitative", scale: { domain: [0, yMax] } },
          text: { field: "label" },
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

async function renderEducationScatter() {
  const container = document.querySelector("#education-fertility-scatter");

  try {
    const [educationResponse, fertilityResponse, populationResponse] = await Promise.all([
      fetch(EDUCATION_URL),
      fetch(FERTILITY_URL),
      fetch(POPULATION_URL),
    ]);

    if (!educationResponse.ok || !fertilityResponse.ok || !populationResponse.ok) {
      throw new Error("Could not load education, fertility or population CSV.");
    }

    const [educationText, fertilityText, populationText] = await Promise.all([
      educationResponse.text(),
      fertilityResponse.text(),
      populationResponse.text(),
    ]);
    const rows = buildScatterData(
      parseWdiCsv(educationText),
      parseWdiCsv(fertilityText),
      parseSimpleCsv(populationText)
    );

    if (rows.length < 10) throw new Error(`Only ${rows.length} joined countries available.`);
    await vegaEmbed(container, buildScatterSpec(rows), { actions: false, renderer: "svg" });
  } catch (error) {
    console.error("Education/fertility scatter failed:", error);
    if (container) {
      container.innerHTML = `<p class="error-message">Could not load education/fertility scatter: ${error.message}</p>`;
    }
  }
}

renderEducationScatter();
})();
