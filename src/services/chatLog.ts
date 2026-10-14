import _ from 'lodash';

import type { AiMessage, InteractionResult, ToolResultBlock, ToolUseBlock } from 'src/types/chat';

// Intentions: everything the UI needs to know is derived from the message log on the fly — the log is the
// only state. All [Pure].
// References: the rules mirror vib3-backend's services/agent/interactions.py.

const _ASK_USER_TOOL_NAME = 'ask_user';
const _SHOW_ARTIFACT_TOOL_NAME = 'show_artifact';

// seq starts at 1 with no gaps, so there's older history exactly when the oldest loaded message isn't #1.
function hasOlderMessages(messages: AiMessage[]) {
  return (_.first(messages)?.seq || 1) > 1;
}

// History, POST responses and the stream all overlap, so every arrival goes through here: dedupe by
// seq (newer copy wins), keep seq order.
function mergeMessages(messages: AiMessage[], incomingMessages: AiMessage[]) {
  return _.sortBy(_.uniqBy([...incomingMessages, ...messages], 'seq'), 'seq');
}

function _getBlocksOfType<T>(messages: AiMessage[], type: string): T[] {
  return _.filter(_.flatMap(messages, 'content'), { type }) as T[];
}

function indexToolUses(messages: AiMessage[]): Record<string, ToolUseBlock> {
  return _.keyBy(_getBlocksOfType<ToolUseBlock>(messages, 'tool_use'), 'id');
}

function indexToolResults(messages: AiMessage[]): Record<string, ToolResultBlock> {
  return _.keyBy(_getBlocksOfType<ToolResultBlock>(messages, 'tool_result'), 'tool_use_id');
}

function isAskUser(block?: ToolUseBlock) {
  return block?.name === _ASK_USER_TOOL_NAME;
}

function isShowArtifact(block?: ToolUseBlock) {
  return block?.name === _SHOW_ARTIFACT_TOOL_NAME;
}

// The `ask_user` calls still waiting on the user: those in the LATEST assistant message with no answer
// yet. Same rule as the BE's find_pending_interactions — if they disagree, the BE answers 409.
function findPendingInteractions(messages: AiMessage[]): ToolUseBlock[] {
  const lastAssistantMessage = _.findLast(messages, { role: 'assistant' });
  const toolResultsByCallId = indexToolResults(messages);
  return _.filter(
    _.filter(lastAssistantMessage?.content, { type: 'tool_use' }) as ToolUseBlock[],
    block => isAskUser(block) && !toolResultsByCallId[block.id],
  );
}

// An `ask_user` answer's results. Anything that isn't an array (another tool's result, or a row stored
// before the BE stopped stringifying) reads as no results rather than blowing up the whole chat.
function getInteractionResults(toolResult: ToolResultBlock): InteractionResult[] {
  return _.isArray(toolResult.content) ? toolResult.content : [];
}

// Best guess at "the agent is on it" — the API has no status signal, so it's read off the log: the user
// spoke last, that wasn't a dismiss (a dismiss closes the question without waking the agent), no question
// is still open (the agent only resumes once every question in its message is answered), and this tab is
// the one that sent it (`sentSeqs`: the seqs its successful posts got back) — in which case it waits for
// the reply indefinitely. Anything else (loaded with the history, sent from another tab, or a send that
// errored) never counts: a reply that didn't come must not leave the chat locked.
function isAgentPresumedWorking(messages: AiMessage[], sentSeqs: number[]) {
  const lastMessage = _.last(messages);
  if (lastMessage?.role !== 'user' || !_.includes(sentSeqs, lastMessage.seq) || !_.isEmpty(findPendingInteractions(messages))) {
    return false;
  }
  const answers = _.filter(lastMessage.content, { type: 'tool_result' }) as ToolResultBlock[];
  return !_.some(answers, answer => _.some(getInteractionResults(answer), { status: 'aborted' }));
}

export {
  findPendingInteractions,
  getInteractionResults,
  hasOlderMessages,
  indexToolResults,
  indexToolUses,
  isAgentPresumedWorking,
  isAskUser,
  isShowArtifact,
  mergeMessages,
};
