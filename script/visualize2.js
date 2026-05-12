const STATE_TFR_URL = "data/tfr_bystate.csv";
const DECREASE_COLOR = "#8B1A1A";
const INCREASE_COLOR = "#2D6B2D";
const NATIONAL_COLOR = "#1C1C1C";
const CREAM_BACKGROUND = "#F5F0E8";
const MAX_DROP_COLOR = "#8B1A1A"; // ACT — biggest % decline (−26.8%)
const MIN_DROP_COLOR = "#1a5976"; // VIC — smallest % decline (−11.3%)
const MUTED_LINE_COLOR = "#C4B9AC";
const MUTED_LABEL_COLOR = "#9C9690";
const SLOPE_FONT = "Times New Roman";
const AVG_2014 = 1.795;
const AVG_2024 = 1.481;

const STATE_LABEL_OFFSETS = {
  NSW:    { leftDx: -10, leftDy:  0,  rightDx: 10, rightDy:  6  },
  VIC:    { leftDx: -10, leftDy:  8,  rightDx: 10, rightDy: -4  },
  QLD:    { leftDx: -10, leftDy: -8,  rightDx: 10, rightDy:  2  },
  SA:     { leftDx: -10, leftDy:  0,  rightDx: 10, rightDy: 18  },
  WA:     { leftDx: -10, leftDy:  5,  rightDx: 10, rightDy: 10  },
  TAS:    { leftDx: -10, leftDy:  0,  rightDx: 10, rightDy: -5  },
  NT:     { leftDx: -10, leftDy:  0,  rightDx: 10, rightDy:  0  },
  ACT:    { leftDx: -10, leftDy: -9,  rightDx: 10, rightDy:  0  },
  "Aust.": { leftDx: -10, leftDy: 0,  rightDx: 10, rightDy: 10  },
};

const slopeTooltip = [
  { field: "state", type: "nominal", title: "State" },
  { field: "year", type: "ordinal", title: "Year" },
  { field: "tfr", type: "quantitative", title: "TFR", format: ".3f" },
];

function parseStateTfrCsv(csvText) {
  return csvText
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((row) => {
      const [state, year, tfr] = row.split(",");
      return {
        state,
        year: Number(year),
        tfr: Number(tfr),
      };
    });
}

function prepareSlopeData(rows) {
  const byState = {};

  rows.forEach((row) => {
    if (!byState[row.state]) {
      byState[row.state] = {};
    }
    byState[row.state][row.year] = row.tfr;
  });

  const meta = Object.keys(byState).map((state) => {
    const tfr2014 = byState[state][2014];
    const tfr2024 = byState[state][2024];
    const delta = tfr2024 - tfr2014;

    return {
      state,
      tfr2014,
      tfr2024,
      delta,
      direction: delta >= 0 ? "increased" : "decreased",
      isNational: state === "Aust.",
      deltaLabel: `${delta >= 0 ? "+" : "-"}${Math.abs(delta).toFixed(2)}`,
      midTfr: (tfr2014 + tfr2024) / 2,
    };
  });

  const enrichedRows = rows.map((row) => {
    const stateMeta = meta.find((item) => item.state === row.state);
    return {
      ...row,
      direction: stateMeta.direction,
      isNational: stateMeta.isNational,
    };
  });

  return { rows: enrichedRows, meta };
}

