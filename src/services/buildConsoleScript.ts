import _ from 'lodash';

import type { DevenvBuild } from 'src/types/preview';
import type { Project } from 'src/types/project';

// Intentions: write the made-up code that scrolls past in the preview while the agent builds (see
// BuildConsole), out of what the user told us about their site: its name, their description, the kinds
// of site they picked, and the agent's one-line summary of the current build. So a perfume shop sees
// `<PerfumesGrid>` and `db.perfumes`, not a generic demo. It's decoration, not the real code.

// Common words that make poor keywords. English: whole words. Vietnamese: syllables (its words are
// written as separate syllables, see _extractKeywords). Other languages just yield fewer keywords, and
// the fallbacks below fill in.
const _STOPWORDS = new Set([
  'about', 'also', 'and', 'any', 'are', 'because', 'been', 'being', 'both', 'but', 'can', 'could', 'each', 'even',
  'every', 'from', 'have', 'here', 'into', 'just', 'like', 'more', 'most', 'much', 'need', 'only', 'other', 'our',
  'ours', 'over', 'really', 'should', 'some', 'such', 'than', 'that', 'their', 'them', 'then', 'there', 'these',
  'they', 'thing', 'things', 'this', 'those', 'through', 'very', 'want', 'what', 'when', 'where', 'which', 'while',
  'will', 'with', 'would', 'your', 'yours', 'able', 'make', 'site', 'website', 'page', 'pages', 'people', 'customers',
  'customer', 'user', 'users', 'online', 'sell', 'sells', 'selling', 'business', 'help', 'well', 'many', 'day', 'days',
]);
const _VIETNAMESE_STOPWORDS = new Set([
  'mình', 'tôi', 'chúng', 'bạn', 'họ', 'cho', 'ở', 'và', 'của', 'các', 'những', 'muốn', 'có', 'thể', 'được', 'là',
  'với', 'để', 'trên', 'trong', 'khi', 'thì', 'này', 'đó', 'một', 'nhiều', 'rất', 'cũng', 'sẽ', 'đã', 'đang', 'khách',
  'hàng', 'người', 'online', 'web', 'website', 'trang', 'bán', 'cần', 'như', 'nào', 'gì', 'hoặc', 'hay', 'nhé', 'ạ',
]);
// Letters only Vietnamese uses among Latin-script languages: their presence switches to syllable mode.
const _VIETNAMESE_LETTERS = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

// Used when the description doesn't give us enough to work with.
const _FALLBACK_KEYWORDS = ['products', 'collections', 'orders'];
const _MAX_KEYWORDS = 4;

// [Pure] "Nước hoa" -> "nuoc-hoa"; anything with no Latin letters left (e.g. Chinese) comes back empty.
function _toSlug(word: string) {
  return _.trim(
    word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    '-',
  );
}

// [Pure] "perfume-oils" -> "PerfumeOils" / "perfumeOils".
function _toPascalCase(slug: string) {
  return _.upperFirst(_.camelCase(slug));
}

// [Pure] Keeps a value safe inside the single-quoted strings of the script.
function _quote(text: string) {
  return `'${text.replace(/'/g, '’')}'`;
}

// [Pure] The words in `text` most worth turning into code, as slugs, in the order they first appear
// (people tend to lead with what matters). English: long-ish words that aren't filler. Vietnamese writes
// every syllable apart ("xe máy" is one word), so there it's the runs of syllables left between filler
// words and punctuation, up to three syllables long: "thuê xe máy" -> "thue-xe-may".
function _extractKeywords(text: string) {
  if (_VIETNAMESE_LETTERS.test(text)) {
    const runs = text.toLowerCase().split(/[^\p{L}\p{N}\s]+/u).flatMap(chunk => (
      _.reduce(chunk.split(/\s+/), (phrases: string[][], syllable) => {
        if (!syllable || _VIETNAMESE_STOPWORDS.has(syllable)) {
          return [...phrases, []];
        }
        const current = _.last(phrases) || [];
        return [...phrases.slice(0, -1), [...current, syllable]];
      }, [[]])
    ));
    const phrases = runs.filter(run => run.length >= 2).map(run => _toSlug(run.slice(0, 3).join(' ')));
    return _.uniq(phrases.filter(slug => slug.length >= 3));
  }
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
  const candidates = words
    .filter(word => word.length >= 4 && word.length <= 24 && !_STOPWORDS.has(word.toLowerCase()))
    .map(_toSlug)
    .filter(slug => slug.length >= 3);
  return _.uniq(candidates);
}

