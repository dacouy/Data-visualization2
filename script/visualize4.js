const ASFR_THREE_YEAR_URL = "data/part4/asfr_national_1976_2000_2024.csv";
const RIDGE_FONT = "Times New Roman";
const RIDGE_BACKGROUND = "#FFFFFF";
const RIDGE_AGE_GROUPS = ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49"];
const RIDGE_YEARS_BOTTOM_TO_TOP = [2024, 2000, 1976];
const YEAR_COLORS = {
  1976: "#8B1A1A",
  2000: "#D4820A",
  2024: "#2D6B6B",
};
const YEAR_GRADIENTS = {
  1976: [
    { offset: 0, color: "#fffafa" },
    { offset: 0.166, color: "#7f1818" },
    { offset: 0.333, color: "#4d0707" },
    { offset: 0.5, color: "#ba5548" },
    { offset: 0.666, color: "#f0b7ad" },
    { offset: 0.833, color: "#f7ddd8" },
    { offset: 1, color: "#fbefed" },
  ],
  2000: [
    { offset: 0, color: "#fffdf8" },
    { offset: 0.166, color: "#e7a24c" },
    { offset: 0.333, color: "#a55c00" },
    { offset: 0.5, color: "#7e4200" },
    { offset: 0.666, color: "#edae5b" },
    { offset: 0.833, color: "#f8d8a9" },
    { offset: 1, color: "#fcf0dc" },
  ],
  2024: [
    { offset: 0, color: "#fbffff" },
    { offset: 0.166, color: "#b9d8d6" },
    { offset: 0.333, color: "#579594" },
    { offset: 0.5, color: "#164d4d" },
    { offset: 0.666, color: "#609f9d" },
    { offset: 0.833, color: "#c9e3e1" },
    { offset: 1, color: "#edf7f6" },
  ],
};
const YEAR_LEGEND_GRADIENTS = {
  1976: "linear-gradient(90deg, #fffafa 0%, #fffafa 12%, #d87061 52%, #5f0b0b 100%)",
  2000: "linear-gradient(90deg, #fffdf8 0%, #fffdf8 12%, #e69b3f 52%, #9c5700 100%)",
  2024: "linear-gradient(90deg, #fbffff 0%, #fbffff 12%, #579594 52%, #164d4d 100%)",
};
const YEAR_LEGEND_VALUES = {
  1976: { low: "0.4", high: "146.2" },
  2000: { low: "0.4", high: "110.2" },
  2024: { low: "1.4", high: "106.0" },
};
const RIDGE_GAP = 92;
const RIDGE_HEIGHT = 74;
const RIDGE_ANNOTATIONS = [
  { year: 1976, year_label: "1976", age_group: "25-29", asfr: 146.2, y: 260, point_y: 257, text: "1976 peak: 25-29" },
  { year: 2000, year_label: "2000", age_group: "30-34", asfr: 110.2, y: 165, point_y: 165, text: "2000 crossover" },
  { year: 2024, year_label: "2024", age_group: "30-34", asfr: 106.0, y: 75, point_y: 73, text: "2024 peak: 30-34" },
];
const RIDGE_TITLE_ANNOTATION = [
  {
    age_group: "35-39",
    y: 143,
    text: "The shift into the thirties began around 2000",
  },
];

function parseAsfrThreeYearCsv(csvText) {
  return csvText
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [year, age_group, asfr] = line.split(",");
      return {
        year: Number(year),
        age_group,
        asfr: Number(asfr),
        year_label: year,
      };
    });
}

function prepareThreeYearRows(rows) {
  const maxByYear = {};

  RIDGE_YEARS_BOTTOM_TO_TOP.forEach((year) => {
    maxByYear[year] = Math.max(
      ...rows.filter((row) => row.year === year).map((row) => row.asfr)
    );
  });

  return rows.map((row) => {
    const yearIndex = RIDGE_YEARS_BOTTOM_TO_TOP.indexOf(row.year);
    const baseline = yearIndex * RIDGE_GAP;
    const height = (row.asfr / maxByYear[row.year]) * RIDGE_HEIGHT;

    return {
      ...row,
      baseline,
      ridge_top: baseline + height,
      year_order: yearIndex,
    };
  });
}

