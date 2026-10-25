import _ from 'lodash';

import type {
  AgentSessionStatus, AiMessage, AskUserQuestion, ChatIntroState, InteractionResult, SignalBlock, SuggestedReplyBlock,
  ToolResultBlock, ToolUseBlock,
} from 'src/types/chat';
import type { DevenvBuild } from 'src/types/preview';

// Intentions: everything the UI needs to know is derived from the message log on the fly — the log is the
// only state. All [Pure].
// References: the rules mirror biveit-backend's services/agent/interactions.py.

const _ASK_USER_TOOL_NAME = 'ask_user';
const _REQUEST_ACTIONS_TOOL_NAME = 'request_actions';
const _SHOW_ARTIFACT_TOOL_NAME = 'show_artifact';
// A BUILDING signal holds for this long. The agent re-sends it to keep a long build going, so it counts
// from the latest one (see getActiveBuild). Same TTL as the BE's.
const _BUILDING_TTL_MS = 60 * 60 * 1000;
// How long after its introduction the agent may stay silent before its first turn counts as failed -- the
// same figure the BE reintroduces it by on the next open (biveit-backend INTRODUCTION_OVERDUE_SECONDS).
const INTRODUCTION_OVERDUE_MS = 5 * 60 * 1000;

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

function isRequestActions(block?: ToolUseBlock) {
  return block?.name === _REQUEST_ACTIONS_TOOL_NAME;
}

// The tools whose "execution" is the user answering (questions, actions).
function isUserFacingTool(block?: ToolUseBlock) {
  return isAskUser(block) || isRequestActions(block);
}

function isShowArtifact(block?: ToolUseBlock) {
  return block?.name === _SHOW_ARTIFACT_TOOL_NAME;
}

// A marker in the log rather than something said (see SignalBlock). Anything looking for "the last
// message" in the chat sense has to skip these (see findLastSpokenMessage).
function isSignalMessage(message: AiMessage) {
  return !_.isEmpty(message.content) && _.every(message.content, { type: 'signal' });
}

// The user-facing calls still waiting on the user: every one in the assistant messages after the latest
// user message (an answer is a user message, so once answered nothing's left). Signals or text after a
// question don't hide it. Several of them get answered together, in this order. Same rule as the BE's
// find_pending_interactions — if they disagree, the BE answers 409.
function findPendingInteractions(messages: AiMessage[]): ToolUseBlock[] {
  const messagesAfterUser = _.drop(messages, _.findLastIndex(messages, { role: 'user' }) + 1);
  return _.filter(_getBlocksOfType<ToolUseBlock>(_.filter(messagesAfterUser, { role: 'assistant' }), 'tool_use'), isUserFacingTool);
}

// The newest message that was actually said (signals skipped), optionally only from one side.
function findLastSpokenMessage(messages: AiMessage[], options: { role?: AiMessage['role'] } = {}) {
  return _.findLast(messages, message => !isSignalMessage(message) && (!options.role || message.role === options.role));
}

// The reply the agent suggested the user send next, while its message is still the last thing said (once
// the user says anything, it's moot). Null when there's none.
function getSuggestedReply(messages: AiMessage[]): string | null {
  const lastMessage = findLastSpokenMessage(messages);
  if (lastMessage?.role !== 'assistant') {
    return null;
  }
  const suggestion = _.findLast(lastMessage.content, { type: 'suggested_reply' }) as SuggestedReplyBlock | undefined;
  return _.trim(suggestion?.text) || null;
}

