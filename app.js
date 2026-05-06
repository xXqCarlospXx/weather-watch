const form = document.querySelector("#search-form");
const locationInput = document.querySelector("#location-input");
const locationPanel = document.querySelector("#location-panel");
const currentLocationButton = document.querySelector("#current-location");
const themeToggle = document.querySelector("#theme-toggle");
const statusMessage = document.querySelector("#status-message");
const alertPanel = document.querySelector("#alert-panel");
const dailyList = document.querySelector("#daily-list");

const placeLabel = document.querySelector("#place-label");
const currentTemp = document.querySelector("#current-temp");
const currentSummary = document.querySelector("#current-summary");
const currentIcon = document.querySelector("#current-icon");
const windValue = document.querySelector("#wind-value");
const rainValue = document.querySelector("#rain-value");
const humidityValue = document.querySelector("#humidity-value");
const intensityValue = document.querySelector("#intensity-value");

const weatherCodes = {
  0: ["Clear", "Sun"],
  1: ["Mostly clear", "Sun"],
  2: ["Partly cloudy", "Mix"],
  3: ["Overcast", "Cloud"],
  45: ["Fog", "Fog"],
  48: ["Rime fog", "Fog"],
  51: ["Light drizzle", "Rain"],
  53: ["Drizzle", "Rain"],
  55: ["Heavy drizzle", "Rain"],
  56: ["Freezing drizzle", "Ice"],
  57: ["Freezing drizzle", "Ice"],
  61: ["Light rain", "Rain"],
  63: ["Rain", "Rain"],
  65: ["Heavy rain", "Rain"],
  66: ["Freezing rain", "Ice"],
  67: ["Freezing rain", "Ice"],
  71: ["Light snow", "Snow"],
  73: ["Snow", "Snow"],
  75: ["Heavy snow", "Snow"],
  77: ["Snow grains", "Snow"],
  80: ["Rain showers", "Rain"],
  81: ["Rain showers", "Rain"],
  82: ["Violent showers", "Storm"],
  85: ["Snow showers", "Snow"],
  86: ["Heavy snow showers", "Snow"],
  95: ["Thunderstorm", "Storm"],
  96: ["Thunderstorm with hail", "Storm"],
  99: ["Severe thunderstorm", "Storm"]
};

const iconText = {
  Sun: "SUN",
  Mix: "MIX",
  Cloud: "CLD",
  Fog: "FOG",
  Rain: "RAIN",
  Ice: "ICE",
  Snow: "SNOW",
  Storm: "STORM"
};

const highIntensityCodes = new Set([55, 57, 65, 67, 75, 82, 86, 95, 96, 99]);
const popularLocations = [
  { name: "Hong Kong", latitude: 22.2783, longitude: 114.1747, timezone: "Asia/Hong_Kong" },
  { name: "Tokyo, Japan", latitude: 35.6895, longitude: 139.6917, timezone: "Asia/Tokyo" },
  { name: "Singapore", latitude: 1.2897, longitude: 103.8501, timezone: "Asia/Singapore" },
  { name: "London, England, United Kingdom", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London" },
  { name: "New York, New York, United States", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" }
];
let suggestionTimer;

function formatTemp(value) {
  return `${value}\u00b0C`;
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  localStorage.setItem("weather-watch-theme", theme);
}

function formatDate(dateString, options) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(`${dateString}T12:00:00`));
}