function ridgeAreaLayer(year, values) {
  return {
    data: { values },
    transform: [{ filter: `datum.year === ${year}` }],
    mark: {
      type: "area",
      interpolate: "monotone",
      fill: {
        gradient: "linear",
        x1: 0,
        x2: 1,
        y1: 0,
        y2: 0,
        stops: YEAR_GRADIENTS[year],
      },
      fillOpacity: 0.9,
      line: {
        color: YEAR_COLORS[year],
        strokeWidth: 1.85,
      },
    },
    encoding: {
      x: {
        field: "age_group",
        type: "ordinal",
        sort: RIDGE_AGE_GROUPS,
        axis: null,
      },
      y: {
        field: "ridge_top",
        type: "quantitative",
        scale: { domain: [-44, 278] },
        axis: null,
      },
      y2: { field: "baseline" },
      tooltip: [
        { field: "year", type: "quantitative", title: "Year", format: "d" },
        { field: "age_group", type: "nominal", title: "Age group" },
        { field: "asfr", type: "quantitative", title: "ASFR", format: ".1f" },
      ],
    },
  };
}

function buildThreeYearRidgelineSpec(values) {
  const yearLabels = RIDGE_YEARS_BOTTOM_TO_TOP.map((year, index) => ({
    year_label: String(year),
    age_group: "15-19",
    y: index * RIDGE_GAP + 34,
  }));
  const xAxisLabels = RIDGE_AGE_GROUPS.map((age_group) => ({
    age_group,
    y: -24,
  }));
  const xAxisTicks = RIDGE_AGE_GROUPS.map((age_group) => ({
    age_group,
    y: -7,
    y2: -12,
  }));

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 460,
    background: RIDGE_BACKGROUND,
    padding: { left: 0, right: 2, top: 12, bottom: 44 },
    layer: [
      ridgeAreaLayer(1976, values),
      ridgeAreaLayer(2000, values),
      ridgeAreaLayer(2024, values),
      {
        data: { values: [{ y: -7 }] },
        mark: {
          type: "rule",
          stroke: "#4A4038",
          strokeWidth: 0.9,
          opacity: 0.7,
        },
        encoding: {
          y: { field: "y", type: "quantitative", scale: { domain: [-44, 278] } },
        },
      },
      {
        data: { values: xAxisTicks },
        mark: {
          type: "rule",
          stroke: "#4A4038",
          strokeWidth: 0.75,
          opacity: 0.7,
        },
        encoding: {
          x: { field: "age_group", type: "ordinal", sort: RIDGE_AGE_GROUPS },
          y: { field: "y", type: "quantitative", scale: { domain: [-44, 278] } },
          y2: { field: "y2" },
        },
      },
      {
        data: { values: xAxisLabels },
        mark: {
          type: "text",
          align: "center",
          baseline: "top",
          font: RIDGE_FONT,
          fontSize: 12,
          color: "#4A4038",
        },
        encoding: {
          x: { field: "age_group", type: "ordinal", sort: RIDGE_AGE_GROUPS },
          y: { field: "y", type: "quantitative", scale: { domain: [-44, 278] } },
          text: { field: "age_group" },
        },
      },
      {
        data: { values: [{ age_group: "30-34", y: -39, label: "Age group of mother" }] },
        mark: {
          type: "text",
          align: "center",
          baseline: "top",
          font: RIDGE_FONT,
          fontSize: 13,
          fontWeight: "bold",
          color: "#4A4038",
        },
        encoding: {
          x: { field: "age_group", type: "ordinal", sort: RIDGE_AGE_GROUPS },
          y: { field: "y", type: "quantitative", scale: { domain: [-44, 278] } },
          text: { field: "label" },
        },
      },
      {
        data: { values: yearLabels },
        mark: {
          type: "text",
          align: "right",
          baseline: "middle",
          dx: 0,
          font: RIDGE_FONT,
          fontSize: 13,
          fontWeight: "bold",
          color: "#1C1C1C",
        },
        encoding: {
          x: { field: "age_group", type: "ordinal", sort: RIDGE_AGE_GROUPS },
          y: { field: "y", type: "quantitative" },
          text: { field: "year_label" },
        },
      },
      {
        data: { values: RIDGE_TITLE_ANNOTATION },
        mark: {
          type: "text",
          align: "left",
          baseline: "middle",
          dx: 12,
          font: RIDGE_FONT,
          fontSize: 13,
          fontWeight: "bold",
          color: "#1C1C1C",
        },
        encoding: {
          x: { field: "age_group", type: "ordinal", sort: RIDGE_AGE_GROUPS },
          y: { field: "y", type: "quantitative" },
          text: { field: "text" },
        },
      },
      {
        data: { values: RIDGE_ANNOTATIONS },
        mark: {
          type: "point",
          filled: true,
          size: 70,
          stroke: RIDGE_BACKGROUND,
          strokeWidth: 1.5,
        },
        encoding: {
          x: { field: "age_group", type: "ordinal", sort: RIDGE_AGE_GROUPS },
          y: { field: "point_y", type: "quantitative" },
          color: {
            field: "year_label",
            type: "nominal",
            scale: {
              domain: ["1976", "2000", "2024"],
              range: [YEAR_COLORS[1976], YEAR_COLORS[2000], YEAR_COLORS[2024]],
            },
            legend: null,
          },
          tooltip: [
            { field: "year", type: "quantitative", title: "Year", format: "d" },
            { field: "age_group", type: "nominal", title: "Age group" },
            { field: "asfr", type: "quantitative", title: "ASFR", format: ".1f" },
          ],
        },
      },
      {
        data: { values: RIDGE_ANNOTATIONS },
        transform: [{ filter: "datum.year !== 2024" }],
        mark: {
          type: "text",
          align: "left",
          baseline: "middle",
          dx: 18,
          dy: -7,
          font: RIDGE_FONT,
          fontSize: 12,
          fontWeight: "bold",
          color: "#1C1C1C",
        },
        encoding: {
          x: { field: "age_group", type: "ordinal", sort: RIDGE_AGE_GROUPS },
          y: { field: "y", type: "quantitative" },
          text: { field: "text" },
        },
      },
      {
        data: { values: RIDGE_ANNOTATIONS },
        transform: [{ filter: "datum.year === 2024" }],
        mark: {
          type: "text",
          align: "left",
          baseline: "middle",
          dx: 18,
          dy: -5,
          font: RIDGE_FONT,
          fontSize: 12,
          fontWeight: "bold",
          color: "#1C1C1C",
        },
        encoding: {
          x: { field: "age_group", type: "ordinal", sort: RIDGE_AGE_GROUPS },
          y: { field: "y", type: "quantitative" },
          text: { field: "text" },
        },
      },
    ],
    config: {
      view: { stroke: null },
      font: RIDGE_FONT,
      axis: { grid: false },
    },
  };
}

