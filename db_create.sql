-- TimeOff Management - MySQL Database Creation Script
-- Run once before starting the application for the first time:
--   mysql -u root -p < db_create.sql

CREATE DATABASE IF NOT EXISTS timeoff_manager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create a dedicated app user (recommended over using root).
-- Replace 'your_password' with a strong password,
-- then update config/db.json with the same credentials.
CREATE USER IF NOT EXISTS 'timeoff'@'localhost' IDENTIFIED BY 'your_password';

GRANT ALL PRIVILEGES ON timeoff_manager.* TO 'timeoff'@'localhost';

FLUSH PRIVILEGES;