function describeWeather(code) {
  return weatherCodes[code] || ["Variable conditions", "Mix"];
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function classifyIntensity(day) {
  const reasons = [];

  if (highIntensityCodes.has(day.code)) {
    reasons.push("severe weather");
  }

  if (day.wind >= 50) {
    reasons.push("strong wind");
  }

  if (day.rain >= 25) {
    reasons.push("heavy precipitation");
  }

  if (day.maxTemp >= 35) {
    reasons.push("extreme heat");
  }

  if (day.minTemp <= -5) {
    reasons.push("hard freeze");
  }

  return {
    level: reasons.length ? "High" : "Normal",
    reasons
  };
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

async function geocodeLocation(query) {
  const locations = await searchLocations(query);

  if (locations.length) {
    return locations[0];
  }

  return geocodeWithNominatim(query);
}

async function searchLocations(query) {
  const params = new URLSearchParams({
    name: query,
    count: "8",
    language: "en",
    format: "json"
  });

  try {
    const data = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`);

    if (data.results?.length) {
      return data.results.map((result) => ({
        name: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone || "auto"
      }));
    }
  } catch {
    return [];
  }

  return [];
}

async function geocodeWithNominatim(query) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1"
  });

  const data = await fetchJson(`https://nominatim.openstreetmap.org/search?${params}`);

  if (!data.length) {
    throw new Error("No matching location found.");
  }

  const [result] = data;
  return {
    name: result.display_name.split(",").slice(0, 3).join(","),
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    timezone: "auto"
  };
}

async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    count: "1",
    language: "en",
    format: "json"
  });

  try {
    const data = await fetchJson(`https://geocoding-api.open-meteo.com/v1/reverse?${params}`);
    const result = data.results?.[0];

    if (result) {
      return [result.name, result.admin1, result.country].filter(Boolean).join(", ");
    }
  } catch {
    return "Current location";
  }

  return "Current location";
}

async function getForecast({ latitude, longitude, timezone }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: timezone || "auto",
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
    forecast_days: "7",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm"
  });

  return fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
}

function normalizeDailyForecast(data) {
  return data.daily.time.map((date, index) => ({
    date,
    code: data.daily.weather_code[index],
    maxTemp: Math.round(data.daily.temperature_2m_max[index]),
    minTemp: Math.round(data.daily.temperature_2m_min[index]),
    rain: Number(data.daily.precipitation_sum[index] || 0),
    rainChance: data.daily.precipitation_probability_max[index] ?? 0,
    wind: Math.round(data.daily.wind_speed_10m_max[index] || 0)
  }));
}

function renderAlert(days) {
  const highDays = days
    .map((day) => ({ ...day, intensity: classifyIntensity(day) }))
    .filter((day) => day.intensity.level === "High");

  if (!highDays.length) {
    alertPanel.classList.add("is-hidden");
    alertPanel.innerHTML = "";
    return;
  }

  const first = highDays[0];
  const dayLabel = formatDate(first.date, { weekday: "long", month: "short", day: "numeric" });
  const reasons = [...new Set(highDays.flatMap((day) => day.intensity.reasons))].join(", ");

  alertPanel.classList.remove("is-hidden");
  alertPanel.innerHTML = `
    <h2>High intensity weather alert</h2>
    <p>${highDays.length} day${highDays.length > 1 ? "s" : ""} need attention, starting ${dayLabel}. Main signals: ${reasons}.</p>
  `;
}

function renderCurrent(place, data, days) {
  const current = data.current;
  const [summary, icon] = describeWeather(current.weather_code);
  const todayIntensity = classifyIntensity(days[0]);

  placeLabel.textContent = place;
  currentTemp.innerHTML = `${Math.round(current.temperature_2m)}<span class="temp-unit">&deg;C</span>`;
  currentSummary.textContent = `${summary}. Today's range is ${formatTemp(days[0].minTemp)} to ${formatTemp(days[0].maxTemp)} with ${days[0].rainChance}% rain chance.`;
  currentIcon.textContent = iconText[icon] || "SKY";
  windValue.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  rainValue.textContent = `${days[0].rainChance}%`;
  humidityValue.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  intensityValue.textContent = todayIntensity.level;
  intensityValue.style.color = todayIntensity.level === "High" ? "var(--danger)" : "var(--accent-dark)";
}

function hideLocationPanel() {
  locationPanel.classList.add("is-hidden");
  locationInput.setAttribute("aria-expanded", "false");
}

