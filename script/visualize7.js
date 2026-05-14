(() => {
const HOUSING_TFR_URL = "data/part5/tfr_house_price_2009_2024.csv";
const HOUSING_FONT = "Times New Roman";
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
  const headerIndex = lines.findIndex((line) =>
    parseCsvLine(line)
      .map((header) => header.toLowerCase())
      .includes("year")
  );

  if (headerIndex < 0) {
    throw new Error("CSV is missing a year column.");
  }

  const headers = parseCsvLine(lines[headerIndex]);
  return lines.slice(headerIndex + 1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
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
    }))
    .filter(
      (row) =>
        row.year >= START_YEAR &&
        row.year <= END_YEAR &&
        row.tfr !== null &&
        row.house_price_index !== null
    );
  const byYear = new Map(data.map((row) => [row.year, row]));
  const missingYears = [];

  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    if (!byYear.has(year)) missingYears.push(year);
  }

  if (missingYears.length > 0) {
    console.warn("VIZ 7 missing joined years:", missingYears);
  }

  return data.sort((a, b) => a.year - b.year);
}

function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
  return (value) => {
    const ratio = (value - domainMin) / (domainMax - domainMin);
    return rangeMin + ratio * (rangeMax - rangeMin);
  };
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
    "font-family": HOUSING_FONT,
    ...attrs,
  });
  element.textContent = text;
  svg.appendChild(element);
  return element;
}

function drawAxis(svg, config) {
  const { x1, x2, y, ticks, format, color = "#4A4038" } = config;
  svg.appendChild(
    createSvgElement("line", {
      x1,
      x2,
      y1: y,
      y2: y,
      stroke: "#D8CFC0",
      "stroke-width": 1,
    })
  );

  ticks.forEach((tick) => {
    const x = config.scale(tick);
    svg.appendChild(
      createSvgElement("line", {
        x1: x,
        x2: x,
        y1: y,
        y2: y + 5,
        stroke: "#8B8177",
        "stroke-width": 1,
      })
    );
    appendText(svg, format(tick), x, y + 19, {
      "font-size": 11,
      fill: color,
      "text-anchor": "middle",
    });
  });
}

function drawYAxis(svg, config) {
  const { x, y1, y2, ticks, scale, title, color, side = "left" } = config;
  const isRight = side === "right";
  svg.appendChild(
    createSvgElement("line", {
      x1: x,
      x2: x,
      y1,
      y2,
      stroke: "#D8CFC0",
      "stroke-width": 1,
    })
  );

  ticks.forEach((tick) => {
    const y = scale(tick);
    svg.appendChild(
      createSvgElement("line", {
        x1: isRight ? x : x - 5,
        x2: isRight ? x + 5 : x,
        y1: y,
        y2: y,
        stroke: "#8B8177",
        "stroke-width": 1,
      })
    );
    appendText(svg, tick.toFixed(tick < 10 ? 1 : 0), isRight ? x + 9 : x - 9, y + 4, {
      "font-size": 11,
      fill: color,
      "text-anchor": isRight ? "start" : "end",
    });
  });

  const labelX = isRight ? x + 54 : x - 46;
  const label = appendText(svg, title, labelX, (y1 + y2) / 2, {
    "font-size": 13,
    fill: color,
    "text-anchor": "middle",
    "font-weight": "bold",
  });
  label.setAttribute("transform", `rotate(${isRight ? 90 : -90} ${labelX} ${(y1 + y2) / 2})`);
}

