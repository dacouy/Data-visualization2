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
const RIDGE_GAP = 92;
const RIDGE_HEIGHT = 74;
const RIDGE_ANNOTATIONS = [
  { year: 1976, year_label: "1976", age_group: "25-29", asfr: 146.2, y: 260, point_y: 257, text: "1976 peak: 25-29" },
  { year: 2000, year_label: "2000", age_group: "30-34", asfr: 110.2, y: 165, point_y: 165, text: "2000 crossover" },
  { year: 2024, year_label: "2024", age_group: "30-34", asfr: 106.0, y: 75, point_y: 73, text: "2024 peak: 30-34" },
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

function buildThreeYearRidgelineSpec(values) {
  const yearLabels = RIDGE_YEARS_BOTTOM_TO_TOP.map((year, index) => ({
    year_label: String(year),
    age_group: "15-19",
    y: index * RIDGE_GAP + 34,
  }));

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 460,
    background: RIDGE_BACKGROUND,
    padding: { left: 0, right: 2, top: 12, bottom: 18 },
    title: {
      text: "Motherhood has shifted from the twenties to the thirties",
      subtitle: "Age-specific fertility rate, Australia, 1976, 2000 and 2024",
      anchor: "start",
      dx: 24,
      font: RIDGE_FONT,
      subtitleFont: RIDGE_FONT,
      fontSize: 22,
      subtitleFontSize: 14,
      color: "#1C1C1C",
      subtitleColor: "#4A4038",
    },
    layer: [
      {
        data: { values },
        mark: {
          type: "area",
          interpolate: "monotone",
          opacity: 0.62,
          line: {
            strokeWidth: 1.35,
          },
        },
        encoding: {
          x: {
            field: "age_group",
            type: "ordinal",
            sort: RIDGE_AGE_GROUPS,
            axis: {
              title: "Age group of mother",
              labelFont: RIDGE_FONT,
              titleFont: RIDGE_FONT,
              labelFontSize: 12,
              titleFontSize: 13,
              labelAngle: 0,
              grid: true,
              gridColor: "#D8CFC0",
              gridOpacity: 0.45,
              domainColor: "#1C1C1C",
              tickColor: "#1C1C1C",
            },
          },
          y: {
            field: "ridge_top",
            type: "quantitative",
            scale: { domain: [-8, 278] },
            axis: null,
          },
          y2: { field: "baseline" },
          color: {
            field: "year_label",
            type: "nominal",
            scale: {
              domain: ["1976", "2000", "2024"],
              range: [YEAR_COLORS[1976], YEAR_COLORS[2000], YEAR_COLORS[2024]],
            },
            legend: {
              title: null,
              orient: "top-right",
              labelFont: RIDGE_FONT,
              labelFontSize: 16,
              symbolType: "stroke",
              symbolSize: 180,
              symbolStrokeWidth: 4,
            },
          },
          detail: { field: "year_label", type: "nominal" },
          order: { field: "year_order", type: "quantitative" },
          tooltip: [
            { field: "year", type: "quantitative", title: "Year", format: "d" },
            { field: "age_group", type: "nominal", title: "Age group" },
            { field: "asfr", type: "quantitative", title: "ASFR", format: ".1f" },
          ],
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

  vegaEmbed("#asfr-ridgeline", buildThreeYearRidgelineSpec(rows), {
    actions: false,
    renderer: "svg",
    tooltip: { theme: "light" },
  });
}

renderThreeYearRidgeline();
