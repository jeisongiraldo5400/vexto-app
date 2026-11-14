import * as SecureStore from 'expo-secure-store';
import { beforeEach, describe, expect, it } from 'vitest';

import { clearSession, loadSession, saveSession, type StoredSession } from './secure-session';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

const session: StoredSession = {
  accessToken: 'acc',
  refreshToken: 'ref',
  empresaId: 'emp',
  needsCompanyPick: true,
  user: { id: 'u', email: 'u@x.co', fullName: null, roleId: 'r', permisos: ['pos:crear'] },
};

beforeEach(() => store.clear());

describe('sesión en SecureStore', () => {
  it('guarda y recupera la sesión completa', async () => {
    await saveSession(session);
    expect(store.get('vexto_access_token')).toBe('acc');
    expect(store.get('vexto_needs_company_pick')).toBe('1');
    await expect(loadSession()).resolves.toEqual(session);
  });

  it('needsCompanyPick=false se guarda como "0"', async () => {
    await saveSession({ ...session, needsCompanyPick: false });
    expect((await loadSession())?.needsCompanyPick).toBe(false);
  });

  it('devuelve null si falta cualquier dato obligatorio', async () => {
    await saveSession(session);
    store.delete('vexto_refresh_token');
    await expect(loadSession()).resolves.toBeNull();
  });

  it('devuelve null si el usuario guardado está corrupto', async () => {
    await saveSession(session);
    store.set('vexto_user_json', '{no-json');
    await expect(loadSession()).resolves.toBeNull();
  });

  it('clearSession borra todas las claves', async () => {
    await saveSession(session);
    await clearSession();
    expect(store.size).toBe(0);
    await expect(loadSession()).resolves.toBeNull();
  });
});
