import _ from 'lodash';

import { isAskUser } from 'src/services/chatLog';
import type {
  ApprovalDecision, AskUserQuestion, InteractionAnswer, InteractionResult, QuestionAnswerValue, RequestedAction,
  ToolUseBlock,
} from 'src/types/chat';

// Intentions: the rules for answering what the agent is waiting on — its `ask_user` questions and its
// `request_actions` actions: what counts as a complete answer, and turning the form's drafts into the
// submission's `results`. All [Pure].
// References: validated server-side by biveit-backend's services/agent/interactions.py.

// One step of the answering form: a question, or an action the user decides on.
export type InteractionItem = { kind: 'question'; question: AskUserQuestion } | { kind: 'action'; action: RequestedAction };

// What the user has entered for one question while filling the form. `custom` is the raw text input.
export type QuestionDraft = { selected: string[]; custom: string };
// An action's draft: the button the user clicked, null until then.
export type ActionDraft = { decision: ApprovalDecision | null };
export type InteractionDraft = QuestionDraft | ActionDraft;

const _EMPTY_QUESTION_DRAFT: QuestionDraft = { selected: [], custom: '' };
const _EMPTY_ACTION_DRAFT: ActionDraft = { decision: null };

// The approval actions we know how to show (approve / keep iterating), with their wording. Any other action
// name is one we don't know yet: the user can only skip it (submitted as aborted).
const APPROVAL_ACTION_TEXT_KEYS: Record<string, { title: string; hint: string }> = {
  APPROVE_SPEC: { title: 'chat_action_approve_spec_title', hint: 'chat_action_approve_spec_hint' },
  APPROVE_IMPLEMENTATION: { title: 'chat_action_approve_implementation_title', hint: 'chat_action_approve_implementation_hint' },
};

function getEmptyDraft(item: InteractionItem): InteractionDraft {
  return item.kind === 'question' ? _EMPTY_QUESTION_DRAFT : _EMPTY_ACTION_DRAFT;
}

function _toQuestionValue(question: AskUserQuestion, draft: QuestionDraft): QuestionAnswerValue {
  const custom = _.trim(draft.custom);
  return { selected: draft.selected, custom: question.allow_custom && custom ? custom : null };
}

// Single-select needs exactly one answer (an option or custom text); multi-select takes anything,
// zero options included.
function isQuestionDraftComplete(question: AskUserQuestion, draft: QuestionDraft) {
  const value = _toQuestionValue(question, draft);
  return question.multi_select || _.size(value.selected) + (value.custom ? 1 : 0) === 1;
}

// The `results` array for a submission. Without `abortedAtIndex` every item is submitted; with it,
// the ones before are submitted, that one aborted and the rest untouched.
// An action only ever gets submitted once its button was clicked, so its decision is set by then.
function buildInteractionResults(
  items: InteractionItem[],
  drafts: InteractionDraft[],
  options: { abortedAtIndex?: number } = {},
): InteractionResult[] {
  const { abortedAtIndex = Infinity } = options;
  return _.map(items, (item, index): InteractionResult => {
    if (index < abortedAtIndex) {
      const draft = drafts[index] || getEmptyDraft(item);
      return {
        status: 'submitted',
        value: item.kind === 'question'
          ? _toQuestionValue(item.question, draft as QuestionDraft)
          : { decision: (draft as ActionDraft).decision as ApprovalDecision },
      };
    }
    return index === abortedAtIndex ? { status: 'aborted' } : { status: 'untouched' };
  });
}

// One call's items: an `ask_user` call's questions, or a `request_actions` call's actions.
function _getCallItems(interaction: ToolUseBlock): InteractionItem[] {
  return isAskUser(interaction)
    ? _.map(interaction.input.questions as AskUserQuestion[], question => ({ kind: 'question' as const, question }))
    : _.map(interaction.input.actions as RequestedAction[], action => ({ kind: 'action' as const, action }));
}

// All the items of the given calls, as one sequence (the order the user answers them in: call by call,
// item by item).
function flattenInteractionItems(interactions: ToolUseBlock[]): InteractionItem[] {
  return _.flatMap(interactions, _getCallItems);
}

// The submission's `answers`: one entry per call, each with its own slice of the results. `drafts` and
// `abortedAtIndex` are over the flattened sequence (see flattenInteractionItems), so a dismiss marks
// everything after it untouched — the rest of that call and every later call alike.
function buildSubmissionAnswers(
  interactions: ToolUseBlock[],
  drafts: InteractionDraft[],
  options: { abortedAtIndex?: number } = {},
): InteractionAnswer[] {
  const results = buildInteractionResults(flattenInteractionItems(interactions), drafts, options);
  const itemCounts = _.map(interactions, interaction => _.size(_getCallItems(interaction)));
  return _.map(interactions, (interaction, index) => {
    const start = _.sum(_.take(itemCounts, index));
    return { interaction_id: interaction.id, results: _.slice(results, start, start + itemCounts[index]) };
  });
}

// [Pure] A question's options as {label, description}, whichever way each came (a plain label, or one with
// a subtitle) -- so the panel renders one shape.
function getQuestionOptions(question: AskUserQuestion): { label: string; description?: string }[] {
  return _.map(question.options, option => (_.isString(option) ? { label: option } : option));
}

export {
  APPROVAL_ACTION_TEXT_KEYS,
  buildInteractionResults,
  buildSubmissionAnswers,
  flattenInteractionItems,
  getEmptyDraft,
  getQuestionOptions,
  isQuestionDraftComplete,
};