async function renderThreeYearRidgeline() {
  const response = await fetch(ASFR_THREE_YEAR_URL);
  const csvText = await response.text();
  const rows = prepareThreeYearRows(parseAsfrThreeYearCsv(csvText));

  await vegaEmbed("#asfr-ridgeline", buildThreeYearRidgelineSpec(rows), {
    actions: false,
    renderer: "svg",
    tooltip: { theme: "light" },
  });
  renderRidgeLuminanceLegend();
}

function renderRidgeLuminanceLegend() {
  const container = document.querySelector("#asfr-ridgeline");
  if (!container) return;

  container.querySelector(".ridge-luminance-legend")?.remove();

  const legend = document.createElement("div");
  legend.className = "ridge-luminance-legend";
  legend.innerHTML = `
    <div class="ridge-luminance-legend__title">ASFR intensity</div>
    <div class="ridge-luminance-legend__scale">
      <span></span>
      <span>Lower</span>
      <span></span>
      <span>Higher</span>
    </div>
    ${[1976, 2000, 2024]
      .map(
        (year) => `
          <div class="ridge-luminance-legend__row">
            <span class="ridge-luminance-legend__year">${year}</span>
            <span class="ridge-luminance-legend__value">${YEAR_LEGEND_VALUES[year].low}</span>
            <span class="ridge-luminance-legend__bar" style="background: ${YEAR_LEGEND_GRADIENTS[year]}"></span>
            <span class="ridge-luminance-legend__value">${YEAR_LEGEND_VALUES[year].high}</span>
          </div>
        `
      )
      .join("")}
  `;
  container.appendChild(legend);
}

renderThreeYearRidgeline();
