CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(10) PRIMARY KEY,
  max_lives INT NOT NULL DEFAULT 3,
  numbers_per_player INT NOT NULL DEFAULT 6,
  lives INT NOT NULL DEFAULT 3,
  state ENUM('lobby', 'playing', 'game-over', 'victory') NOT NULL DEFAULT 'lobby',
  host_id VARCHAR(50),
  timeline JSON DEFAULT '[]',
  game_events JSON DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id VARCHAR(50) PRIMARY KEY,
  room_id VARCHAR(10) NOT NULL,
  username VARCHAR(50) NOT NULL,
  numbers JSON DEFAULT '[]',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_id (room_id)
);

-- Insert test data
INSERT INTO rooms (id, max_lives, numbers_per_player, lives, state, host_id, timeline, game_events) VALUES
  ('TEST01', 3, 6, 3, 'lobby', '', '[]', '[]'),
  ('TEST02', 5, 8, 5, 'lobby', 'player-001', '[]', '[]'),
  ('GAME01', 3, 6, 2, 'playing', 'player-003', '[1, 2, 3, 5]', '[{"type":"game-started","timestamp":1234567890}]'),
  ('OVER01', 3, 6, 0, 'game-over', 'player-005', '[1, 2, 4]', '[{"type":"game-ended","timestamp":1234567899}]');

INSERT INTO players (id, room_id, username, numbers) VALUES
  ('player-001', 'TEST02', 'Alice', '[]'),
  ('player-002', 'TEST02', 'Bob', '[]'),
  ('player-003', 'GAME01', 'Charlie', '[4, 7, 9]'),
  ('player-004', 'GAME01', 'Diana', '[6, 8, 10]'),
  ('player-005', 'OVER01', 'Eve', '[]'),
  ('player-006', 'OVER01', 'Frank', '[]');