// The build in progress, if any, read off the BUILDING / BUILDING_DONE signals: on while the latest of them
// is a BUILDING less than _BUILDING_TTL_MS old. `since` is when the run started (its first BUILDING after
// the last BUILDING_DONE), `summary` the latest description in it. `nowMs` is the caller's clock — a build
// past its `until` has quietly ended, nobody sends a BUILDING_DONE for that.
// Only the loaded messages count: the signals that matter sit at the end of the log, which is always loaded.
function getActiveBuild(messages: AiMessage[], nowMs: number): DevenvBuild | null {
  const buildSignals = _.flatMap(_.filter(messages, isSignalMessage), message => _.map(
    _.filter(message.content as SignalBlock[], block => _.includes(['BUILDING', 'BUILDING_DONE'], block.slug)),
    block => ({ ...block, created_at: message.created_at }),
  ));
  // Everything after the last BUILDING_DONE is a BUILDING.
  const currentRun = _.drop(buildSignals, _.findLastIndex(buildSignals, { slug: 'BUILDING_DONE' }) + 1);
  const latestBuilding = _.last(currentRun);
  if (!latestBuilding) {
    return null;
  }
  const untilMs = Date.parse(latestBuilding.created_at) + _BUILDING_TTL_MS;
  if (untilMs <= nowMs) {
    return null;
  }
  return {
    since: currentRun[0].created_at,
    until: new Date(untilMs).toISOString(),
    summary: _.findLast(currentRun, 'description')?.description ?? null,
  };
}

// An `ask_user` / `request_actions` answer's results. Anything that isn't an array (another tool's result,
// or a row stored before the BE stopped stringifying) reads as no results rather than blowing up the chat.
function getInteractionResults(toolResult: ToolResultBlock): InteractionResult[] {
  return _.isArray(toolResult.content) ? toolResult.content : [];
}

// The questions the user has actually answered so far (dismissed ones don't count), oldest first, as the
// agent worded them. Drives the question panel's encouragement and its "previous question" button.
function getAnsweredQuestions(messages: AiMessage[]): string[] {
  const toolUsesById = indexToolUses(messages);
  return _.flatMap(_getBlocksOfType<ToolResultBlock>(messages, 'tool_result'), toolResult => {
    const toolUse = toolUsesById[toolResult.tool_use_id];
    if (!isAskUser(toolUse)) {
      return [];
    }
    const questions = (toolUse.input.questions || []) as AskUserQuestion[];
    return _.compact(_.map(getInteractionResults(toolResult), (result, index) => (
      result.status === 'submitted' ? questions[index]?.question : null
    )));
  });
}

// A turn the agent has gone quiet on for this long (nothing new in the log at all) is taken as hung: it stops
// showing as working, so the input unlocks. Generous: a real turn posts something now and then.
const _TURN_SILENCE_LIMIT_MS = 30 * 60 * 1000;

function _isIdleSignal(message: AiMessage) {
  return isSignalMessage(message) && _.some(message.content, { slug: 'AGENT_IDLE' });
}

// When an open turn counts as hung (see isAgentWorking), for the caller's clock to tick at. Null with no log.
function getTurnSilenceEndsAtMs(messages: AiMessage[]) {
  const latestMessage = _.last(messages);
  return latestMessage ? Date.parse(latestMessage.created_at) + _TURN_SILENCE_LIMIT_MS : null;
}

// Whether the agent is on it, read off the log: the user said something (text, or answers) after the latest
// AGENT_IDLE, and nothing's waiting on the user. The runner writes an AGENT_IDLE at the end of every turn,
// and the BE writes one when a session stops or dies, or a message couldn't be handed over — so it holds
// across tabs and reloads. Also on while a resend this tab made (`handedOverAfterSeq`: the newest seq it had
// then) has had no AGENT_IDLE since: the resent message is older than the one written when it first failed.
// A turn silent past _TURN_SILENCE_LIMIT_MS (`nowMs` is the caller's clock) is taken as hung.
// A conversation whose runner never sent an AGENT_IDLE (meta.source: runner) is still on an older runner,
// which doesn't: the old guess (_isAgentPresumedWorking) then, until the runner is replaced.
// References: biveit-session-runner main._post_idle, biveit-backend services/agent/signals.end_open_turn
function isAgentWorking(messages: AiMessage[], options: { sentSeqs: number[]; handedOverAfterSeq: number | null; nowMs: number }) {
  const idleMessages = _.filter(messages, _isIdleSignal);
  const hasRunnerReported = _.some(idleMessages, message => _.some(message.content, { slug: 'AGENT_IDLE', meta: { source: 'runner' } }));
  if (!hasRunnerReported) {
    return _isAgentPresumedWorking(messages, options.sentSeqs);
  }
  if (!_.isEmpty(findPendingInteractions(messages))) {
    return false;
  }
  const lastIdleSeq = _.last(idleMessages)?.seq ?? 0;
  const lastUserSeq = _.findLast(messages, { role: 'user' })?.seq ?? 0;
  const isResentSinceIdle = !_.isNil(options.handedOverAfterSeq) && lastIdleSeq <= options.handedOverAfterSeq;
  if (lastUserSeq <= lastIdleSeq && !isResentSinceIdle) {
    return false;
  }
  return options.nowMs < (getTurnSilenceEndsAtMs(messages) ?? 0);
}

