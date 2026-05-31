const WORLD_GEO_URL = "data/part5/world.geojson";
const WORLD_FERTILITY_URL = "data/part5/fertility.json";
const WORLD_FONT = "Times New Roman";
const WORLD_BACKGROUND = "#FFFFFF";
const WORLD_OCEAN = "#edf5f0";
const WORLD_GRATICULE = "#cfded6";
const WORLD_NO_DATA = "#d8d2ca";
const WORLD_LOW = "#8B1A1A";
const WORLD_MID = "#f0dfc2";
const WORLD_HIGH = "#2f7d32";
const AUSTRALIA_COLOR = "#1c1c1c";
const EUROPE_LENS_COUNTRY_FILTER =
  "indexof(['Albania','Austria','Belarus','Belgium','Bosnia and Herzegovina','Bulgaria','Croatia','Cyprus','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Ireland','Italy','Kosovo','Latvia','Lithuania','Luxembourg','North Macedonia','Malta','Moldova','Montenegro','Netherlands','Norway','Poland','Portugal','Romania','Russia','Republic of Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','Ukraine','United Kingdom'], datum.properties.name) >= 0";
const SEA_LENS_COUNTRY_FILTER =
  "indexof(['Brunei','Cambodia','East Timor','Indonesia','Laos','Malaysia','Myanmar','Philippines','Singapore','Thailand','Vietnam'], datum.properties.name) >= 0";
const NZ_LENS_COUNTRY_FILTER = "datum.iso3 === 'NZL'";

const worldTooltip = [
  { field: "country_name", type: "nominal", title: "Country" },
  { field: "fertility_display", type: "nominal", title: "Fertility rate" },
  { field: "year_display", type: "nominal", title: "Year" },
];

const countryData = {
  url: WORLD_GEO_URL,
  format: { type: "json", property: "features" },
};

const worldTransforms = [
  {
    calculate: "datum.properties['ISO3166-1-Alpha-3']",
    as: "iso3",
  },
  {
    lookup: "iso3",
    from: {
      data: {
        url: WORLD_FERTILITY_URL,
        format: { type: "json", property: "countries" },
      },
      key: "iso3",
      fields: ["fertility", "year", "name"],
    },
  },
  {
    calculate: "isValid(datum.name) ? datum.name : datum.properties.name",
    as: "country_name",
  },
  {
    calculate: "isValid(datum.fertility) ? format(datum.fertility, '.2f') : 'No data'",
    as: "fertility_display",
  },
  {
    calculate: "isValid(datum.year) ? format(datum.year, 'd') : 'No data'",
    as: "year_display",
  },
];

function fertilityColorEncoding(showLegend) {
  return {
    condition: { test: "!isValid(datum.fertility)", value: WORLD_NO_DATA },
    field: "fertility",
    type: "quantitative",
    scale: {
      domain: [0.8, 2.1, 5.5],
      range: [WORLD_LOW, WORLD_MID, WORLD_HIGH],
    },
    legend: showLegend
      ? {
          title: "Births per woman",
          orient: "bottom-right",
          titleFont: WORLD_FONT,
          labelFont: WORLD_FONT,
          titleFontSize: 13,
          labelFontSize: 12,
          titlePadding: 14,
          titleAlign: "right",
          titleAnchor: "end",
          gradientLength: 160,
          gradientThickness: 14,
        }
      : null,
  };
}

function countryLayer(showLegend, strokeWidth = 0.45, extraTransforms = [], enableTooltip = true) {
  return {
    data: countryData,
    transform: [...worldTransforms, ...extraTransforms],
    mark: {
      type: "geoshape",
      stroke: "#ffffff",
      strokeWidth,
    },
    encoding: {
      color: fertilityColorEncoding(showLegend),
      tooltip: enableTooltip ? worldTooltip : null,
    },
  };
}

function australiaOutlineLayer() {
  return {
    data: countryData,
    transform: [...worldTransforms, { filter: "datum.iso3 === 'AUS'" }],
    mark: {
      type: "geoshape",
      fill: null,
      stroke: AUSTRALIA_COLOR,
      strokeWidth: 2.2,
    },
  };
}

function australiaPointLayer() {
  return {
    data: { values: [{ lon: 133.8, lat: -25.3 }] },
    mark: {
      type: "circle",
      size: 70,
      color: AUSTRALIA_COLOR,
      stroke: "#ffffff",
      strokeWidth: 1.4,
    },
    encoding: {
      longitude: { field: "lon", type: "quantitative" },
      latitude: { field: "lat", type: "quantitative" },
    },
  };
}

function australiaLabelLayer() {
  return {
    data: { values: [{ lon: 133.8, lat: -25.3, label: "Australia" }] },
    mark: {
      type: "text",
      align: "center",
      baseline: "bottom",
      dx: 4,
      dy: -7,
      font: WORLD_FONT,
      fontSize: 14,
      fontWeight: "bold",
      color: AUSTRALIA_COLOR,
    },
    encoding: {
      longitude: { field: "lon", type: "quantitative" },
      latitude: { field: "lat", type: "quantitative" },
      text: { field: "label" },
    },
  };
}

