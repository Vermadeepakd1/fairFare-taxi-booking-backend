# OpenRouteService API Setup

OpenRouteService provides free routing APIs that give you actual road paths instead of straight lines. This makes taxi movement look more realistic on the map.

## Getting Your API Key

1. **Sign up for free account:**
   - Go to [OpenRouteService.org](https://openrouteservice.org/)
   - Click "Sign Up" or "Get API Key"
   - Create a free account (no credit card required)

2. **Get your API key:**
   - After signing up, go to your dashboard
   - Copy your API key (it looks like: `5b3ce3597851110001cf6248...`)

3. **Add to environment variables:**
   - Add `OPENROUTE_API_KEY=your-api-key-here` to your `server/.env` file

## Free Tier Limits

- **2,000 requests per day** (free tier)
- **40 requests per minute**
- Perfect for development and small-scale applications

## What It Does

- **Real Road Paths**: Taxis follow actual roads instead of straight lines
- **Route Geometry**: Provides detailed coordinate arrays for smooth map visualization
- **Automatic Fallback**: If API fails or key is missing, falls back to straight-line routes

## Usage

The API is automatically used when:
- Booking a taxi (calculates route from taxi to pickup)
- Taxi moves to pickup location
- Taxi moves from pickup to dropoff
- Displaying routes on the map

## Troubleshooting

### API Key Not Working
- Check that your API key is correctly set in `.env`
- Verify the key is active in your OpenRouteService dashboard
- Check server logs for API errors

### Rate Limit Exceeded
- Free tier: 2,000 requests/day
- The app will automatically fall back to straight-line routes if rate limited
- Consider upgrading to a paid plan for higher limits

### Routes Not Showing
- If OpenRouteService fails, the app uses straight-line fallback
- Check browser console and server logs for errors
- Verify your API key has routing permissions

## Alternative

If you don't want to use OpenRouteService:
- Simply don't add the `OPENROUTE_API_KEY` to your `.env` file
- The app will automatically use straight-line routes
- All functionality will still work, just without road-following paths

