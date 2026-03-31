import { larkLogger } from '../core/lark-logger';

const elog = larkLogger('channel/card-action-forward');

export type CardActionHandler = (params: { accountId: string; data: unknown }) => Promise<unknown> | unknown;

type Registry = Map<string, CardActionHandler>;

const GLOBAL_KEY = Symbol.for('openclaw-lark.card-action.forward.registry');
const GLOBAL_ALIAS = '__openclaw_lark_card_action__';

function getRegistry(): Registry {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map();
  if (!g[GLOBAL_ALIAS]) {
    g[GLOBAL_ALIAS] = {
      register: registerCardActionHandler,
      unregister: unregisterCardActionHandler,
      list: listRegisteredActions,
    };
  }
  return g[GLOBAL_KEY] as Registry;
}

export function registerCardActionHandler(action: string, handler: CardActionHandler): () => void {
  const key = String(action || '').trim();
  if (!key) throw new Error('action is required');
  if (typeof handler !== 'function') throw new Error('handler is required');

  const registry = getRegistry();
  if (registry.has(key)) throw new Error(`card action handler already registered: ${key}`);
  registry.set(key, handler);
  elog.info(`card action handler registered: ${key}`);
  return () => unregisterCardActionHandler(key);
}

export function unregisterCardActionHandler(action: string): void {
  const key = String(action || '').trim();
  if (!key) return;
  const registry = getRegistry();
  if (registry.delete(key)) elog.info(`card action handler unregistered: ${key}`);
}

export function listRegisteredActions(): string[] {
  const registry = getRegistry();
  return Array.from(registry.keys()).sort();
}

export async function dispatchCardAction(params: { accountId: string; data: unknown }): Promise<unknown | undefined> {
  const ev = params.data as any;
  const actionValue = ev?.action?.value;
  const action = typeof actionValue?.action === 'string' ? String(actionValue.action).trim() : '';
  if (!action) return undefined;

  const registry = getRegistry();
  const handler = registry.get(action);
  if (!handler) {
    elog.info(`card action received but no handler (accountId=${params.accountId} action=${action})`);
    return undefined;
  }
  elog.info(`card action dispatching (accountId=${params.accountId} action=${action})`);

  try {
    return await handler({ accountId: params.accountId, data: params.data });
  } catch (err) {
    elog.warn(`card action handler error action=${action}: ${String(err)}`);
    return undefined;
  }
}

getRegistry();
