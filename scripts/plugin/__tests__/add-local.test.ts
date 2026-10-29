import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planLocalInstall } from '../commands/add';
import { shouldDeleteFiles } from '../commands/remove';
import type { LockEntry } from '../lib/types';

const entry = (overrides: Partial<LockEntry> = {}): LockEntry => ({
  url: 'https://github.com/example/keeptrack-plugin-x',
  ref: '(default)',
  commit: 'abc123',
  installedAt: '2026-10-28T00:00:00.000Z',
  ...overrides,
});

describe('planLocalInstall', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'kt-plugin-add-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('registers a freshly scaffolded folder in place instead of calling it a name clash', () => {
    const dir = join(root, 'my-plugin');

    mkdirSync(dir);

    expect(planLocalInstall(dir, '', true, {})).toEqual({ kind: 'in-place', name: 'my-plugin' });
  });

  it('refreshes an existing local entry for the same folder', () => {
    const dir = join(root, 'my-plugin');

    mkdirSync(dir);

    expect(planLocalInstall(dir, '', true, { 'my-plugin': entry({ local: true, ref: 'local' }) }).kind).toBe('in-place');
  });

  it('refuses a folder whose name is already installed from a remote', () => {
    const dir = join(root, 'my-plugin');

    mkdirSync(dir);

    expect(() => planLocalInstall(dir, '', true, { 'my-plugin': entry() })).toThrow(/already installed from/u);
  });

  it('refuses a --name that differs from an in-place folder name', () => {
    const dir = join(root, 'my-plugin');

    mkdirSync(dir);

    expect(() => planLocalInstall(dir, 'other-name', true, {})).toThrow(/folder name "my-plugin"/u);
  });

  it('clones a git checkout that lives outside src/plugins-external', () => {
    const dir = join(root, 'keeptrack-plugin-launch-schedule');

    mkdirSync(join(dir, '.git'), { recursive: true });

    expect(planLocalInstall(dir, '', false, {})).toEqual({ kind: 'clone', name: 'keeptrack-plugin-launch-schedule' });
  });

  it('copies a plain folder that lives outside src/plugins-external, honouring --name', () => {
    const dir = join(root, 'My Plugin');

    mkdirSync(dir);

    expect(planLocalInstall(dir, '', false, {})).toEqual({ kind: 'copy', name: 'my-plugin' });
    expect(planLocalInstall(dir, 'custom', false, {})).toEqual({ kind: 'copy', name: 'custom' });
  });
});

describe('shouldDeleteFiles', () => {
  const dir = join(tmpdir(), 'kt-plugins-external', 'my-plugin');

  it('keeps a plugin registered in place, since it is the author source', () => {
    expect(shouldDeleteFiles(entry({ local: true, ref: 'local', url: dir }), dir, {})).toBe(false);
  });

  it('deletes it with --delete-files', () => {
    expect(shouldDeleteFiles(entry({ local: true, ref: 'local', url: dir }), dir, { 'delete-files': true })).toBe(true);
  });

  it('deletes clones and copies, whose source lives elsewhere', () => {
    expect(shouldDeleteFiles(entry(), dir, {})).toBe(true);
    expect(shouldDeleteFiles(entry({ local: true, ref: 'local', url: join(tmpdir(), 'elsewhere', 'my-plugin') }), dir, {})).toBe(true);
  });

  it('honours --keep-files for anything', () => {
    expect(shouldDeleteFiles(entry(), dir, { 'keep-files': true })).toBe(false);
  });
});
