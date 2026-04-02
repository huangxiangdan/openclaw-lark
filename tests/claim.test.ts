import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeMocks = vi.hoisted(() => ({
  runInboundClaim: vi.fn(),
  getGlobalHookRunner: vi.fn(),
}));

vi.mock('openclaw/plugin-sdk/plugin-runtime', () => ({
  getGlobalHookRunner: runtimeMocks.getGlobalHookRunner,
}));

import { tryClaimInboundMessage } from '../src/messaging/inbound/claim';

describe('tryClaimInboundMessage', () => {
  beforeEach(() => {
    runtimeMocks.runInboundClaim.mockReset();
    runtimeMocks.getGlobalHookRunner.mockReset();
    runtimeMocks.getGlobalHookRunner.mockReturnValue({
      runInboundClaim: runtimeMocks.runInboundClaim,
    });
  });

  it('skips inbound claim for /cas commands', async () => {
    const handled = await tryClaimInboundMessage({
      ctx: {
        content: '/cas',
        chatType: 'p2p',
        chatId: 'oc_chat',
        senderId: 'ou_user',
        senderName: 'Ada',
        threadId: undefined,
        messageId: 'om_1',
        createTime: Date.now(),
        mentions: [],
        parentId: undefined,
        rootId: undefined,
        contentType: 'text',
      } as any,
      account: {
        accountId: 'default',
      } as any,
      commandAuthorized: true,
    });

    expect(handled).toBe(false);
    expect(runtimeMocks.runInboundClaim).not.toHaveBeenCalled();
  });

  it('skips inbound claim for /cas_* commands', async () => {
    const handled = await tryClaimInboundMessage({
      ctx: {
        content: '/cas_resume thread-1',
        chatType: 'p2p',
        chatId: 'oc_chat',
        senderId: 'ou_user',
        senderName: 'Ada',
        threadId: undefined,
        messageId: 'om_2',
        createTime: Date.now(),
        mentions: [],
        parentId: undefined,
        rootId: undefined,
        contentType: 'text',
      } as any,
      account: {
        accountId: 'default',
      } as any,
      commandAuthorized: true,
    });

    expect(handled).toBe(false);
    expect(runtimeMocks.runInboundClaim).not.toHaveBeenCalled();
  });

  it('still claims normal inbound text', async () => {
    runtimeMocks.runInboundClaim.mockResolvedValue({ handled: true });

    const handled = await tryClaimInboundMessage({
      ctx: {
        content: 'hello',
        chatType: 'p2p',
        chatId: 'oc_chat',
        senderId: 'ou_user',
        senderName: 'Ada',
        threadId: undefined,
        messageId: 'om_3',
        createTime: 123,
        mentions: [],
        parentId: undefined,
        rootId: undefined,
        contentType: 'text',
      } as any,
      account: {
        accountId: 'default',
      } as any,
      commandAuthorized: true,
    });

    expect(handled).toBe(true);
    expect(runtimeMocks.runInboundClaim).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.runInboundClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'hello',
        channel: 'feishu',
        conversationId: 'ou_user',
      }),
      expect.objectContaining({
        channelId: 'feishu',
        conversationId: 'ou_user',
      }),
    );
  });
});