function buildSlopeSpec(rows, meta) {
  // State labels stay visible; numeric values are available on hover.
  const labelColor = (state, isNational) =>
    state === "ACT" ? MAX_DROP_COLOR
    : state === "VIC" ? MIN_DROP_COLOR
    : isNational      ? NATIONAL_COLOR
    : MUTED_LABEL_COLOR;

  const leftLabels = meta.map((d) => ({
    state: d.state,
    year: 2014,
    tfr: d.tfr2014,
    label: d.state,
    dx: STATE_LABEL_OFFSETS[d.state].leftDx,
    dy: STATE_LABEL_OFFSETS[d.state].leftDy,
    align: "right",
    color: labelColor(d.state, d.isNational),
  }));

  const rightLabels = meta.map((d) => ({
    state: d.state,
    year: 2024,
    tfr: d.tfr2024,
    label: d.state,
    dx: STATE_LABEL_OFFSETS[d.state].rightDx,
    dy: STATE_LABEL_OFFSETS[d.state].rightDy,
    align: "left",
    color: labelColor(d.state, d.isNational),
  }));

  const stateLabelLayer = (labelData) => ({
    data: { values: [labelData] },
    mark: {
      type: "text",
      align: labelData.align,
      baseline: "middle",
      dx: labelData.dx,
      dy: labelData.dy,
      font: SLOPE_FONT,
      fontSize: 12,
      fontWeight: labelData.state === "ACT" || labelData.state === "VIC" ? "bold" : "normal",
      color: labelData.color,
    },
    encoding: {
      x: { field: "year", type: "ordinal", scale: { domain: [2014, 2024] } },
      y: { field: "tfr", type: "quantitative" },
      text: { field: "label" },
    },
  });

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: {
      text: "Every state has fewer children than a decade ago",
      subtitle: "Total fertility rate by state, 2014 vs 2024",
      anchor: "start",
      font: SLOPE_FONT,
      subtitleFont: SLOPE_FONT,
      fontSize: 22,
      subtitleFontSize: 15,
      color: "#1C1C1C",
      subtitleColor: "#6f6255",
      offset: 14,
    },
    width: "container",
    height: 760,
    background: CREAM_BACKGROUND,
    layer: [
      // National average reference lines.
      {
        data: { values: [{ y: AVG_2014, label: "2014 national avg 1.795" }] },
        mark: {
          type: "rule",
          stroke: "#6f6255",
          strokeDash: [5, 5],
          strokeWidth: 1
        },
        encoding: {
          y: { field: "y", type: "quantitative" },
        },
      },
      {
        data: { values: [{ y: AVG_2024, label: "2024 national avg 1.481" }] },
        mark: {
          type: "rule",
          stroke: "#6f6255",
          strokeDash: [5, 5],
          strokeWidth: 1,
        },
        encoding: {
          y: { field: "y", type: "quantitative" },
        },
      },
      {
        data: { values: [{ year: 2024, y: AVG_2014, label: "2014 national avg 1.795" }] },
        mark: {
          type: "text",
          align: "left",
          baseline: "bottom",
          dx: 56,
          dy: -2,
          font: SLOPE_FONT,
          fontSize: 12,
          color: "#6f6255",
        },
        encoding: {
          x: { field: "year", type: "ordinal" },
          y: { field: "y", type: "quantitative" },
          text: { field: "label" },
        },
      },
      {
        data: { values: [{ year: 2024, y: AVG_2024, label: "2024 national avg 1.481" }] },
        mark: {
          type: "text",
          align: "left",
          baseline: "top",
          dx: 56,
          dy: 2,
          font: SLOPE_FONT,
          fontSize: 12,
          color: "#6f6255",
        },
        encoding: {
          x: { field: "year", type: "ordinal" },
          y: { field: "y", type: "quantitative" },
          text: { field: "label" },
        },
      },
      // Muted background lines (all states except ACT and VIC).
      {
        data: { values: rows },
        transform: [{ filter: "!datum.isNational && datum.state !== 'ACT' && datum.state !== 'VIC'" }],
        mark: { type: "line", color: MUTED_LINE_COLOR, strokeWidth: 1.5 },
        encoding: {
          x: {
            field: "year",
            type: "ordinal",
            scale: { domain: [2014, 2024] },
            axis: {
              title: null,
              labelAngle: 0,
              labelFont: SLOPE_FONT,
              labelFontSize: 16,
              labelColor: "#1C1C1C",
              domain: false,
              ticks: false,
            },
          },
          y: {
            field: "tfr",
            type: "quantitative",
            scale: { domain: [1.25, 2.05], zero: false },
            axis: {
              title: "Total fertility rate",
              titleFont: SLOPE_FONT,
              labelFont: SLOPE_FONT,
              labelFontSize: 12,
              labelColor: "#6f6255",
              titleColor: "#6f6255",
              grid: false,
            },
          },
          detail: { field: "state" },
          tooltip: slopeTooltip,
        },
      },
      // VIC highlight — smallest % decline (−11.3%).
      {
        data: { values: rows },
        transform: [{ filter: "datum.state === 'VIC'" }],
        mark: { type: "line", stroke: MIN_DROP_COLOR, strokeWidth: 2.5 },
        encoding: {
          x: { field: "year", type: "ordinal", scale: { domain: [2014, 2024] } },
          y: { field: "tfr", type: "quantitative" },
          tooltip: slopeTooltip,
        },
      },
      // ACT highlight — biggest % decline (−26.8%).
      {
        data: { values: rows },
        transform: [{ filter: "datum.state === 'ACT'" }],
        mark: { type: "line", stroke: MAX_DROP_COLOR, strokeWidth: 2.5 },
        encoding: {
          x: { field: "year", type: "ordinal", scale: { domain: [2014, 2024] } },
          y: { field: "tfr", type: "quantitative" },
          tooltip: slopeTooltip,
        },
      },
      // National average line.
      {
        data: { values: rows },
        transform: [{ filter: "datum.isNational" }],
        mark: {
          type: "line",
          stroke: NATIONAL_COLOR,
          strokeWidth: 4,
          strokeDash: [8, 5],
        },
        encoding: {
          x: { field: "year", type: "ordinal", scale: { domain: [2014, 2024] } },
          y: { field: "tfr", type: "quantitative" },
          detail: { field: "state" },
          tooltip: slopeTooltip,
        },
      },
      // Hoverable dots; exact TFR values appear in tooltip.
      {
        data: { values: rows },
        mark: {
          type: "point",
          filled: true,
          size: 65,
          stroke: CREAM_BACKGROUND,
          strokeWidth: 1.5,
        },
        encoding: {
          x: { field: "year", type: "ordinal", scale: { domain: [2014, 2024] } },
          y: { field: "tfr", type: "quantitative" },
          color: {
            condition: [
              { test: "datum.isNational",      value: NATIONAL_COLOR   },
              { test: "datum.state === 'ACT'", value: MAX_DROP_COLOR   },
              { test: "datum.state === 'VIC'", value: MIN_DROP_COLOR   },
            ],
            value: MUTED_LINE_COLOR,
          },
          tooltip: slopeTooltip,
        },
      },
      // State labels on both sides. Edit STATE_LABEL_OFFSETS to move each one.
      ...leftLabels.map(stateLabelLayer),
      ...rightLabels.map(stateLabelLayer),
    ],
    config: {
      view: { stroke: null },
      axis: { labelFont: SLOPE_FONT, titleFont: SLOPE_FONT },
    },
  };
}

async function renderStateSlopeChart() {
  const response = await fetch(STATE_TFR_URL);
  const csvText = await response.text();
  const parsed = parseStateTfrCsv(csvText);
  const { rows, meta } = prepareSlopeData(parsed);

  vegaEmbed("#state-slope-chart", buildSlopeSpec(rows, meta), {
    actions: false,
    renderer: "svg",
  });
}

renderStateSlopeChart();
