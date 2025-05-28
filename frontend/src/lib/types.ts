export interface Player {
  id: string
  username: string
  numbers: number[]
}

export interface GameRoom {
  id: string
  playerCount: number
  players: Player[]
  lives: number
  maxLives: number
}
