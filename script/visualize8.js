(() => {
const EDUCATION_URL = "data/part5/education.csv";
const FERTILITY_URL = "data/part5/fertility_rate.csv";
const POPULATION_URL = "data/part5/population_2024.csv";
const WORLD_FONT = "Times New Roman";
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
  "SST", "TEA", "TEC", "TLA", "TMN", "TSA", "TSS", "UMC", "WLD"
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

  if (headerIndex < 0) {
    throw new Error("Could not find World Bank CSV header.");
  }

  const headers = parseCsvLine(lines[headerIndex]).map((header) =>
    header.replace(/^\uFEFF/, "")
  );

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
        country: row["Country Name"],
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
      return {
        code,
        country: row["Country Name"],
        education: education.value,
        educationYear: education.year,
        fertility: fertility.fertility,
        fertilityYear: fertility.fertilityYear,
        population: populationByCountry.get(countryKey(row["Country Name"])) ?? null,
      };
    })
    .filter(Boolean)
    .filter((row) => row.education >= 0 && row.education <= 160 && row.fertility > 0)
    .sort((a, b) => a.education - b.education);
}

function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
  return (value) => {
    const ratio = (value - domainMin) / (domainMax - domainMin);
    return rangeMin + ratio * (rangeMax - rangeMin);
  };
}

function scaleSqrt(domainMin, domainMax, rangeMin, rangeMax) {
  const sqrtMin = Math.sqrt(domainMin);
  const sqrtMax = Math.sqrt(domainMax);

  return (value) => {
    const safeValue = Math.max(domainMin, Math.min(domainMax, value));
    const ratio = (Math.sqrt(safeValue) - sqrtMin) / (sqrtMax - sqrtMin);
    return rangeMin + ratio * (rangeMax - rangeMin);
  };
}

function formatPopulation(value) {
  if (value === null) return "No population match";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(Math.round(value));
}

function createSvgElement(tag, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
}

function appendText(svg, text, x, y, attrs = {}) {
  const element = createSvgElement("text", {
    x,
    y,
    "font-family": WORLD_FONT,
    ...attrs,
  });
  element.textContent = text;
  svg.appendChild(element);
  return element;
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

  const slope = numerator / denomX;
  const intercept = meanY - slope * meanX;
  const r = numerator / Math.sqrt(denomX * denomY);

  return { slope, intercept, r };
}

