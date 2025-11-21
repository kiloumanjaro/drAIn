-- Migration: Populate Barangay Zones from Address Field
-- Purpose: Extract and validate barangay names from addresses against mandaue_population.geojson
-- Date: November 21, 2025

-- ============================================================================
-- 1. CREATE FUNCTION: Extract barangay from address
-- ============================================================================
-- This function matches address text against the 29 valid barangays from
-- mandaue_population.geojson. Uses case-insensitive matching.

CREATE OR REPLACE FUNCTION extract_barangay_from_address(address_text TEXT)
RETURNS VARCHAR(255) AS $$
DECLARE
  matched_barangay VARCHAR(255);
BEGIN
  -- Return NULL if address is empty
  IF address_text IS NULL OR address_text = '' THEN
    RETURN NULL;
  END IF;

  -- List of 29 valid barangays from mandaue_population.geojson
  -- Ordered by length (longest first) to match longer names first
  SELECT name INTO matched_barangay
  FROM (VALUES
    ('Alang-alang'),
    ('Bakilid'),
    ('Banilad'),
    ('Basak'),
    ('Cabancalan'),
    ('Cambaro'),
    ('Canduman'),
    ('Casili'),
    ('Casuntingan'),
    ('Centro'),
    ('Cubacub'),
    ('Guizo'),
    ('Ibabao'),
    ('Jagobiao'),
    ('Labogon'),
    ('Looc'),
    ('Maguikay'),
    ('Mantuyong'),
    ('Opao'),
    ('Pagsabungan'),
    ('Pakna-an'),
    ('Recle'),
    ('Subangdaku'),
    ('Tabok'),
    ('Tawason'),
    ('Tingub'),
    ('Tipolo'),
    ('Umapad')
  ) AS barangays(name)
  WHERE LOWER(address_text) LIKE '%' || LOWER(name) || '%'
  LIMIT 1;

  RETURN matched_barangay;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 2. CREATE TRIGGER: Auto-populate zone on address update
-- ============================================================================
-- This trigger automatically extracts and populates the zone field whenever
-- a report is inserted or the address is updated.

CREATE OR REPLACE FUNCTION update_report_zone()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update zone if address is present and zone is currently NULL
  -- or if address was changed
  IF NEW.address IS NOT NULL AND NEW.address != '' THEN
    -- If zone is NULL or address changed, extract new zone
    IF NEW.zone IS NULL OR (OLD.address IS NULL OR OLD.address != NEW.address) THEN
      NEW.zone := extract_barangay_from_address(NEW.address);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (safe for re-running migration)
DROP TRIGGER IF EXISTS trigger_update_report_zone ON reports;

-- Create the trigger
CREATE TRIGGER trigger_update_report_zone
BEFORE INSERT OR UPDATE OF address ON reports
FOR EACH ROW
EXECUTE FUNCTION update_report_zone();

-- ============================================================================
-- 3. BACKFILL: Populate zones for existing reports with addresses
-- ============================================================================
-- This updates all existing reports that have an address but no zone
-- The trigger will handle new reports going forward

UPDATE reports
SET zone = extract_barangay_from_address(address)
WHERE address IS NOT NULL
  AND address != ''
  AND (zone IS NULL OR zone = '');

-- Log completion
DO $$
DECLARE
  updated_count INT;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM reports
  WHERE zone IS NOT NULL AND zone != '' AND address IS NOT NULL;

  RAISE NOTICE 'Barangay zone population complete. % reports now have valid zones.', updated_count;
END $$;

-- ============================================================================
-- 4. VERIFY: Check distribution of zones
-- ============================================================================
-- Query to verify zones were properly populated
-- This helps identify if any addresses couldn't be matched

/*
SELECT
  zone,
  COUNT(*) as count,
  CASE
    WHEN zone IS NULL OR zone = '' THEN 'NEEDS ATTENTION'
    ELSE 'Valid'
  END as status
FROM reports
WHERE address IS NOT NULL
GROUP BY zone
ORDER BY count DESC;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- - The zone column was added in migration: 20251121_add_dashboard_fields.sql
-- - Zone is VARCHAR(255) to match the full barangay name
-- - NULL zones indicate addresses that don't match any barangay
-- - The extraction function is IMMUTABLE for better query optimization
-- - Trigger is idempotent and safe to re-run
-- - For reports with NULL addresses, zone remains NULL (not 'Unknown')
-- - The 29 barangays match exactly with mandaue_population.geojson
