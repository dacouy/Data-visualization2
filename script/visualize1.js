const DATA_URL = "data/part1/total-fertility-rate.csv";
const REPLACEMENT_LEVEL = 2.1;
const START_YEAR = 1924;
const END_YEAR = 2024;
const REPLACEMENT_COLOR = "#6f6255";
const ABOVE_COLOR = "#2f7d32";
const BELOW_COLOR = "#8b1a1a";

const YEAR_TICKS = [1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2024];
const Y_DOMAIN = [1.0, 3.7];
const Y_TICKS = [1.0, 1.5, 2.0, 2.1, 2.5, 3.0, 3.5];
const AXIS_COLOR = "#6f6255";
const AXIS_RULE_COLOR = "#dacfc0";
const PAPER_COLOR = "#ffffff";

const tfrTooltip = [
  { field: "year", type: "ordinal", title: "Year" },
  { field: "tfr", type: "quantitative", title: "TFR", format: ".3f" },
];

const fullTfrTooltip = [
  { field: "year", type: "ordinal", title: "Year" },
  { field: "tfr", type: "quantitative", title: "Total fertility rate", format: ".3f" },
];

const yScale = { domain: Y_DOMAIN, zero: false };
const yearField = { field: "year", type: "quantitative" };
const tfrField = { field: "tfr", type: "quantitative" };
const labelField = { field: "label" };

const pointMark = (color) => ({
  type: "point",
  filled: true,
  color,
  stroke: PAPER_COLOR,
  strokeWidth: 2,
  size: 130,
});

const textMark = (align, baseline, dx, dy, color, fontSize = 13) => ({
  type: "text",
  align,
  baseline,
  dx,
  dy,
  color,
  font: "Times New Roman",
  fontSize,
  fontWeight: "bold",
});

const annotationPoint = (year, tfr, color) => ({
  data: { values: [{ year, tfr }] },
  mark: pointMark(color),
  encoding: {
    x: yearField,
    y: tfrField,
    tooltip: fullTfrTooltip,
  },
});

const annotationText = (value, mark) => ({
  data: { values: [value] },
  mark,
  encoding: {
    x: yearField,
    y: { field: "y", type: "quantitative" },
    text: labelField,
  },
});

function parseTfrCsv(csvText) {
  const rows = csvText.trim().split(/\r?\n/).slice(2);

  return rows
    .map((row) => {
      const [year, tfr] = row.replaceAll('"', "").split(",");
      return {
        year: Number(year),
        tfr: Number(tfr),
        replacement: REPLACEMENT_LEVEL,
      };
    })
    .filter((d) => d.year >= START_YEAR && d.year <= END_YEAR);
}

