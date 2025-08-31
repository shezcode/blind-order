-- docker/mariadb/init.sql
-- MariaDB initialization script for BlindOrder

-- Create additional databases if needed
CREATE DATABASE IF NOT EXISTS blindorder_test;

-- Grant permissions to development user
GRANT ALL PRIVILEGES ON blindorder_dev.* TO 'blindorder_dev'@'%';
GRANT ALL PRIVILEGES ON blindorder_test.* TO 'blindorder_dev'@'%';

-- Create test user for testing environment
CREATE USER IF NOT EXISTS 'test_user'@'%' IDENTIFIED BY 'test_password';
GRANT ALL PRIVILEGES ON blindorder_test.* TO 'test_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Use the development database
USE blindorder_dev;