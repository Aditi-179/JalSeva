-- AquaAlert Seed Data (Demo & Initial Admin)
USE aquaalert_db;

-- Initial Seed Incidents
INSERT INTO incidents (incident_id, area, issue_type, severity, description, photo_key, status, resolution_note)
VALUES
('AQ-1001', 'Downtown Central, Sector 4', 'No Water Supply', 'Critical', 'Complete water supply disruption since 6:00 AM affecting 4 residential blocks.', NULL, 'In Progress', 'Field repair team dispatched. Main feeder valve inspection underway.'),
('AQ-1002', 'Greenwood Enclave, Main Rd', 'Pipeline Leakage', 'High', 'Major road pipeline burst causing water flooding and loss of clean municipal water.', NULL, 'Under Review', 'Water engineer assigned to isolate the valve section.'),
('AQ-1003', 'Sunrise Apartments, Block B', 'Low Water Pressure', 'Medium', 'Water pressure is insufficient to reach 2nd and 3rd floor overhead storage tanks.', NULL, 'Reported', NULL),
('AQ-1004', 'Riverside Colony', 'Contaminated Water', 'High', 'Water is discolored with brownish sediment and pungent odor.', NULL, 'Reported', NULL),
('AQ-1005', 'Oakwood Hills, Lane 12', 'Other', 'Low', 'Water supply timing delayed by 3 hours without prior municipal notification.', NULL, 'Resolved', 'Timings restored to normal schedule following booster pump maintenance.');

