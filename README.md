# Weather Watch

Weather Watch is a lightweight weather forecasting app that pulls public forecast data and highlights high-intensity conditions that may need attention.

## Live App

Open the public app here:

```text
https://xxqcarlospxx.github.io/weather-watch/
```

## Features

- Search forecasts by city or town.
- Use browser geolocation for the current location.
- Display current temperature, wind, rain chance, humidity, and intensity.
- Show a 7-day forecast with daily weather, temperature range, rain, and wind.
- Flag high-intensity days based on severe weather codes, strong wind, heavy precipitation, extreme heat, and freezing temperatures.
- Fall back to a second public geocoder if the primary location lookup is temporarily unavailable.

## Public APIs

This app uses:

- [Open-Meteo Forecast API](https://open-meteo.com/) for weather forecast data.
- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) for primary location search.
- [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) as a backup geocoding provider.

No API key is required.

## Run Locally

Open the project folder and start a simple static server:

```powershell
python -m http.server 5173
```

Then open:

```text
http://localhost:5173/
```

You can also open `index.html` directly in a browser, but using a local server gives the most reliable behavior for browser APIs.

## Project Structure

```text
.
|-- app.js
|-- index.html
|-- styles.css
`-- README.md
```

## High-Intensity Alert Rules

A forecast day is marked high intensity when one or more of these signals is present:

- Severe weather code from the forecast API.
- Wind speed of at least 50 km/h.
- Precipitation of at least 25 mm.
- Maximum temperature of at least 35 deg C.
- Minimum temperature of -5 deg C or below.

## Notes

Weather data is provided by public services and may vary by availability, location precision, and network conditions.
