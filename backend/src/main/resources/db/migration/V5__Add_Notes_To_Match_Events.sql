-- Add notes column to match_events to store red card reasons or other event details
ALTER TABLE match_events
ADD COLUMN notes TEXT;
