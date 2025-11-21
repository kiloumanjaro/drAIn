-- Add priority field to reports table
ALTER TABLE reports
ADD COLUMN priority TEXT
  DEFAULT 'low'
  CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- Add zone field to reports table for GeoJSON matching
ALTER TABLE reports
ADD COLUMN zone VARCHAR(255);

-- Create indices for performance
CREATE INDEX idx_reports_priority ON reports(priority);
CREATE INDEX idx_reports_zone ON reports(zone);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_component_id ON reports(component_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Comment for clarity
COMMENT ON COLUMN reports.priority IS 'Priority level: low, medium, high, critical (manual assignment)';
COMMENT ON COLUMN reports.zone IS 'Barangay/zone extracted from address for GeoJSON matching';