// [Pure] The script's lines, from the project and the build in progress (if any).
function getBuildConsoleLines(project: Pick<Project, 'name' | 'description' | 'bootstrap_data'>, build?: DevenvBuild | null) {
  const description = _.toString(project.description || _.get(project, 'bootstrap_data.description') || '');
  const siteKinds: string[] = _.filter(_.castArray(_.get(project, 'bootstrap_data.site_kinds') || []), _.isString);
  const keywords = _.uniq([..._extractKeywords(`${description} ${siteKinds.join(' ')}`), ..._FALLBACK_KEYWORDS]).slice(0, _MAX_KEYWORDS);
  const [main, second, third] = keywords;
  const Main = _toPascalCase(main);
  const mainVar = _.camelCase(main);
  // First sentence of the description, short enough for a tagline.
  const tagline = _.truncate(_.trim(_.first(description.split(/(?<=[.!?。！？])\s*/)) || project.name), { length: 64 });

  // Optional lines come out as false/null/undefined and are dropped; '' is a deliberate blank line.
  const lines = [
    `// building ${project.name}`,
    build?.summary && `// now: ${build.summary}`,
    `import { Header, Hero, ${Main}Grid, Footer } from './components'`,
    `import { get${Main} } from './lib/catalog'`,
    '',
    'export const site = {',
    `  name: ${_quote(project.name)},`,
    `  tagline: ${_quote(tagline)},`,
    !_.isEmpty(siteKinds) && `  kinds: [${siteKinds.map(_quote).join(', ')}],`,
    '}',
    '',
    'export default async function HomePage() {',
    `  const ${mainVar} = await get${Main}({ featured: true, limit: 6 })`,
    '  return (',
    '    <Layout title={site.name}>',
    '      <Hero heading={site.name} subheading={site.tagline} cta="Explore" />',
    `      <${Main}Grid items={${mainVar}} columns={3} />`,
    `      <${_toPascalCase(second)}Spotlight />`,
    '    </Layout>',
    '  )',
    '}',
    '✓ compiled / in 412ms',
    '',
    `// ${main}: search, filters, details`,
    `export async function find${Main}({ search, ${_.camelCase(second)} }) {`,
    `  return db.${mainVar}.findMany({`,
    '    where: { name: { contains: search } },',
    `    include: { ${_.camelCase(second)}: true, ${_.camelCase(third)}: true },`,
    '    orderBy: { createdAt: \'desc\' },',
    '  })',
    '}',
    `→ migrating database: ${keywords.join(', ')}, orders`,
    `✓ ${keywords.length + 1} tables ready`,
    '',
    `/* ${project.name}: brand colors */`,
    '.hero {',
    '  display: grid;',
    '  place-items: center;',
    '  min-height: 72vh;',
    '  background: linear-gradient(160deg, var(--brand), var(--brand-deep));',
    '}',
    `.${main}-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }`,
    '✓ styles optimized (18 KB)',
    '',
    '// contact form, straight to your inbox',
    'export function ContactForm() {',
    `  const form = useForm({ fields: ['name', 'phone', 'message'], subject: ${_quote(`${project.name} enquiry`)} })`,
    '  return <Form {...form} onSubmit={sendToOwner} submitLabel="Send" />',
    '}',
    `→ wiring routes: /, /${main}, /${main}/[slug], /${second}, /contact`,
    `✓ compiled /${main} in 284ms`,
    `✓ ${main} photos resized for phones and laptops`,
    '→ checking every page on mobile…',
    '✓ all good',
    '',
  ];
  return lines.filter((line): line is string => _.isString(line));
}

export {
  getBuildConsoleLines,
};
