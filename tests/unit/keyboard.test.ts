import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bindKeys, isDown, onKeyDown, type KeyMap } from '../../src/utils/keyboard';

/**
 * Fake KeyboardPlugin yang meniru perilaku Phaser 3.85 `addKeys` secara harfiah:
 * `for (var key in keys)` → kalau dikirim ARRAY, kuncinya jadi indeks '0','1',…
 * Test ini yang menjaga agar bug "halaman blank" (scene.create() melempar
 * TypeError karena k.SPACE undefined) tidak kembali.
 */
function makeFakePlugin() {
  const calls: unknown[] = [];
  return {
    calls,
    addKeys(keys: object) {
      calls.push(keys);
      const out: Record<string, { name: string }> = {};
      for (const key in keys) {
        const value = (keys as Record<string, string>)[key];
        out[key] = { name: `${key}→${value}` };
      }
      return out;
    },
  } as unknown as {
    calls: unknown[];
    addKeys: (k: object) => object;
  };
}

type FakePlugin = Parameters<typeof bindKeys>[0];

describe('bindKeys — kontrak Phaser addKeys', () => {
  it('mengirim peta nama (objek), BUKAN array, ke KeyboardPlugin', () => {
    const kb = makeFakePlugin();
    const map = bindKeys(kb as unknown as FakePlugin, ['SPACE', 'ESC']) as unknown as Record<string, { name: string }>;

    expect(kb.calls).toHaveLength(1);
    const arg = kb.calls[0];
    expect(Array.isArray(arg)).toBe(false);
    expect(arg).toEqual({ SPACE: 'SPACE', ESC: 'ESC' });

    // Lookup by-name harus terisi — inilah yang dulu undefined lalu crash.
    expect(map.SPACE?.name).toBe('SPACE→SPACE');
    expect(map.ESC?.name).toBe('ESC→ESC');
  });

  it('membandingkan: array memang menghasilkan kunci indeks (alasan jebakan itu)', () => {
    const fake = (keys: object) => {
      const out: Record<string, string> = {};
      for (const key in keys) out[key] = String((keys as Record<string, string>)[key]);
      return out;
    };
    const asArray = fake(['UP', 'DOWN'] as unknown as object);
    expect(asArray['0']).toBe('UP');
    expect(asArray.UP).toBeUndefined();

    const asMap = fake({ UP: 'UP', DOWN: 'DOWN' });
    expect(asMap.UP).toBe('UP');
    expect(asMap.DOWN).toBe('DOWN');
  });

  it('aman saat plugin keyboard tidak ada (null/undefined)', () => {
    expect(bindKeys(null, ['SPACE'])).toEqual({});
    expect(bindKeys(undefined, ['SPACE'])).toEqual({});
  });

  it('membuang nama key yang tidak dipetakan plugin, tanpa melempar', () => {
    const kb = {
      addKeys: (keys: object) => {
        const out: Record<string, unknown> = {};
        for (const k in keys) if (k !== 'GHOST') out[k] = { name: k };
        return out;
      },
    } as unknown as Parameters<typeof bindKeys>[0];

    const map = bindKeys(kb, ['SPACE', 'GHOST']);
    expect(Object.keys(map)).toEqual(['SPACE']);
    expect(() => onKeyDown(map, 'GHOST', () => {})).not.toThrow();
  });
});

describe('isDown / onKeyDown', () => {
  const mkKey = (down: boolean) => ({
    isDown: down,
    handlers: [] as string[],
    on(_evt: string, cb: () => void) {
      (this as { handlers: string[] }).handlers.push('bound');
      cb();
    },
  });

  it('isDown toleran terhadap peta kosong/null', () => {
    expect(isDown(null, 'A')).toBe(false);
    expect(isDown({} as KeyMap, 'A', 'LEFT')).toBe(false);
  });

  it('isDown benar saat salah satu key ditekan', () => {
    const map = {
      A: mkKey(false),
      LEFT: mkKey(true),
    } as unknown as KeyMap;
    expect(isDown(map, 'A', 'LEFT')).toBe(true);
    expect(isDown(map, 'D', 'RIGHT')).toBe(false);
  });

  it('onKeyDown memanggil listener yang terpasang', () => {
    let fired = 0;
    const map = { SPACE: mkKey(false) } as unknown as KeyMap;
    onKeyDown(map, 'SPACE', () => fired++);
    expect(fired).toBe(1);
    expect((map.SPACE as unknown as { handlers: string[] }).handlers).toEqual(['bound']);
    onKeyDown(map, 'MISSING', () => {
      throw new Error('tidak boleh terpanggil');
    });
  });
});

describe('guard regresi di seluruh src/', () => {
  it('tidak ada satu pun pemanggilan addKeys dengan array literal', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(full)) files.push(full);
      }
    };
    walk(join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'src'));

    const stripComments = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

    const offenders = files
      .map((f) => {
        const body = stripComments(readFileSync(f, 'utf8'));
        return /\.addKeys\s*\(\s*\[/.test(body) ? f : null;
      })
      .filter((f): f is string => f !== null);

    expect(offenders).toEqual([]);
    expect(files.length).toBeGreaterThan(10);
  });
});
