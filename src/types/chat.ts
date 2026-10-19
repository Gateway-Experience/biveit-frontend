// Chat with a project's agent. Shapes mirror the BE (vib3-backend dto/ai_conversations.py), snake_case.
// References: vib3-backend/docs/fe-handoff-agent-chat.md

export type AiConversation = {
  id: number;
  project_id: number;
  user_id: number;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type AskUserQuestion = {
  question: string;
  options: string[];
  multi_select: boolean;
  allow_custom: boolean;
};

export type TextBlock = { type: 'text'; text: string };

// A file the user uploaded to the conversation. `path` is relative (e.g. 'uploads/3f2a91c0_logo.png') and
// is what both the files endpoint and a message's `attachments` refer to it by.
export type Attachment = { path: string; name: string; mime: string; size: number };

// Attachment blocks come first in a user message, before its text.
export type AttachmentBlock = { type: 'attachment' } & Attachment;

// A file the agent wrote into the conversation's `artifacts/` folder (e.g. 'artifacts/website-spec.md').
// A living document: revisions overwrite the same path. `title` is the latest one the agent showed it with;
// `version` changes whenever the file does, so anything cached from it is keyed on path + version.
export type Artifact = Attachment & { title: string; version: string };

// One thing the agent asks the user to do (a `request_actions` call's input is { actions: RequestedAction[] }).
// The names keep growing: one we don't know yet still has to be dismissable (see InteractionPanel).
export type ActionName = 'APPROVE_SPEC' | 'APPROVE_IMPLEMENTATION';
export type RequestedAction = { name: ActionName | string; params: Record<string, unknown> };

// The two buttons of an approval action (APPROVE_SPEC, APPROVE_IMPLEMENTATION).
export type ApprovalDecision = 'approved' | 'iterate';

// `ask_user` is the agent asking the user multiple-choice questions; `request_actions` is it asking them to
// do something (approve the spec...). Both wait on the user — they're answered in one submission. Then
// `show_artifact` is it pointing the user at one of its files (input: { path, title }); other names are
// regular tool calls.
export type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

// For `ask_user` / `request_actions`, `content` is the user's InteractionResult[] (real JSON, never stringified). Other tools'
// results can be anything, hence `unknown`.
export type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: unknown; is_error?: boolean };

// A signal: a timestamped marker in the log (the message's `created_at` is when it happened), always the
// only block of an assistant message. Not something said, so it's no chat bubble and never counts as "the
// last message" (see isSignalMessage). Slugs keep growing: unknown ones are just ignored.
//   BUILDING / BUILDING_DONE  a big build started (or was refreshed: description = what's being built) / ended
//   IMPLEMENTATION_STARTED    the user approved the spec
//   IMPLEMENTATION_DONE       the user signed off the built site
//   DEVENV_FAILED             setting up the dev environment failed; description = why
export type SignalSlug = 'BUILDING' | 'BUILDING_DONE' | 'IMPLEMENTATION_STARTED' | 'IMPLEMENTATION_DONE' | 'DEVENV_FAILED';
export type SignalBlock = { type: 'signal'; slug: SignalSlug | string; description?: string; meta?: Record<string, unknown> };

// The BE stores blocks verbatim and the set of types keeps growing, so anything unrecognized is skipped.
export type UnknownBlock = { type: string; [key: string]: unknown };

export type ContentBlock = TextBlock | AttachmentBlock | ToolUseBlock | ToolResultBlock | SignalBlock | UnknownBlock;

export type AiMessage = {
  id: number;
  conversation_id: number;
  // 1, 2, 3… per conversation: THE ordering and dedupe key.
  seq: number;
  role: 'user' | 'assistant';
  content: ContentBlock[];
  model: string | null;
  stop_reason: string | null;
  created_at: string;
};

export type QuestionAnswerValue = { selected: string[]; custom: string | null };
export type ActionAnswerValue = { decision: ApprovalDecision };

// One question's (or action's) outcome in a submission. Statuses go: all `submitted`, or `submitted`… then
// exactly one `aborted` (the item the user dismissed at) then `untouched`… for the rest.
export type InteractionResult =
  | { status: 'submitted'; value: QuestionAnswerValue | ActionAnswerValue }
  | { status: 'aborted' }
  | { status: 'untouched' };

// The answers to one `ask_user` / `request_actions` call: `results` follow that call's questions (or
// actions), in order.
export type InteractionAnswer = { interaction_id: string; results: InteractionResult[] };

// POST /conversations/{id}/messages body.
export type PostChatMessageBody =
  // Text may be empty when there are attachments (paths from the uploads endpoint), but not both.
  | { type: 'text'; text: string; attachments?: string[] }
  // One submission answers everything pending: one entry per pending `ask_user` / `request_actions` call,
  // each exactly once.
  | { type: 'submission'; answers: InteractionAnswer[] };

// Where POST /projects/{id}/open is at for this visit: it gets the agent up (and, the first time, hands it
// the bootstrap form's answers so it can open the conversation).
export type AgentSessionStatus = 'opening' | 'ready' | 'failed';

// A conversation before the agent has said anything (see getChatIntroState).
export type ChatIntroState = 'loading' | 'setting-up' | 'setup-failed' | 'awaiting-agent' | 'started';