// The fallback for conversations still on an older runner (see isAgentWorking), which sends no AGENT_IDLE.
// Best guess at "the agent is on it", read off the log: the user
// spoke last (signals don't count as speaking), that wasn't a dismiss (a dismiss closes the question
// without waking the agent), nothing is still waiting on the user (the agent only resumes once everything
// it asked is answered), and this tab is the one that sent it (`sentSeqs`: the seqs its successful posts
// got back) — in which case it waits for the reply indefinitely. Anything else (loaded with the history, sent from another tab, or a send that
// errored) never counts: a reply that didn't come must not leave the chat locked.
function _isAgentPresumedWorking(messages: AiMessage[], sentSeqs: number[]) {
  const lastMessage = findLastSpokenMessage(messages);
  if (lastMessage?.role !== 'user' || !_.includes(sentSeqs, lastMessage.seq) || !_.isEmpty(findPendingInteractions(messages))) {
    return false;
  }
  const answers = _.filter(lastMessage.content, { type: 'tool_result' }) as ToolResultBlock[];
  return !_.some(answers, answer => _.some(getInteractionResults(answer), { status: 'aborted' }));
}

// [Pure] The agent always speaks first (its welcome and first question, from the bootstrap form's
// answers), so an empty log means it hasn't yet — and why is down to where opening the session is at:
// still opening (it's being set up), failed (offer a retry), or done (its first message is on its way).
// On its way for too long (`introducedAt` over INTRODUCTION_OVERDUE_MS before `nowMs`) means its first turn
// died: offer a retry, which re-opens the project and gets the BE to introduce it again.
// Anything said in the log (a signal isn't) = the conversation has started. null messages = not loaded yet.
function getChatIntroState(
  messages: AiMessage[] | null, sessionStatus: AgentSessionStatus, introducedAt: string | null, nowMs: number,
): ChatIntroState {
  if (_.isNull(messages)) {
    return 'loading';
  }
  if (findLastSpokenMessage(messages)) {
    return 'started';
  }
  if (sessionStatus === 'ready' && introducedAt && nowMs - Date.parse(introducedAt) > INTRODUCTION_OVERDUE_MS) {
    return 'agent-overdue';
  }
  return ({ opening: 'setting-up', failed: 'setup-failed', ready: 'awaiting-agent' } as const)[sessionStatus];
}

// [Pure] When an introduction made at `introducedAt` turns overdue (see getChatIntroState), in ms.
function getIntroductionOverdueAtMs(introducedAt: string) {
  return Date.parse(introducedAt) + INTRODUCTION_OVERDUE_MS;
}

export {
  findLastSpokenMessage,
  findPendingInteractions,
  getActiveBuild,
  getAnsweredQuestions,
  getChatIntroState,
  getInteractionResults,
  getIntroductionOverdueAtMs,
  getSuggestedReply,
  getTurnSilenceEndsAtMs,
  hasOlderMessages,
  indexToolResults,
  indexToolUses,
  isAgentWorking,
  isAskUser,
  isRequestActions,
  isShowArtifact,
  isSignalMessage,
  isUserFacingTool,
  mergeMessages,
};
