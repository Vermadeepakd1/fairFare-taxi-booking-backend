#!/usr/bin/env python3
"""
ML Price Prediction Script
Loads the trained model and encoders, makes a prediction based on input features.
"""

import sys
import json
import pickle
import numpy as np

def load_model_and_encoders(model_path, encoder_path):
    """Load the trained model and encoders from pickle files."""
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        with open(encoder_path, 'rb') as f:
            encoders = pickle.load(f)
        return model, encoders
    except Exception as e:
        print(f"Error loading model/encoders: {e}", file=sys.stderr)
        sys.exit(1)

def encode_features(features, encoders):
    """Encode categorical features using the loaded encoders."""
    encoded_features = features.copy()
    
    # Encode car_type_encoded using 'car_type' encoder (as per model usage)
    if 'car_type_encoded' in encoded_features:
        car_type_value = encoded_features['car_type_encoded']
        # Capitalize first letter to match model training (Sedan, Mini, SUV)
        if isinstance(car_type_value, str):
            car_type_capitalized = car_type_value.capitalize()
        else:
            car_type_capitalized = str(car_type_value).capitalize()
        
        if 'car_type' in encoders:
            try:
                encoded_features['car_type_encoded'] = encoders['car_type'].transform([car_type_capitalized])[0]
            except Exception as e:
                print(f"Warning: Failed to encode car_type: {e}", file=sys.stderr)
                # Default mapping
                car_type_map = {'Mini': 0, 'Sedan': 1, 'Suv': 2, 'SUV': 2}
                encoded_features['car_type_encoded'] = car_type_map.get(car_type_capitalized, 1)
        else:
            # No encoder found, use default mapping
            car_type_map = {'Mini': 0, 'Sedan': 1, 'Suv': 2, 'SUV': 2}
            encoded_features['car_type_encoded'] = car_type_map.get(car_type_capitalized, 1)
    
    # Encode weather_encoded using 'weather' encoder (as per model usage)
    if 'weather_encoded' in encoded_features:
        weather_value = encoded_features['weather_encoded']
        # Ensure it's a string and capitalized (Rainy, Clear, etc.)
        if isinstance(weather_value, str):
            weather_capitalized = weather_value
        else:
            weather_capitalized = str(weather_value)
        
        if 'weather' in encoders:
            try:
                encoded_features['weather_encoded'] = encoders['weather'].transform([weather_capitalized])[0]
            except Exception as e:
                print(f"Warning: Failed to encode weather: {e}", file=sys.stderr)
                # Default mapping
                weather_map = {'Clear': 0, 'Cloudy': 1, 'Rainy': 2, 'Snowy': 3, 'Windy': 4, 'Fog': 5, 'Stormy': 6}
                encoded_features['weather_encoded'] = weather_map.get(weather_capitalized, 0)
        else:
            # No encoder found, use default mapping
            weather_map = {'Clear': 0, 'Cloudy': 1, 'Rainy': 2, 'Snowy': 3, 'Windy': 4, 'Fog': 5, 'Stormy': 6}
            encoded_features['weather_encoded'] = weather_map.get(weather_capitalized, 0)
    
    return encoded_features

def prepare_features(features_dict, encoders):
    """Prepare feature array in the correct order for the model."""
    # Encode categorical features FIRST
    encoded = encode_features(features_dict, encoders)
    
    # Define feature order matching the model's expected features
    feature_order = [
        'distance_km',
        'hour',
        'day_of_week',
        'demand',
        'available_taxis',
        'weather_encoded',
        'brand_loyalty_score',
        'car_type_encoded'
    ]
    
    # Extract features in order
    feature_array = []
    for feature in feature_order:
        if feature in encoded:
            # Ensure the value is numeric (already encoded)
            try:
                feature_array.append(float(encoded[feature]))
            except (ValueError, TypeError):
                # If encoding failed, use default
                defaults = {
                    'distance_km': 0,
                    'hour': 12,
                    'day_of_week': 1,
                    'demand': 0,
                    'available_taxis': 10,
                    'weather_encoded': 0,
                    'brand_loyalty_score': 5.0,  # 0-10 scale
                    'car_type_encoded': 1
                }
                feature_array.append(defaults.get(feature, 0))
        else:
            # Default values if feature is missing
            defaults = {
                'distance_km': 0,
                'hour': 12,  # Noon
                'day_of_week': 1,  # Monday
                'demand': 0,  # 0-200
                'available_taxis': 10,
                'weather_encoded': 0,  # Clear
                'brand_loyalty_score': 5.0,  # 0-10 (default to middle)
                'car_type_encoded': 1  # sedan
            }
            feature_array.append(defaults.get(feature, 0))
    
    return np.array([feature_array])

def predict_price(model_path, encoder_path, input_json):
    """Main prediction function."""
    try:
        # Load model and encoders
        model, encoders = load_model_and_encoders(model_path, encoder_path)
        
        # Parse input features
        features = json.loads(input_json)
        
        # Prepare features
        X = prepare_features(features, encoders)
        
        # Make prediction
        prediction = model.predict(X)[0]
        
        # Ensure prediction is positive
        price = max(0, float(prediction))
        
        # Return result as JSON
        result = {
            'price': price,
            'success': True
        }
        print(json.dumps(result))
        
    except Exception as e:
        # Return error as JSON
        error_result = {
            'price': None,
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({
            'price': None,
            'success': False,
            'error': 'Usage: python predict.py <model_path> <encoder_path>'
        }), file=sys.stderr)
        sys.exit(1)
    
    model_path = sys.argv[1]
    encoder_path = sys.argv[2]
    
    # Read input from stdin
    input_json = sys.stdin.read()
    
    predict_price(model_path, encoder_path, input_json)

