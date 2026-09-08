export type EnemyType = 'serat' | 'kutu';

export interface SpawnDef {
  type: EnemyType;
  atMs: number;
}

export interface WaveDef {
  label: string;
  sub: string;
  spawns: SpawnDef[];
}

/**
 * Scripted encounter untuk vertical slice.
 * Kesulitan naik lewat kombinasi dan posisi, bukan telegraph yang dipangkas.
 */
export const ENCOUNTERS: WaveDef[] = [
  {
    label: 'ENCOUNTER 1',
    sub: 'SERAT LEPAS',
    spawns: [
      { type: 'serat', atMs: 1600 },
      { type: 'serat', atMs: 2600 },
      { type: 'serat', atMs: 9500 },
      { type: 'serat', atMs: 10500 },
    ],
  },
  {
    label: 'ENCOUNTER 2',
    sub: 'KUTU & SERAT',
    spawns: [
      { type: 'serat', atMs: 1200 },
      { type: 'kutu', atMs: 2600 },
      { type: 'serat', atMs: 7000 },
      { type: 'kutu', atMs: 12500 },
      { type: 'serat', atMs: 16500 },
    ],
  },
];
