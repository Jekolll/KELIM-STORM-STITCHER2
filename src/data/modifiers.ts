export interface StitchStats {
  anticipationMs: number;
  cooldownMs: number;
  maxPlacementDist: number;
  maxSide: number;
}

export const BASE_STITCH: StitchStats = {
  anticipationMs: 140,
  cooldownMs: 450,
  maxPlacementDist: 220,
  maxSide: 320,
};

export interface ModifierDef {
  id: string;
  name: string;
  desc: string;
  apply: (s: StitchStats) => void;
}

export const MODIFIERS: ModifierDef[] = [
  {
    id: 'quick-pull',
    name: 'Tarikan Cepat',
    desc: 'Benang menegang lebih cepat dan jahitan berikutnya menyusul tanpa jeda lama.',
    apply: (s) => {
      s.anticipationMs = 100;
      s.cooldownMs = 340;
    },
  },
  {
    id: 'long-needles',
    name: 'Jarum Panjang',
    desc: 'Kamu bisa menjahit dari jarak yang lebih jauh.',
    apply: (s) => {
      s.maxPlacementDist = 265;
    },
  },
  {
    id: 'wide-stitch',
    name: 'Jahitan Lebar',
    desc: 'Sisi jahitan boleh lebih panjang, tetapi pemulihan sedikit lebih lama.',
    apply: (s) => {
      s.maxSide = 380;
      s.cooldownMs = 520;
    },
  },
];
