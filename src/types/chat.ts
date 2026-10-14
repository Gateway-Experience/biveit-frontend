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

// `ask_user` is the agent asking the user multiple-choice questions; `show_artifact` is it pointing the user
// at one of its files (input: { path, title }); other names are regular tool calls.
export type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

// For `ask_user`, `content` is the user's InteractionResult[] (real JSON, never stringified). Other tools'
// results can be anything, hence `unknown`.
export type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: unknown; is_error?: boolean };

// The BE stores blocks verbatim and the set of types keeps growing, so anything unrecognized is skipped.
export type UnknownBlock = { type: string; [key: string]: unknown };

export type ContentBlock = TextBlock | AttachmentBlock | ToolUseBlock | ToolResultBlock | UnknownBlock;

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

// One question's outcome in a submission. Statuses go: all `submitted`, or `submitted`… then exactly
// one `aborted` (the question the user dismissed at) then `untouched`… for the rest.
export type InteractionResult =
  | { status: 'submitted'; value: { selected: string[]; custom: string | null } }
  | { status: 'aborted' }
  | { status: 'untouched' };

// The answers to one `ask_user` tool call: `results` follow that call's questions, in order.
export type InteractionAnswer = { interaction_id: string; results: InteractionResult[] };

// POST /conversations/{id}/messages body.
export type PostChatMessageBody =
  // Text may be empty when there are attachments (paths from the uploads endpoint), but not both.
  | { type: 'text'; text: string; attachments?: string[] }
  // One submission answers the agent's whole message: one entry per pending `ask_user` call, each exactly once.
  | { type: 'submission'; answers: InteractionAnswer[] };