function renderLocationPanel(locations, message = "") {
  locationInput.setAttribute("aria-expanded", "true");
  locationPanel.classList.remove("is-hidden");

  if (!locations.length) {
    locationPanel.innerHTML = `<p class="location-empty">${message || "No matching locations found."}</p>`;
    return;
  }

  locationPanel.innerHTML = "";

  locations.forEach((location, index) => {
    const [primary, ...details] = location.name.split(",");
    const button = document.createElement("button");
    const title = document.createElement("strong");
    const subtitle = document.createElement("span");

    button.className = "location-option";
    button.type = "button";
    button.role = "option";
    button.dataset.locationIndex = String(index);
    title.textContent = primary.trim();
    subtitle.textContent = details.join(",").trim() || "Forecast location";
    button.append(title, subtitle);
    button.addEventListener("click", async () => {
      const location = locations[Number(button.dataset.locationIndex)];
      locationInput.value = location.name;
      hideLocationPanel();
      await loadForecastForLocation(location);
    });
    locationPanel.append(button);
  });
}

async function updateLocationSuggestions() {
  const query = locationInput.value.trim();

  if (query.length < 2) {
    renderLocationPanel(popularLocations);
    return;
  }

  renderLocationPanel([], "Searching locations...");
  const locations = await searchLocations(query);
  renderLocationPanel(locations, "No matching locations found.");
}

function renderDaily(days) {
  dailyList.innerHTML = days.map((day) => {
    const [summary, icon] = describeWeather(day.code);
    const intensity = classifyIntensity(day);

    return `
      <article class="day-card ${intensity.level === "High" ? "high" : ""}">
        <p class="day-name">${formatDate(day.date, { weekday: "short", month: "short", day: "numeric" })}</p>
        <div class="day-icon" aria-hidden="true">${iconText[icon] || "SKY"}</div>
        <div class="day-temp">
          <strong>${formatTemp(day.maxTemp)}</strong>
          <span>${formatTemp(day.minTemp)}</span>
        </div>
        <div class="day-meta">
          <span>${summary}</span>
          <span>${day.rainChance}% rain / ${day.rain.toFixed(1)} mm</span>
          <span>${day.wind} km/h wind</span>
        </div>
        ${intensity.level === "High" ? `<span class="badge">High intensity</span>` : ""}
      </article>
    `;
  }).join("");
}

async function loadForecastForLocation(location) {
  setStatus("Fetching forecast data...");
  dailyList.innerHTML = `<div class="empty-state">Loading forecast...</div>`;

  try {
    const forecast = await getForecast(location);
    const days = normalizeDailyForecast(forecast);

    renderCurrent(location.name, forecast, days);
    renderDaily(days);
    renderAlert(days);
    setStatus(`Updated from Open-Meteo at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`);
  } catch (error) {
    dailyList.innerHTML = `<div class="empty-state">Forecast data could not be loaded.</div>`;
    alertPanel.classList.add("is-hidden");
    setStatus(error.message || "Forecast request failed.", true);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = locationInput.value.trim();

  if (!query) {
    return;
  }

  setStatus("Finding location...");

  try {
    const location = await geocodeLocation(query);
    hideLocationPanel();
    await loadForecastForLocation(location);
  } catch (error) {
    setStatus(error.message || "Location search failed.", true);
  }
});

locationInput.addEventListener("focus", () => {
  updateLocationSuggestions();
});

locationInput.addEventListener("input", () => {
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(updateLocationSuggestions, 220);
});

document.addEventListener("click", (event) => {
  if (!form.contains(event.target)) {
    hideLocationPanel();
  }
});

currentLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not available in this browser.", true);
    return;
  }

  setStatus("Waiting for browser location permission...");

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const name = await reverseGeocode(coords.latitude, coords.longitude);
      await loadForecastForLocation({
        name,
        latitude: coords.latitude,
        longitude: coords.longitude,
        timezone: "auto"
      });
    },
    () => setStatus("Location permission was denied or unavailable.", true),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
});

themeToggle.addEventListener("click", () => {
  applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
});

applyTheme(localStorage.getItem("weather-watch-theme") || "light");

geocodeLocation(locationInput.value)
  .then(loadForecastForLocation)
  .catch((error) => setStatus(error.message || "Initial forecast failed.", true));
