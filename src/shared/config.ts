export const GAME_NAME = 'Raízes de Ametista';
export const CONFIG = Object.freeze({
  tileSize: 32, tickMs: 40, moveMs: 200, gravityMs: 240,
  enemyMs: 400, dartMs: 1600, dartStepMs: 80,
  spikeCycleMs: 2400, spikeWarningMs: 400, spikeActiveMs: 800,
  respawnMs: 3000, reconnectMs: 30000, batRange: 6, powerUses: 3,
  maxRoomCount: 100, maxMessageBytes: 2048, maxSolverStates: 150000,
});
export const DIRECTIONS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] } as const;
export type Direction = keyof typeof DIRECTIONS;
export const WORLDS = [
  { name: 'Templo da Selva', subtitle: 'Sob as raízes, um começo', stone: '#7c8b55', light: '#b5be79', dark: '#354332', floor: '#23392c', accent: '#bb9af7', leaf: '#4d9c57' },
  { name: 'Caverna de Gelo', subtitle: 'O silêncio guarda caminhos', stone: '#597d91', light: '#abcbd3', dark: '#2c455b', floor: '#192e40', accent: '#75e3ef', leaf: '#568e9c' },
  { name: 'Ruínas de Fogo', subtitle: 'Onde a pedra ainda respira', stone: '#91654d', light: '#cfa577', dark: '#50362e', floor: '#362b2b', accent: '#ffb66c', leaf: '#a68549' },
  { name: 'Cripta Sombria', subtitle: 'Uma última luz na escuridão', stone: '#635574', light: '#a895b8', dark: '#342e45', floor: '#252335', accent: '#e3a2d9', leaf: '#68598a' },
] as const;
