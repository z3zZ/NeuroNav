/**
 * Study helpers behind the dashboard quick actions.
 *
 * These run entirely on the device and only rearrange the learner's own text;
 * they never add facts. The provider interface keeps room for an optional AI
 * service later without making it a prerequisite.
 */

export interface ToolContext {
  /** Task or topic the learner selected, e.g. "Revise SQL joins". */
  title: string;
  minutes: number;
  /** Source text: a saved note or pasted material. */
  text: string;
  /** Existing flashcards for the selected topic, used by "Quiz me". */
  cards: { front: string; back: string }[];
}

export type ToolId = 'breakdown' | 'quiz' | 'explain' | 'flashcards';

export type ToolResult =
  | { tool: 'breakdown'; steps: string[] }
  | { tool: 'quiz'; questions: { question: string; answer: string }[] }
  | { tool: 'explain'; summary: string; points: string[]; terms: string[] }
  | { tool: 'flashcards'; cards: { front: string; back: string }[] };

export class ToolInputError extends Error {}

export interface ToolProvider {
  id: string;
  label: string;
  /** Plain-language note shown with every result. */
  disclosure: string;
  run(tool: ToolId, ctx: ToolContext): Promise<ToolResult>;
}

const STOPWORDS = new Set(
  'about above after again against because been before being below between both could does doing down during each from further have having here into itself just more most other over same should some such than that their theirs them then there these they this those through under until very were what when where which while will with would your yours also can may might must shall the and for are but not you all any her his its our out has had was one two how who why use used using'.split(
    ' ',
  ),
);

export function sentences(text: string): string[] {
  return (text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()).filter((s) => s.split(' ').length >= 3);
}

function chunks(text: string): string[] {
  return text
    .split(/\n\s*\n|\n(?=#|\d+[.)]\s|[-*•]\s)/)
    .map((c) => c.replace(/^[#\-*•\d.)\s]+/, '').trim())
    .filter((c) => c.length > 20);
}

const firstWords = (s: string, n: number) => {
  const words = s.split(/\s+/);
  return words.length > n ? `${words.slice(0, n).join(' ')}…` : s;
};

export function breakDown(ctx: ToolContext): string[] {
  const parts = chunks(ctx.text);
  if (parts.length >= 2) {
    return [
      'Open your material and read only the first section',
      ...parts.slice(0, 6).map((p) => `Read “${firstWords(p, 8)}” and note one key idea`),
      'Close your notes and write down what you remember',
    ];
  }
  if (!ctx.title.trim()) throw new ToolInputError('Choose a task or topic, or paste some text to break down.');
  const m = Math.max(10, ctx.minutes);
  const read = Math.max(3, Math.round(m * 0.3));
  const recall = Math.max(2, Math.round(m * 0.2));
  const practise = Math.max(3, Math.round(m * 0.3));
  const check = Math.max(2, m - 2 - read - recall - practise);
  return [
    `Get your materials for ${ctx.title} and pick one small part to start with (2 min)`,
    `Read or watch one short section (${read} min)`,
    `Write three key points from memory (${recall} min)`,
    `Try a few practice questions (${practise} min)`,
    `Check your answers and note one thing to revisit (${check} min)`,
  ];
}

const DEFINITION_LINE = /^\s*(?:[-*•]\s*)?(.{2,80}?)\s*(?::|=|\s[-–—]\s)\s*(.{2,})$/;
const IS_SENTENCE = /^(?:an?\s+|the\s+)?([A-Za-z][\w\s'()/-]{1,50}?)\s+(is|are|means|refers to|describes)\s+(.{6,})$/i;

export function makeFlashcards(ctx: ToolContext): { front: string; back: string }[] {
  const cards: { front: string; back: string }[] = [];
  const lines = ctx.text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.endsWith('?') && lines[i + 1] && !lines[i + 1].endsWith('?')) {
      cards.push({ front: line, back: lines[i + 1] });
      i++;
      continue;
    }
    const def = line.match(DEFINITION_LINE);
    if (def) {
      cards.push({ front: def[1].trim(), back: def[2].trim() });
      continue;
    }
    for (const s of sentences(line)) {
      const m = s.match(IS_SENTENCE);
      if (m && m[1].split(' ').length <= 6) cards.push({ front: `What ${m[2].toLowerCase() === 'are' ? 'are' : 'is'} ${m[1].trim()}?`, back: s });
    }
  }

  const seen = new Set<string>();
  const unique = cards.filter((c) => {
    const key = c.front.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!unique.length) {
    throw new ToolInputError(
      'No term and definition pairs found. Try one per line, like “Primary key: a column that uniquely identifies each row”.',
    );
  }
  return unique.slice(0, 30);
}

function keyTerm(sentence: string): string | null {
  const words = sentence.match(/[A-Za-z][A-Za-z-]{4,}/g) ?? [];
  const candidates = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  if (!candidates.length) return null;
  return candidates.reduce((best, w) => (w.length > best.length ? w : best));
}

export function makeQuiz(ctx: ToolContext): { question: string; answer: string }[] {
  if (ctx.cards.length) {
    return [...ctx.cards]
      .sort(() => Math.random() - 0.5)
      .slice(0, 8)
      .map((c) => ({ question: c.front, answer: c.back }));
  }
  const qs = sentences(ctx.text)
    .filter((s) => s.split(' ').length >= 6)
    .map((s) => {
      const term = keyTerm(s);
      if (!term) return null;
      return { question: `Fill the gap: ${s.replace(term, '_____')}`, answer: term };
    })
    .filter((q): q is { question: string; answer: string } => q !== null)
    .slice(0, 8);
  if (!qs.length) {
    throw new ToolInputError('Add flashcards to this topic, or paste a few full sentences, to build a quiz.');
  }
  return qs;
}

export function explainDifferently(ctx: ToolContext) {
  const all = sentences(ctx.text);
  if (all.length < 2) throw new ToolInputError('Paste or choose at least two sentences to rearrange.');
  const points = all.flatMap((s) => (s.split(' ').length > 25 ? s.split(/;\s+|,\s+(?=which|because|so|but|while)/) : [s]));
  const counts = new Map<string, number>();
  for (const w of ctx.text.toLowerCase().match(/[a-z][a-z-]{4,}/g) ?? []) {
    if (!STOPWORDS.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const terms = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
  return { summary: all[0], points: points.map((p) => p.trim()).filter(Boolean), terms };
}

export const localProvider: ToolProvider = {
  id: 'local',
  label: 'On this device',
  disclosure: 'Made on this device by rearranging your own text. Nothing new is added, so check it against your course material.',
  async run(tool, ctx) {
    switch (tool) {
      case 'breakdown':
        return { tool, steps: breakDown(ctx) };
      case 'quiz':
        return { tool, questions: makeQuiz(ctx) };
      case 'explain':
        return { tool, ...explainDifferently(ctx) };
      case 'flashcards':
        return { tool, cards: makeFlashcards(ctx) };
    }
  },
};