function buildWorldFertilitySpec(chartWidth = 980) {
  const compactViewport = window.matchMedia("(max-width: 1919px)").matches;
  const mapScale = compactViewport
    ? Math.min(178, Math.max(154, chartWidth * 0.132))
    : Math.min(205, Math.max(170, chartWidth * 0.15));
  const chartHeight = compactViewport ? 530 : 670;
  const projectionY = compactViewport ? 249 : 305;

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: chartWidth,
    height: chartHeight,
    background: WORLD_BACKGROUND,
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
    projection: {
      type: "naturalEarth1",
      scale: mapScale,
      translate: [chartWidth / 2, projectionY],
    },
    layer: [
      {
        data: { sphere: true },
        mark: {
          type: "geoshape",
          fill: WORLD_OCEAN,
          stroke: "#8ba69a",
          strokeWidth: 1.2,
        },
      },
      {
        data: { graticule: { step: [20, 20] } },
        mark: {
          type: "geoshape",
          fill: null,
          stroke: WORLD_GRATICULE,
          strokeWidth: 0.55,
          opacity: 0.75,
        },
      },
      countryLayer(true),
      australiaOutlineLayer(),
      australiaLabelLayer(),
      australiaPointLayer(),
    ],
    config: {
      view: { stroke: null },
      font: WORLD_FONT,
    },
  };
}

function buildEuropeLensSpec() {
  const size = 160;

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: size,
    height: size,
    background: WORLD_BACKGROUND,
    padding: 0,
    projection: {
      type: "mercator",
      center: [17, 49],
      scale: 166,
      translate: [size / 2, size / 2],
    },
    layer: [
      {
        data: { sphere: true },
        mark: {
          type: "geoshape",
          fill: WORLD_OCEAN,
          stroke: null,
        },
      },
      countryLayer(false, 0.45, [{ filter: EUROPE_LENS_COUNTRY_FILTER }], true),
    ],
    config: {
      view: { stroke: null },
      font: WORLD_FONT,
    },
  };
}

function buildSeaLensSpec() {
  const size = 160;

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: size,
    height: size,
    background: WORLD_BACKGROUND,
    padding: 0,
    projection: {
      type: "mercator",
      center: [111, -2],
      scale: 218,
      translate: [size / 2 - 2, size / 2 + 32],
    },
    layer: [
      {
        data: { sphere: true },
        mark: {
          type: "geoshape",
          fill: WORLD_OCEAN,
          stroke: null,
        },
      },
      countryLayer(false, 0.45, [{ filter: SEA_LENS_COUNTRY_FILTER }], true),
      {
        // Singapore and Brunei are too small to see at this zoom, so mark them with
        // dots coloured by their fertility rate (same scale as the choropleth).
        data: {
          values: [
            { lon: 103.82, lat: 1.35, country_name: "Singapore", fertility: 0.97, fertility_display: "0.97", year_display: "2024" },
            { lon: 114.72, lat: 4.5, country_name: "Brunei", fertility: 1.73, fertility_display: "1.73", year_display: "2024" },
          ],
        },
        mark: {
          type: "circle",
          size: 95,
          stroke: "#ffffff",
          strokeWidth: 1.2,
        },
        encoding: {
          longitude: { field: "lon", type: "quantitative" },
          latitude: { field: "lat", type: "quantitative" },
          color: {
            field: "fertility",
            type: "quantitative",
            scale: { domain: [0.8, 2.1, 5.5], range: [WORLD_LOW, WORLD_MID, WORLD_HIGH] },
            legend: null,
          },
          tooltip: worldTooltip,
        },
      },
    ],
    config: {
      view: { stroke: null },
      font: WORLD_FONT,
    },
  };
}

function buildNzLensSpec() {
  const size = 160;

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: size,
    height: size,
    background: WORLD_BACKGROUND,
    padding: 0,
    projection: {
      type: "mercator",
      center: [173.1, -41.3],
      scale: 515,
      translate: [size / 2 + 20, size / 2 + 4],
    },
    layer: [
      {
        data: { sphere: true },
        mark: {
          type: "geoshape",
          fill: WORLD_OCEAN,
          stroke: null,
        },
      },
      countryLayer(false, 0.55, [{ filter: NZ_LENS_COUNTRY_FILTER }], true),
    ],
    config: {
      view: { stroke: null },
      font: WORLD_FONT,
    },
  };
}

const worldGlobeEl = document.querySelector("#world-fertility-globe");
let worldGlobeView = null;
let worldGlobeRenderTimer = null;
let lastWorldGlobeWidth = 0;

async function renderWorldGlobe() {
  if (!worldGlobeEl) return;
  const width = Math.max(900, Math.floor(worldGlobeEl.clientWidth || worldGlobeEl.getBoundingClientRect().width || 980));
  const compactViewport = window.matchMedia("(max-width: 1919px)").matches;
  const renderKey = `${width}:${compactViewport ? "compact" : "large"}`;
  if (renderKey === lastWorldGlobeWidth && worldGlobeView) return;
  lastWorldGlobeWidth = renderKey;
  if (worldGlobeView) {
    await worldGlobeView.finalize();
    worldGlobeView = null;
  }
  const result = await vegaEmbed("#world-fertility-globe", buildWorldFertilitySpec(width), {
    actions: false,
    renderer: "svg",
    tooltip: { theme: "light" },
  });
  worldGlobeView = result.view;
}

function scheduleWorldGlobeRender() {
  window.clearTimeout(worldGlobeRenderTimer);
  worldGlobeRenderTimer = window.setTimeout(renderWorldGlobe, 80);
}

window.requestAnimationFrame(scheduleWorldGlobeRender);
if (window.ResizeObserver && worldGlobeEl) {
  new ResizeObserver(scheduleWorldGlobeRender).observe(worldGlobeEl);
} else {
  window.addEventListener("resize", scheduleWorldGlobeRender);
}

vegaEmbed("#world-lens-europe", buildEuropeLensSpec(), {
  actions: false,
  renderer: "svg",
  tooltip: { theme: "light" },
});

vegaEmbed("#world-lens-sea", buildSeaLensSpec(), {
  actions: false,
  renderer: "svg",
  tooltip: { theme: "light" },
});

vegaEmbed("#world-lens-nz", buildNzLensSpec(), {
  actions: false,
  renderer: "svg",
  tooltip: { theme: "light" },
});
