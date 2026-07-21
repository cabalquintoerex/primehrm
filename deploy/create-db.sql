-- LGU PRIME-HRM — dedicated database + least-privilege user on the existing MySQL
-- ---------------------------------------------------------------------------
-- Run as an admin MySQL user:
--   sudo mysql < deploy/create-db.sql          (edit the password first)
-- This touches ONLY the new `llcprime` database — the other apps' databases and
-- users are not referenced, so it is safe on the shared instance.
-- ---------------------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `llcprime`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Change the password, and keep it in sync with DATABASE_URL in server/.env.
CREATE USER IF NOT EXISTS 'llcprime'@'localhost'
  IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';

-- Rights scoped to this database only.
GRANT ALL PRIVILEGES ON `llcprime`.* TO 'llcprime'@'localhost';

FLUSH PRIVILEGES;
