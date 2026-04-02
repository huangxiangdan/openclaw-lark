import { getGlobalHookRunner } from 'openclaw/plugin-sdk/plugin-runtime';
import type { LarkAccount } from '../../core/types';
import type { MessageContext } from '../types';

type HookRunner = NonNullable<ReturnType<typeof getGlobalHookRunner>>;
type InboundClaimEvent = Parameters<HookRunner['runInboundClaim']>[0];
type InboundClaimContext = Parameters<HookRunner['runInboundClaim']>[1];

const CODEX_COMMAND_RE = /^\/cas(?:\b|_)/i;

export async function tryClaimInboundMessage(params: {
  ctx: MessageContext;
  account: LarkAccount;
  commandAuthorized?: boolean;
}): Promise<boolean> {
  const { ctx, account, commandAuthorized } = params;
  if (CODEX_COMMAND_RE.test(ctx.content.trim())) {
    return false;
  }
  const hookRunner = getGlobalHookRunner();
  if (!hookRunner) {
    console.warn('[openclaw-lark] inbound claim hook runner unavailable');
    return false;
  }
  if (!hookRunner.runInboundClaim) {
    console.warn('[openclaw-lark] inbound claim method unavailable on hook runner');
    return false;
  }

  const isGroup = ctx.chatType === 'group';
  const conversationId = isGroup ? ctx.chatId : ctx.senderId;
  if (!conversationId) {
    return false;
  }

  const event: InboundClaimEvent = {
    content: ctx.content,
    body: ctx.content,
    bodyForAgent: ctx.content,
    timestamp: ctx.createTime,
    channel: 'feishu',
    accountId: account.accountId,
    conversationId,
    parentConversationId: isGroup ? ctx.chatId : undefined,
    senderId: ctx.senderId,
    senderName: ctx.senderName,
    threadId: ctx.threadId,
    messageId: ctx.messageId,
    isGroup,
    commandAuthorized,
    wasMentioned: ctx.mentions.some((mention) => mention.isBot),
    metadata: {
      chatId: ctx.chatId,
      chatType: ctx.chatType,
      parentId: ctx.parentId,
      rootId: ctx.rootId,
      contentType: ctx.contentType,
    },
  };

  const hookContext: InboundClaimContext = {
    channelId: 'feishu',
    accountId: account.accountId,
    conversationId,
    parentConversationId: isGroup ? ctx.chatId : undefined,
    senderId: ctx.senderId,
    messageId: ctx.messageId,
  };

  const result = await hookRunner.runInboundClaim(event, hookContext);
  return Boolean(result?.handled);
}