function renderChart(data) {
  const container = document.querySelector("#housing-tfr-chart");
  if (!container) return;

  container.innerHTML = "";

  const width = 1000;
  const height = 540;
  const margin = { left: 76, right: 140, top: 88, bottom: 54 };
  const innerLeft = margin.left;
  const innerRight = width - margin.right;
  const rightAxisX = innerRight + 18;
  const xPlotLeft = innerLeft + 34;
  const xPlotRight = innerRight - 18;
  const plotTop = 112;
  const plotBottom = 486;
  const years = data.map((row) => row.year);
  const houseMax = Math.ceil((Math.max(...data.map((row) => row.house_price_index)) + 8) / 10) * 10;
  const xScale = scaleLinear(START_YEAR, END_YEAR, xPlotLeft, xPlotRight);
  const tfrScale = scaleLinear(1.3, 2.15, plotBottom, plotTop);
  const houseScale = scaleLinear(0, houseMax, plotBottom, plotTop + 74);
  const barWidth = Math.max(16, ((xPlotRight - xPlotLeft) / data.length) * 0.62);

  const svg = createSvgElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": "The Housing Trap chart",
  });
  container.appendChild(svg);

  appendText(svg, "Affordability pressure", innerLeft, 36, {
    "font-size": 24,
    "font-weight": "bold",
    fill: "#1C1C1C",
  });
  appendText(
    svg,
    "Line: total fertility rate. Bars: real home price index, Australia, 2009-2024.",
    innerLeft,
    60,
    { "font-size": 14, fill: "#4A4038" }
  );

  data.forEach((row) => {
    const x = xScale(row.year) - barWidth / 2;
    const y = houseScale(row.house_price_index);
    svg.appendChild(
      createSvgElement("rect", {
        x,
        y,
        width: barWidth,
        height: plotBottom - y,
        fill: HOUSE_COLOR,
        opacity: 0.34,
      })
    );
  });

  [1.4, 1.6, 1.8, 2.0].forEach((tick) => {
    const y = tfrScale(tick);
    svg.appendChild(
      createSvgElement("line", {
        x1: innerLeft,
        x2: innerRight,
        y1: y,
        y2: y,
        stroke: "#D8CFC0",
        "stroke-opacity": 0.55,
        "stroke-width": 1,
      })
    );
  });

  const replacementY = tfrScale(2.1);
  svg.appendChild(
    createSvgElement("line", {
      x1: innerLeft,
      x2: innerRight,
      y1: replacementY,
      y2: replacementY,
      stroke: "#777",
      "stroke-dasharray": "5 4",
      "stroke-width": 1,
    })
  );
  appendText(svg, "Replacement level", innerRight - 4, replacementY - 6, {
    "font-size": 11,
    fill: "#666",
    "text-anchor": "end",
  });

  drawYAxis(svg, {
    x: innerLeft,
    y1: plotTop,
    y2: plotBottom,
    ticks: [1.4, 1.6, 1.8, 2.0],
    scale: tfrScale,
    title: "Total fertility rate",
    color: TFR_COLOR,
  });

  drawYAxis(svg, {
    x: rightAxisX,
    y1: plotTop,
    y2: plotBottom,
    ticks: [40, 80, 120],
    scale: houseScale,
    title: "House price index",
    color: HOUSE_COLOR,
    side: "right",
  });

  const pathData = data
    .map((row, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${xScale(row.year).toFixed(2)} ${tfrScale(row.tfr).toFixed(2)}`;
    })
    .join(" ");
  svg.appendChild(
    createSvgElement("path", {
      d: pathData,
      fill: "none",
      stroke: TFR_COLOR,
      "stroke-width": 3,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    })
  );

  data
    .filter((row) => [START_YEAR, 2021, END_YEAR].includes(row.year))
    .forEach((row) => {
      svg.appendChild(
        createSvgElement("circle", {
          cx: xScale(row.year),
          cy: tfrScale(row.tfr),
          r: 5,
          fill: TFR_COLOR,
          stroke: "#FFFFFF",
          "stroke-width": 1.5,
        })
      );
    });

  drawAxis(svg, {
    x1: innerLeft,
    x2: innerRight,
    y: plotBottom,
    ticks: years.filter((year) => year % 2 === 1 || year === END_YEAR),
    scale: xScale,
    format: (year) => String(year),
  });

  const tooltip = document.createElement("div");
  tooltip.className = "housing-tooltip";
  container.appendChild(tooltip);

  data.forEach((row) => {
    const hoverRect = createSvgElement("rect", {
      x: xScale(row.year) - (xPlotRight - xPlotLeft) / data.length / 2,
      y: plotTop,
      width: (xPlotRight - xPlotLeft) / data.length,
      height: plotBottom - plotTop,
      fill: "transparent",
    });
    hoverRect.addEventListener("mouseenter", (event) => showTooltip(event, tooltip, row));
    hoverRect.addEventListener("mousemove", (event) => showTooltip(event, tooltip, row));
    hoverRect.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
    });
    svg.appendChild(hoverRect);
  });
}

function showTooltip(event, tooltip, row) {
  tooltip.innerHTML = `
    <strong>${row.year}</strong><br>
    TFR: ${row.tfr.toFixed(2)}<br>
    House price index: ${row.house_price_index.toFixed(1)}
  `;
  tooltip.style.opacity = "1";
  tooltip.style.left = `${event.offsetX + 14}px`;
  tooltip.style.top = `${event.offsetY + 14}px`;
}

async function renderHousingTimeline() {
  const container = document.querySelector("#housing-tfr-chart");

  try {
    const response = await fetch(HOUSING_TFR_URL);

    if (!response.ok) {
      throw new Error("Could not load VIZ 7 joined data file.");
    }

    const data = getCombinedRows(parseCsv(await response.text()));

    renderChart(data);
  } catch (error) {
    console.error("VIZ 7 failed:", error);
    if (container) {
      container.innerHTML = `<p class="error-message">Could not load The Housing Trap chart: ${error.message}</p>`;
    }
  }
}

renderHousingTimeline();
})();
