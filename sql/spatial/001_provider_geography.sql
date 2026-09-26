-- PostGIS spatial setup for provider discovery
-- This script adds optional PostGIS geography columns and indexes
--
-- IMPORTANT: This is deliberately separate from Drizzle migrations
-- PostGIS objects are optional and managed outside portable schema

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to provider_profiles table
-- geography(Point, 4326) = WGS84 lat/lng point
ALTER TABLE provider_profiles
ADD COLUMN IF NOT EXISTS location_geo geography(Point, 4326)
GENERATED ALWAYS AS (
  CASE 
    WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN
      ST_SetSRID(
        ST_MakePoint(
          CAST(longitude AS double precision),
          CAST(latitude AS double precision)
        ),
        4326
      )::geography
    ELSE NULL
  END
) STORED;

-- Create spatial index on provider_profiles
CREATE INDEX IF NOT EXISTS provider_profiles_geo_idx
ON provider_profiles
USING GIST (location_geo);

-- Add geography column to service_requests table
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS location_geo geography(Point, 4326)
GENERATED ALWAYS AS (
  ST_SetSRID(
    ST_MakePoint(
      CAST(longitude AS double precision),
      CAST(latitude AS double precision)
    ),
    4326
  )::geography
) STORED;

-- Create spatial index on service_requests
CREATE INDEX IF NOT EXISTS service_requests_geo_idx
ON service_requests
USING GIST (location_geo);

-- Verify PostGIS setup
DO $$
BEGIN
  RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
  RAISE NOTICE 'Spatial columns and indexes created successfully on provider_profiles and service_requests';
END $$;

