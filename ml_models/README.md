# ML Price Prediction Models

This directory contains the trained machine learning models for price prediction.

## Files

- `model.pkl` - Trained scikit-learn model for price prediction
- `encoders.pkl` - Label encoders for categorical features (car_type, weather_condition)
- `predict.py` - Python script to load models and make predictions

## Model Features

The model expects the following features in order:
1. `distance_km` - Trip distance in kilometers (float)
2. `hour` - Current hour of day (0-24, int) - JavaScript returns 0-23, 24 is same as 0 (midnight)
3. `day_of_week` - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday, int)
4. `demand` - Number of active bookings (0-200, int, capped at 200)
5. `available_taxis` - Number of available taxis (integer, non-negative)
6. `weather_encoded` - Weather condition encoded ('Clear', 'Cloudy', 'Rainy', 'Snowy', 'Windy', 'Fog', 'Stormy' - encoded by encoders.pkl)
7. `brand_loyalty_score` - User's brand loyalty score (0-10, float, default 5.0)
8. `car_type_encoded` - Car type encoded (mini, sedan, suv - encoded by encoders.pkl)

## Usage

The model is automatically used when booking a taxi. The backend will:
1. Fetch current weather data for the pickup location
2. Prepare features from distance, active bookings, car type, and weather
3. Call the Python script to get ML prediction
4. Fall back to dynamic pricing algorithm if ML prediction fails

## Requirements

- Python 3.7+
- scikit-learn
- numpy
- pandas (if used in model training)

Install Python dependencies:
```bash
pip install scikit-learn numpy pandas
```

## Testing

You can test the prediction directly:
```bash
cd server/ml_models
python predict.py model.pkl encoders.pkl < input.json
```

Where `input.json` contains:
```json
{
  "distance_km": 5.2,
  "hour": 14,
  "day_of_week": 1,
  "demand": 3,
  "available_taxis": 15,
  "weather_encoded": "Clear",
  "brand_loyalty_score": 5.0,
  "car_type_encoded": "sedan"
}
```

