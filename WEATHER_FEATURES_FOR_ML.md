# Weather Features for ML Model

This document describes all weather features available from the `/api/weather` endpoint for price prediction.

## API Response Structure

```json
{
  "location": {
    "latitude": 52.52,
    "longitude": 13.41
  },
  "current": {
    "temperature": 15.5,
    "humidity": 65,
    "weatherCode": 2,
    "weatherDescription": "Partly cloudy",
    "windSpeed": 12.5,
    "precipitation": 0,
    "time": "2025-11-15T12:00"
  },
  "condition": "clear"
}
```

## Available Weather Features

### 1. **temperature** (Numeric - Continuous)
- **Type:** `number` (float)
- **Unit:** Celsius (°C)
- **Range:** Typically -50°C to 50°C (varies by location)
- **Description:** Current air temperature at 2 meters above ground
- **Example:** `15.5`
- **ML Usage:** Can be used as a continuous feature or binned into categories (cold, moderate, hot)

---

### 2. **humidity** (Numeric - Continuous)
- **Type:** `number` (float)
- **Unit:** Percentage (%)
- **Range:** 0 to 100
- **Description:** Relative humidity at 2 meters above ground
- **Example:** `65`
- **ML Usage:** Continuous feature (0-100 scale)

---

### 3. **weatherCode** (Numeric - Categorical)
- **Type:** `number` (integer)
- **Unit:** WMO Weather Interpretation Code
- **Range:** 0-99
- **Description:** Standardized weather condition code
- **Possible Values:**
  - `0` - Clear sky
  - `1` - Mainly clear
  - `2` - Partly cloudy
  - `3` - Overcast
  - `45` - Foggy
  - `48` - Depositing rime fog
  - `51` - Light drizzle
  - `53` - Moderate drizzle
  - `55` - Dense drizzle
  - `56` - Light freezing drizzle
  - `57` - Dense freezing drizzle
  - `61` - Slight rain
  - `63` - Moderate rain
  - `65` - Heavy rain
  - `66` - Light freezing rain
  - `67` - Heavy freezing rain
  - `71` - Slight snow fall
  - `73` - Moderate snow fall
  - `75` - Heavy snow fall
  - `77` - Snow grains
  - `80` - Slight rain showers
  - `81` - Moderate rain showers
  - `82` - Violent rain showers
  - `85` - Slight snow showers
  - `86` - Heavy snow showers
  - `95` - Thunderstorm
  - `96` - Thunderstorm with slight hail
  - `99` - Thunderstorm with heavy hail
- **ML Usage:** Can be used as categorical feature or one-hot encoded

---

### 4. **weatherDescription** (String - Categorical)
- **Type:** `string`
- **Description:** Human-readable weather description
- **Example:** `"Partly cloudy"`
- **ML Usage:** Can be used for feature engineering or as categorical input (requires encoding)

---

### 5. **windSpeed** (Numeric - Continuous)
- **Type:** `number` (float)
- **Unit:** Kilometers per hour (km/h)
- **Range:** Typically 0 to 100+ km/h
- **Description:** Wind speed at 10 meters above ground
- **Example:** `12.5`
- **ML Usage:** Continuous feature, can be binned (calm, moderate, strong, very strong)

---

### 6. **precipitation** (Numeric - Continuous)
- **Type:** `number` (float)
- **Unit:** Millimeters (mm)
- **Range:** 0 to 100+ mm
- **Description:** Current precipitation amount
- **Example:** `0` or `2.5`
- **ML Usage:** Continuous feature, can be binned (none, light, moderate, heavy)

---

### 7. **time** (String - Temporal)
- **Type:** `string` (ISO 8601 format)
- **Format:** `"YYYY-MM-DDTHH:mm"`
- **Description:** Timestamp of the weather data
- **Example:** `"2025-11-15T12:00"`
- **ML Usage:** Can be parsed to extract:
  - Hour of day (0-23)
  - Day of week (0-6)
  - Month (1-12)
  - Is weekend (boolean)
  - Time of day category (morning, afternoon, evening, night)

---

### 8. **condition** (String - Categorical) ⭐ **Pre-processed for ML**
- **Type:** `string`
- **Possible Values:** 
  - `"clear"` - Clear or partly cloudy conditions
  - `"foggy"` - Foggy conditions
  - `"windy"` - High wind speeds (>15 km/h)
  - `"moderate"` - Moderate rain or snow
  - `"severe"` - Heavy rain, snow, or thunderstorms
- **Description:** Simplified weather condition category optimized for pricing impact
- **ML Usage:** Ready-to-use categorical feature (can be one-hot encoded)
- **Logic:**
  - `severe`: precipitation > 5mm OR weather codes [65, 67, 75, 77, 82, 85, 86, 95, 96, 99]
  - `moderate`: precipitation > 1mm OR weather codes [61, 63, 66, 71, 73, 80, 81]
  - `windy`: windSpeed > 15 km/h
  - `foggy`: weather codes [45, 48]
  - `clear`: default (all other conditions)

---

### 9. **location** (Numeric - Continuous)
- **Type:** `object` with `latitude` and `longitude`
- **Unit:** Degrees
- **Range:** 
  - Latitude: -90 to 90
  - Longitude: -180 to 180
- **Description:** Geographic coordinates of the weather location
- **ML Usage:** Can be used for:
  - Regional pricing differences
  - Distance calculations
  - Geographic clustering

---

## Recommended Feature Engineering for ML Model

### Direct Features (Use as-is):
1. `temperature` - Continuous
2. `humidity` - Continuous (0-100)
3. `windSpeed` - Continuous
4. `precipitation` - Continuous
5. `condition` - Categorical (5 categories)

### Derived Features (Can be created):
1. **Temperature Categories:**
   - `isCold` (temperature < 10°C)
   - `isModerate` (10°C ≤ temperature ≤ 25°C)
   - `isHot` (temperature > 25°C)

2. **Time-based Features:**
   - `hour` (0-23)
   - `dayOfWeek` (0-6)
   - `isWeekend` (boolean)
   - `timeOfDay` (morning/afternoon/evening/night)

3. **Weather Severity:**
   - `isSevereWeather` (condition === 'severe')
   - `isBadWeather` (condition in ['severe', 'moderate', 'foggy'])

4. **Combined Features:**
   - `weatherImpact` (numeric score based on condition)
   - `precipitationLevel` (none/light/moderate/heavy)

## Example Feature Vector for ML Model

```python
{
    'temperature': 15.5,
    'humidity': 65,
    'windSpeed': 12.5,
    'precipitation': 0,
    'condition_clear': 1,
    'condition_foggy': 0,
    'condition_windy': 0,
    'condition_moderate': 0,
    'condition_severe': 0,
    'hour': 12,
    'dayOfWeek': 5,  # Saturday
    'isWeekend': 1,
    'isBadWeather': 0
}
```

## API Endpoint

**GET** `/api/weather?latitude={lat}&longitude={lng}`

**POST** `/api/weather`
```json
{
  "latitude": 52.52,
  "longitude": 13.41
}
```

## Notes for ML Model Integration

1. **All features are numeric or categorical** - No text processing needed
2. **`condition` field is pre-processed** - Ready for one-hot encoding
3. **Missing values:** All fields are guaranteed to have values (precipitation defaults to 0)
4. **Units are standardized:** Temperature in °C, wind in km/h, precipitation in mm
5. **Real-time data:** Weather is fetched at request time, ensuring current conditions