function buildHeroSpec(data) {
  const latest = data.find((d) => d.year === 2024);

  const baseX = {
    ...yearField,
    scale: { domain: [START_YEAR, END_YEAR] },
    axis: {
      values: YEAR_TICKS,
      title: "Year",
      format: "d",
      labelAngle: 0,
      labelColor: AXIS_COLOR,
      titleColor: AXIS_COLOR,
      tickColor: AXIS_RULE_COLOR,
      domainColor: AXIS_RULE_COLOR,
      labelFontSize: 16,
      titleFontSize: 15,
    },
  };

  const baseY = {
    ...tfrField,
    scale: yScale,
    axis: {
      title: "Total fertility rate",
      titlePadding: 17,
      values: Y_TICKS,
      format: ".1f",
      labelColor: AXIS_COLOR,
      titleColor: AXIS_COLOR,
      tickColor: AXIS_RULE_COLOR,
      domainColor: AXIS_RULE_COLOR,
      labelFontSize: 16,
      titleFontSize: 15,
    },
  };

  const yWithoutAxis = (field) => ({
    field,
    type: "quantitative",
    scale: yScale,
  });

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 400,
    background: null,
    data: { values: data },
    layer: [
      {
        data: { values: [{ start: 2004, end: 2014 }] },
        mark: {
          type: "rect",
          color: "#e8dcc9",
          opacity: 0.55,
        },
        encoding: {
          x: {
            field: "start",
            type: "quantitative",
            scale: { domain: [START_YEAR, END_YEAR] },
          },
          x2: { field: "end" },
          y: {
            datum: 1.0,
            type: "quantitative",
            scale: yScale,
          },
          y2: { datum: 3.7 },
        },
      },
      {
        transform: [{ calculate: "max(datum.tfr, datum.replacement)", as: "aboveTop" }],
        mark: {
          type: "area",
          color: "#cfe8cf",
          opacity: 0.75,
          interpolate: "monotone",
        },
        encoding: {
          x: baseX,
          y: {
            ...yWithoutAxis("aboveTop"),
            axis: baseY.axis,
          },
          y2: { field: "replacement" },
        },
      },
      {
        transform: [{ calculate: "min(datum.tfr, datum.replacement)", as: "belowBottom" }],
        mark: {
          type: "area",
          color: "#ead2cd",
          opacity: 0.75,
          interpolate: "monotone",
        },
        encoding: {
          x: baseX,
          y: yWithoutAxis("belowBottom"),
          y2: { datum: REPLACEMENT_LEVEL },
        },
      },
      {
        mark: {
          type: "rule",
          stroke: REPLACEMENT_COLOR,
          strokeDash: [6, 5],
          strokeWidth: 1.5,
        },
        encoding: {
          y: {
            datum: REPLACEMENT_LEVEL,
            type: "quantitative",
            scale: yScale,
          },
        },
      },
      {
        mark: {
          type: "line",
          color: BELOW_COLOR,
          strokeWidth: 4,
          interpolate: "monotone",
        },
        encoding: {
          x: baseX,
          y: baseY,
          tooltip: tfrTooltip,
        },
      },
      {
        transform: [{ calculate: "datum.tfr >= datum.replacement ? datum.tfr : null", as: "aboveLine" }],
        mark: {
          type: "line",
          color: ABOVE_COLOR,
          strokeWidth: 4,
          interpolate: "monotone",
        },
        encoding: {
          x: baseX,
          y: yWithoutAxis("aboveLine"),
          tooltip: tfrTooltip,
        },
      },
      {
        mark: {
          type: "point",
          filled: true,
          opacity: 0.001,
          size: 180,
        },
        encoding: {
          x: yearField,
          y: tfrField,
          tooltip: fullTfrTooltip,
        },
      },

      // Annotations
      annotationPoint(1961, 3.548, ABOVE_COLOR),
      annotationText(
        { year: 1961, y: 3.58, label: "Baby Boom peak" },
        textMark("left", "bottom", 8, 0, ABOVE_COLOR)
      ),
      annotationPoint(1960, 3.451, BELOW_COLOR),
      annotationText(
        { year: 1960, y: 3.32, label: "Birth control pill introduced" },
        textMark("right", "top", -14, -36, BELOW_COLOR)
      ),
      annotationPoint(1976, 2.06, BELOW_COLOR),
      annotationText(
        { year: 1976, y: 2.02, label: "First year below replacement" },
        textMark("left", "top", -130, 30, BELOW_COLOR)
      ),
      annotationPoint(2024, latest ? latest.tfr : 1.481, BELOW_COLOR),
      annotationText(
        { year: 2024, y: latest ? latest.tfr : 1.481, label: "Record low" },
        textMark("right", "top", 70, 0, BELOW_COLOR)
      ),
      annotationText(
        { year: 2009, y: 2.52, label: "Baby Bonus" },
        textMark("center", "bottom", 0, 130, REPLACEMENT_COLOR, 14)
      ),
      annotationText(
        { year: 1940, y: REPLACEMENT_LEVEL, label: "Recommended replacement level: 2.1" },
        textMark("center", "bottom", 0, 25, REPLACEMENT_COLOR)
      ),
    ],
    config: {
      view: { stroke: null },
      axis: {
        grid: false,
        labelFont: "Times New Roman",
        titleFont: "Times New Roman",
      },
    },
  };
}

async function renderHeroChart() {
  const response = await fetch(DATA_URL);
  const csvText = await response.text();
  const data = parseTfrCsv(csvText);

  vegaEmbed("#hero-chart", buildHeroSpec(data), {
    actions: false,
    renderer: "svg",
  });
}

renderHeroChart();
