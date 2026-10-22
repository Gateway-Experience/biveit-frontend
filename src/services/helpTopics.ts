import _ from 'lodash';

// Intentions: the help chat's knowledge, and how a typed question finds its answer. The topics' wording
// lives in i18nMappings (`help_q_<id>` / `help_a_<id>`); here are just their ids and some extra English
// words people might use for them. Matching is a plain word-overlap score, no AI: good enough to point
// someone at the right answer, and when nothing fits the chat says so instead of guessing.
// All [Pure].

// In the order the chips show them: getting started first, money and languages last.
const HELP_TOPICS: { id: string; keywords: string[] }[] = [
  { id: 'start', keywords: ['new', 'start', 'create', 'begin', 'project', 'first'] },
  { id: 'questions', keywords: ['questions', 'question', 'skip', 'multiple', 'several', 'back', 'previous', 'answer', 'answers', 'interview'] },
  { id: 'siteplan', keywords: ['plan', 'document', 'documents', 'spec', 'specs', 'flows', 'pages', 'file', 'files', 'erd'] },
  { id: 'preview', keywords: ['see', 'preview', 'view', 'look', 'phone', 'mobile', 'desktop', 'show'] },
  { id: 'changes', keywords: [
    'change', 'edit', 'modify', 'update', 'color', 'colour', 'fix', 'add', 'remove', 'redesign', 'header', 'logo', 'font', 'text',
    'image', 'images', 'photo', 'photos', 'button', 'menu', 'section',
  ] },
  { id: 'stuck', keywords: ['stuck', 'responding', 'response', 'reply', 'retry', 'error', 'broken', 'failed', 'slow', 'waiting', 'loading', 'nothing', 'frozen'] },
  { id: 'publish', keywords: ['publish', 'online', 'live', 'domain', 'deploy', 'launch', 'hosting', 'address', 'url', 'internet'] },
  { id: 'cost', keywords: ['cost', 'costs', 'price', 'pay', 'payment', 'money', 'free', 'subscription', 'pricing', 'expensive', 'charge'] },
  { id: 'language', keywords: ['language', 'languages', 'english', 'vietnamese', 'translate', 'chinese', 'japanese', 'korean', 'russian'] },
];

// Words too common to tell topics apart (English and Vietnamese, the languages people are most likely to
// type in; others just match a little looser).
const _STOPWORDS = new Set([
  'how', 'what', 'why', 'can', 'does', 'the', 'and', 'you', 'your', 'are', 'for', 'with', 'this', 'that', 'there',
  'biveit', 'site', 'website', 'web', 'do', 'is', 'it', 'my', 'me', 'to', 'of', 'in', 'on', 'an',
  'làm', 'sao', 'để', 'của', 'mình', 'tôi', 'bạn', 'có', 'không', 'được', 'là', 'thế', 'nào', 'gì', 'cho', 'và',
  'với', 'này', 'một', 'các', 'những',
]);

// Chinese, Japanese and Korean don't put spaces between words, so they're matched by pairs of characters.
const _CJK_RUN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu;
const _WORD = /[\p{L}\p{N}]+/gu;

// [Pure] The bits of `text` worth comparing: whole words for spaced languages, character pairs for CJK.
function _tokenize(text: string) {
  const lowered = text.toLowerCase();
  const cjkPairs = _.flatMap(lowered.match(_CJK_RUN) || [], run => (
    run.length === 1 ? [run] : _.range(run.length - 1).map(index => run.slice(index, index + 2))
  ));
  const words = (lowered.replace(_CJK_RUN, ' ').match(_WORD) || []).filter(word => word.length >= 2 && !_STOPWORDS.has(word));
  return _.uniq([...words, ...cjkPairs]);
}

// [Pure] The topic that best fits `query`, or null when nothing really does. `topics` carry their texts in
// the user's language (question and answer). A word from the question, or one of the topic's keywords, is a
// strong hint (2 points); one that merely appears somewhere in the answer is weak (1). It takes 2 points to
// answer, so a lone answer word ("tell me a joke" vs. "just tell biveit...") doesn't count as a match.
function findHelpTopic(query: string, topics: { id: string; question: string; answer: string; keywords: string[] }[]) {
  const queryTokens = _tokenize(query);
  const scored = topics.map(topic => {
    const strongTokens = new Set([..._tokenize(topic.question), ...topic.keywords]);
    const answerTokens = new Set(_tokenize(topic.answer));
    const score = _.sumBy(queryTokens, token => (strongTokens.has(token) ? 2 : answerTokens.has(token) ? 1 : 0));
    return { id: topic.id, score };
  });
  const best = _.maxBy(scored, 'score');
  return best && best.score >= 2 ? best.id : null;
}

export {
  HELP_TOPICS,
  findHelpTopic,
};