function drawScatter(rows) {
  const container = document.querySelector("#education-fertility-scatter");
  if (!container) return;
  container.innerHTML = "";

  const width = 960;
  const height = 620;
  const margin = { left: 86, right: 96, top: 86, bottom: 78 };
  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;
  const maxEducation = Math.ceil(Math.max(...rows.map((row) => row.education)) / 20) * 20;
  const xMax = Math.max(100, maxEducation);
  const yMax = Math.ceil(Math.max(...rows.map((row) => row.fertility)) * 2) / 2;
  const xScale = scaleLinear(0, xMax, plotLeft, plotRight);
  const yScale = scaleLinear(0, yMax, plotBottom, plotTop);
  const populationValues = rows
    .map((row) => row.population)
    .filter((value) => value !== null && value > 0);
  const populationScale = scaleSqrt(
    Math.min(...populationValues),
    Math.max(...populationValues),
    4,
    18
  );
  const regression = linearRegression(rows);

  const svg = createSvgElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": "Scatterplot of tertiary education and fertility by country",
  });
  container.appendChild(svg);

  appendText(svg, "Education gradient", plotLeft, 34, {
    "font-size": 24,
    "font-weight": "bold",
    fill: "#1C1C1C",
  });
  appendText(
    svg,
    "Tertiary enrolment vs fertility rate. Circle size shows 2024 population.",
    plotLeft,
    58,
    { "font-size": 14, fill: "#4A4038" }
  );

  const xTicks = Array.from({ length: Math.floor(xMax / 20) + 1 }, (_, i) => i * 20);
  const yTicks = Array.from({ length: Math.floor(yMax) + 1 }, (_, i) => i);

  yTicks.forEach((tick) => {
    const y = yScale(tick);
    svg.appendChild(
      createSvgElement("line", {
        x1: plotLeft,
        x2: plotRight,
        y1: y,
        y2: y,
        stroke: "#D8CFC0",
        "stroke-opacity": 0.45,
      })
    );
    appendText(svg, String(tick), plotLeft - 10, y + 4, {
      "font-size": 11,
      fill: "#4A4038",
      "text-anchor": "end",
    });
  });

  xTicks.filter((tick) => tick !== 0).forEach((tick) => {
    const x = xScale(tick);
    svg.appendChild(
      createSvgElement("line", {
        x1: x,
        x2: x,
        y1: plotBottom,
        y2: plotBottom + 5,
        stroke: "#8B8177",
      })
    );
    appendText(svg, String(tick), x, plotBottom + 22, {
      "font-size": 11,
      fill: "#4A4038",
      "text-anchor": "middle",
    });
  });

  svg.appendChild(
    createSvgElement("line", {
      x1: plotLeft,
      x2: plotRight,
      y1: plotBottom,
      y2: plotBottom,
      stroke: "#8B8177",
    })
  );
  svg.appendChild(
    createSvgElement("line", {
      x1: plotLeft,
      x2: plotLeft,
      y1: plotTop,
      y2: plotBottom,
      stroke: "#8B8177",
    })
  );

  appendText(svg, "Tertiary education enrolment (% gross)", (plotLeft + plotRight) / 2, height - 22, {
    "font-size": 13,
    "font-weight": "bold",
    fill: POINT_COLOR,
    "text-anchor": "middle",
  });
  const yLabelX = 34;
  const yLabel = appendText(svg, "Fertility rate (births per woman)", yLabelX, (plotTop + plotBottom) / 2, {
    "font-size": 13,
    "font-weight": "bold",
    fill: TREND_COLOR,
    "text-anchor": "middle",
  });
  yLabel.setAttribute("transform", `rotate(-90 ${yLabelX} ${(plotTop + plotBottom) / 2})`);

  const trendX1 = 0;
  const trendXAtZero =
    regression.slope < 0 ? (0 - regression.intercept) / regression.slope : xMax;
  const trendX2 = Math.min(xMax, Math.max(trendX1, trendXAtZero));
  const trendY1 = regression.intercept + regression.slope * trendX1;
  const trendY2 = regression.intercept + regression.slope * trendX2;
  svg.appendChild(
    createSvgElement("line", {
      x1: xScale(trendX1),
      x2: xScale(trendX2),
      y1: yScale(trendY1),
      y2: yScale(trendY2),
      stroke: TREND_COLOR,
      "stroke-width": 2.4,
      "stroke-dasharray": "6 4",
      opacity: 0.85,
    })
  );

  const tooltip = document.createElement("div");
  tooltip.className = "scatter-tooltip";
  container.appendChild(tooltip);

  [...rows]
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .forEach((row) => {
      const highlighted = Boolean(HIGHLIGHT_COLORS[row.code]);
      const radius =
        row.population !== null && row.population > 0
          ? populationScale(row.population)
          : highlighted
            ? 5.8
            : 4.2;
      const point = createSvgElement("circle", {
        cx: xScale(row.education),
        cy: yScale(row.fertility),
        r: highlighted ? radius + 2.2 : radius,
        fill: highlighted ? HIGHLIGHT_COLORS[row.code] : POINT_COLOR,
        opacity: highlighted ? 0.96 : 0.34,
        stroke: highlighted ? "#1C1C1C" : "#FFFFFF",
        "stroke-width": highlighted ? 2 : 1,
      });
      point.addEventListener("mouseenter", (event) => showTooltip(event, tooltip, row));
      point.addEventListener("mousemove", (event) => showTooltip(event, tooltip, row));
      point.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0";
      });
      svg.appendChild(point);
    });

  const legendX = plotRight + 7;
  const legendY = plotTop + (plotBottom - plotTop) / 2 - 12;
  appendText(svg, "Population", legendX, legendY - 18, {
    "font-size": 12,
    "font-weight": "bold",
    fill: "#4A4038",
  });
  [
    { label: "10M", value: 10_000_000 },
    { label: "100M", value: 100_000_000 },
    { label: "1B", value: 1_000_000_000 },
  ].forEach((item, index) => {
    const x = legendX + index * 36;
    svg.appendChild(
      createSvgElement("circle", {
        cx: x,
        cy: legendY,
        r: populationScale(item.value),
        fill: POINT_COLOR,
        opacity: 0.32,
        stroke: "#FFFFFF",
        "stroke-width": 1,
      })
    );
    appendText(svg, item.label, x, legendY + 30, {
      "font-size": 11,
      fill: "#4A4038",
      "text-anchor": "middle",
    });
  });

  rows
    .filter((row) => HIGHLIGHT_COLORS[row.code])
    .forEach((row) => {
      const labelOffset = {
        AUS: { dx: 8, dy: -8 },
        KOR: { dx: 8, dy: -8 },
        CHN: { dx: 8, dy: 27 },
        IND: { dx: 8, dy: -21 },
      }[row.code];
      appendText(svg, row.code, xScale(row.education) + labelOffset.dx, yScale(row.fertility) + labelOffset.dy, {
        "font-size": 11,
        "font-weight": "bold",
        fill: HIGHLIGHT_COLORS[row.code],
      });
    });

  appendText(svg, `Correlation r = ${regression.r.toFixed(2)}`, plotRight - 6, plotTop + 12, {
    "font-size": 13,
    "font-weight": "bold",
    fill: TREND_COLOR,
    "text-anchor": "end",
  });
  appendText(svg, "Higher education is associated with lower fertility", plotRight - 6, plotTop + 32, {
    "font-size": 12,
    fill: "#4A4038",
    "text-anchor": "end",
  });
}

function showTooltip(event, tooltip, row) {
  const rect = tooltip.parentElement.getBoundingClientRect();
  tooltip.innerHTML = `
    <strong>${row.country}</strong><br>
    Tertiary enrolment: ${row.education.toFixed(1)}% (${row.educationYear})<br>
    Fertility rate: ${row.fertility.toFixed(2)} (${row.fertilityYear})<br>
    Population: ${formatPopulation(row.population)}
  `;
  tooltip.style.opacity = "1";
  tooltip.style.left = `${event.clientX - rect.left + 14}px`;
  tooltip.style.top = `${event.clientY - rect.top + 14}px`;
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

    if (rows.length < 10) {
      throw new Error(`Only ${rows.length} joined countries available.`);
    }

    console.log(`Education/fertility scatter joined countries: ${rows.length}`);
    console.log(
      `Education/fertility scatter countries with population: ${
        rows.filter((row) => row.population !== null).length
      }`
    );
    drawScatter(rows);
  } catch (error) {
    console.error("Education/fertility scatter failed:", error);
    if (container) {
      container.innerHTML = `<p class="error-message">Could not load education/fertility scatter: ${error.message}</p>`;
    }
  }
}

renderEducationScatter();
})();
