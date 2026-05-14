# Fertility Rate World Map

Open with a local server from this folder:

```bash
python3 -m http.server 8088
```

Then visit `http://localhost:8088`.

## Data

- Fertility rate: World Bank indicator `SP.DYN.TFRT.IN`, latest non-null value per country from the API snapshot in `data/fertility.json`.
  Source: https://api.worldbank.org/v2/country/all/indicator/SP.DYN.TFRT.IN?format=json&per_page=20000
- Country boundaries: Natural Earth country polygons via the `geo-countries` dataset in `data/world.geojson`.
  Source: https://github.com/datasets/geo-countries
- Rendering: D3 v7, bundled locally in `vendor/d3.min.js`.
