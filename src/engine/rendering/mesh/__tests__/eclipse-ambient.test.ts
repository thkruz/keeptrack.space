import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('mesh fragment shader eclipse ambient (#432)', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'mesh', 'mesh-renderer.ts'), 'utf8');

  it('raises the ambient floor in eclipse but keeps 0.1 when sunlit', () => {
    expect(src).toContain('mix(0.32 + 0.10 * lightAmt, 0.1, sunAmt)');
    expect(src).not.toContain('vec3 ambientColor = baseColor * 0.1;');
  });
});
