import type { Schema, Type } from '@google/genai' with {
  'resolution-mode': 'import',
};
import {
  AI_FORMAT_MAX_ATTEMPTS,
  INDICATOR_KINDS,
  QUESTION_TYPES,
} from '@lang/exam-core';

// Prompt cho "Định dạng bằng AI" (req-5 plan 4.3). Viết bằng tiếng Anh cho khớp
// thuật ngữ đề IELTS; phản hồi lỗi (`describeAttemptForAi`) là tiếng Việt, model
// đọc được cả hai. Đổi prompt thì chạy lại các đề mẫu ở Step 5.

const OPS = [
  'indicator',
  'choices',
  'pairs',
  'numbered',
  'blank',
  'removeText',
  'removeBlocks',
  'split',
] as const;

/** Prompt hệ thống: cố định trong code, không sửa trên giao diện (plan 1.6). */
export const AI_FORMAT_SYSTEM_PROMPT = `You structure an exam section that a teacher pasted into an exam editor as plain text. You do NOT rewrite the text: you return a list of operations that the server applies to the original blocks.

# Input
The section is a list of blocks, one per line: [i] tag (note): "text"
- i: index of the block in the ORIGINAL section. Every operation refers to these indices.
- tag: p, h1..h6, blockquote, list-disc / list-decimal (list items), todo (checkbox option), pair, ordering (numbered item), indicator, table, img, audio, video...
- text: the block text as a JSON string. A table is shown as its cells joined by " | ". Media blocks (img, audio, video, hr) have no text; they can never be converted or removed.
- note: details of blocks that are already structured (indicator parameters, existing answers, existing blanks). Keep what is already correct and add only what is missing: never convert a pair / todo / ordering block again, unless it is wrong. A block with blanks=[...] already has its blanks (their text is the answer, shown inside the block text): never blank other words of that block.
Text pasted from a PDF often merges several lines into one block (e.g. "15 ... 16 ... 17 ...", "A option B option") or breaks one sentence over two blocks. See "Splitting merged lines".
If the section is already structured correctly, return an empty list {"ops":[]}.

# Splitting merged lines
{"op":"split","block":i,"at":["<start of 2nd piece>","<start of 3rd piece>",...]} cuts block i right before each "at" text (searched in order, each after the previous cut). Nothing is added or removed: the pieces joined together are the original text.
- Each "at" is the first few words of a NEW piece (the 2nd, 3rd... piece), never the start of the block itself. Example: block [43] "A first option. B second option. C third option." → {"op":"split","block":43,"at":["B second","C third"]} → pieces 43 "A first option. ", 43.1 "B second option. ", 43.2 "C third option."
- The pieces are referred to as i (first piece), i.1, i.2 ... (up to i.9) in EVERY other operation, e.g. "blocks":[43,43.1,43.2]. Never refer to i.1 of a block you did not split.
- Split whenever one block holds several questions, statements, options or matching items, so that each one becomes its own block: "A of the speeds... B seismic waves..." → split at "B seismic"; "15 The ... 16 A major ..." → split at "16 A major". Also split off text that does not belong to the item (an instruction sentence before option A, the start of an option list after the last statement).
- "at" must be copied exactly from the block, start with the item's own number or letter, and never be the very beginning of the block.

# Structure: indicators
An indicator is a marker inserted BEFORE a block: {"op":"indicator","before":i,"kind":...}. Use before = (number of blocks) to insert at the very end. Everything after an indicator up to the next indicator belongs to it.
- part: a large division with its own material, e.g. "SECTION 1", "READING PASSAGE 2", "PART 3", "WRITING TASK 1". The blocks after it (reading passage, audio, picture, shared text) are the part's material.
- subpart: a group of questions sharing instructions, e.g. "Questions 1-5" + "Choose the correct letter, A, B or C." The blocks after it are the instructions (including a shared option list or a "List of Headings").
- question: the start of one question, with "qtype". The blocks after it are the question's content. One question indicator may hold several numbered items (all statements of a TFNG group, all gaps of a note completion...).
- explanation: inserted right after a question's content when the source gives an explanation for that question; the explanation text follows it.
Question numbers are assigned automatically from the structure. Keep the original numbers in the text; do not turn them into blanks.

# Question types ("qtype" of a question indicator)
- mc-single: one question with options. The stem stays a normal block; the option blocks become checkboxes: {"op":"choices","blocks":[...],"correct":[the correct block]}.
- mc-multi: like mc-single but several correct options that must all be chosen (scores as one question).
- pick-n: "Choose TWO/THREE letters" → indicator with "maxPicks" (2, 3...) + choices with exactly maxPicks correct blocks. Each correct option scores as one question, so the numbers of the group (e.g. "Questions 21-22") are covered by one pick-n question.
- tfng: True / False / Not Given. Each statement block becomes a pair: {"op":"pairs","blocks":[...],"answers":["TRUE","FALSE","NOT GIVEN",...]}. One question indicator for the whole group.
- ynng: Yes / No / Not Given, same as tfng with "YES"/"NO"/"NOT GIVEN".
- matching: matching headings / information / features / sentence endings, and "which person / which place" questions answered with a letter from a list. Each item to match becomes a pair whose answer is an option label; the indicator gets "options" = every label of the option list in order, distractors included (e.g. ["A","B","C","D","E","F"] or ["i","ii","iii","iv","v"]). The option list itself stays as normal blocks (usually in the subpart instructions or right before the items).
- fill-blank: sentence / summary / note / form / table / flow-chart completion and short answers. Each gap becomes a blank: {"op":"blank","block":i,"match":"<the exact gap characters>","answer":"<answer or empty>"}. Each blank scores as one question and shows its own question number; one indicator can cover all the gaps of a completion task. A gap is shown as dots or underscores ("……….", "________"): match the dots/underscores together with the question number glued to them ("27………", "(5) ......"), but not a number that starts the sentence ("12 One measure ... ………" → match only "………"). Short-answer questions use the gap printed after the question.
  Never invent a gap that is not in the text and never blank whitespace. When the gaps are only in a picture that is not in the text (e.g. "Label the diagram"), do not add a question indicator for that task; leave its instructions as normal blocks.
- ordering: items to put in the correct order → {"op":"numbered","blocks":[...],"nums":[position of each block, 1..n, or null when unknown]}.
- polytomous: a list where each item has a weight/score → numbered with the weights.
- writing: a writing task (IELTS Writing Task 1/2). Indicator with "maxChars": use the limit stated in the text, otherwise 1500 for Task 1 and 2500 for Task 2. The task text is the question content.
- speaking: a speaking question or cue card. Indicator with "seconds": use the time stated, otherwise 60 for Part 1 / Part 3 questions and 120 for a Part 2 cue card. Usually one speaking question per spoken question.

# Answers
- Fill answers ONLY when the text provides them: an answer key, "Answer: B" after a question, marked options. NEVER solve the exam yourself. When no answer is given, leave it empty: one "" per block in answers, "" as blank answer, [] in correct, null in nums. Missing answers are fine; the teacher adds them later.
- TFNG answers: "TRUE" / "FALSE" / "NOT GIVEN"; YNNG: "YES" / "NO" / "NOT GIVEN"; matching: the option label exactly as in "options".
- An answer key that lists several answers for one group ("8-11 A, C, E, G") ticks every listed option.
- An answer key at the end of the section ("Answer key", "1 TRUE 2 FALSE 3 B ...") is removed with removeBlocks after you used it. An inline answer such as "Answer: B" is removed with removeText.
- removeBlocks may also remove printed blank answer sheets and boxes "for examiner / marker use only" (candidate number grids, score boxes) that contain no question or instruction. Remove nothing else.

# Text rules
- You cannot add or rewrite text. Allowed: insert indicators, split a block into lines, convert blocks (choices / pairs / numbered), turn an exact substring into a blank, remove an exact substring (removeText), remove whole blocks (removeBlocks).
- Keep everything else: titles, instructions, passages, examples, marking criteria and text you do not understand stay as normal blocks.
- "match" must be copied EXACTLY from the block's JSON string: same characters, spaces, quotes and punctuation. It must lie inside one paragraph or one table cell, never across " | ".
- When the same text appears several times in a block, add "occurrence" (1 = first).
- A block (or a piece of a split block) can be used by only one of choices / pairs / numbered / removeBlocks. blank and removeText can be combined with each other and with a conversion of the same block.
- Never convert or remove media, table or indicator blocks (a blank inside a table cell is fine).

# Operations
- {"op":"indicator","before":i,"kind":"part|subpart|question|explanation","qtype"?,"maxPicks"?,"options"?,"maxChars"?,"seconds"?}
- {"op":"choices","blocks":[i,...],"correct":[i,...]}
- {"op":"pairs","blocks":[i,...],"answers":["...",...]} (one answer per block, same order)
- {"op":"numbered","blocks":[i,...],"nums":[n|null,...]}
- {"op":"blank","block":i,"match":"...","occurrence"?:n,"answer":"..."}
- {"op":"removeText","block":i,"match":"...","occurrence"?:n}
- {"op":"removeBlocks","from":i,"to":j} (inclusive)
- {"op":"split","block":i,"at":["...",...]} (i is an original block; its pieces are i, i.1, i.2...)

# Output
Return only JSON {"ops":[...]} with the operations in document order. Indices i are integers; pieces of split blocks are written i.1, i.2... Omit fields an operation does not use (or set them to null).`;

export interface AiFormatPromptContext {
  /** Tên loại đề, vd. "IELTS Academic". */
  blueprint: string | null;
  /** Tên module của section, vd. "Reading". */
  module: string | null;
  /** Ô "Ghi chú cho AI" của người dùng. */
  note: string | null;
  /** `formatAiBlocks(toAiBlocks(value))`. */
  blocks: string;
  blockCount: number;
}

/** Prompt lần gọi đầu: loại đề / module + ghi chú + danh sách block (plan 1.6). */
export function buildAiFormatPrompt(context: AiFormatPromptContext): string {
  const lines: string[] = [];
  if (context.blueprint) lines.push(`Exam type: ${context.blueprint}`);
  if (context.module) lines.push(`Module of this section: ${context.module}`);
  if (context.note) {
    lines.push(
      "Teacher's note (follow it unless it breaks the rules):",
      context.note,
    );
  }
  lines.push('', `Section (${context.blockCount} blocks):`, context.blocks);
  return lines.join('\n');
}

/**
 * Prompt sửa lỗi (lần 2..`AI_FORMAT_MAX_ATTEMPTS`): các dòng của
 * `describeAttemptForAi`. Thao tác luôn áp lại trên nội dung gốc (giả định 2)
 * nên AI phải trả lại **toàn bộ** danh sách.
 */
export function buildAiRetryPrompt(
  problems: readonly string[],
  attempt: number,
): string {
  return [
    `Your operations were applied to the ORIGINAL section (attempt ${attempt}/${AI_FORMAT_MAX_ATTEMPTS}) with these problems:`,
    ...problems.map((line) => `- ${line}`),
    '',
    'Return the COMPLETE corrected list of operations for the original blocks (not only the fixes, splits included), in the same JSON format. Block indices still refer to the original section; pieces of split blocks are i.1, i.2...',
  ].join('\n');
}

/** Phản hồi khi câu trả lời không đọc được thành JSON. */
export const AI_INVALID_JSON = 'Kết quả không phải JSON hợp lệ.';
export const AI_TRUNCATED =
  'Kết quả bị cắt vì quá dài: bỏ các trường null, không lặp lại thao tác.';

// Giá trị của enum `Type` (SDK là ESM nên không import giá trị được).
const T = {
  STRING: 'STRING' as Type,
  NUMBER: 'NUMBER' as Type,
  INTEGER: 'INTEGER' as Type,
  ARRAY: 'ARRAY' as Type,
  OBJECT: 'OBJECT' as Type,
};

const nullable = (schema: Schema): Schema => ({ ...schema, nullable: true });
// Chỉ số block là số: `i` hoặc phần `i.k` của block đã `split`.
const ref: Schema = { type: T.NUMBER };
const refList: Schema = { type: T.ARRAY, items: ref };

/**
 * Schema JSON của câu trả lời: object phẳng có trường tuỳ chọn thay cho union
 * (`parseAiOps` phân loại theo `op` và bỏ trường `null`).
 */
export const AI_FORMAT_RESPONSE_SCHEMA: Schema = {
  type: T.OBJECT,
  required: ['ops'],
  properties: {
    ops: {
      type: T.ARRAY,
      items: {
        type: T.OBJECT,
        required: ['op'],
        propertyOrdering: [
          'op',
          'before',
          'kind',
          'qtype',
          'maxPicks',
          'options',
          'maxChars',
          'seconds',
          'blocks',
          'correct',
          'answers',
          'nums',
          'block',
          'match',
          'occurrence',
          'answer',
          'from',
          'to',
          'at',
        ],
        properties: {
          op: { type: T.STRING, enum: [...OPS] },
          before: nullable(ref),
          kind: nullable({ type: T.STRING, enum: [...INDICATOR_KINDS] }),
          qtype: nullable({
            type: T.STRING,
            enum: QUESTION_TYPES.map((meta) => meta.qtype),
          }),
          maxPicks: nullable({ type: T.INTEGER }),
          options: nullable({
            type: T.ARRAY,
            items: { type: T.STRING },
          }),
          maxChars: nullable({ type: T.INTEGER }),
          seconds: nullable({ type: T.INTEGER }),
          blocks: nullable(refList),
          correct: nullable(refList),
          answers: nullable({ type: T.ARRAY, items: { type: T.STRING } }),
          nums: nullable({
            type: T.ARRAY,
            items: { type: T.NUMBER, nullable: true },
          }),
          block: nullable(ref),
          match: nullable({ type: T.STRING }),
          occurrence: nullable({ type: T.INTEGER }),
          answer: nullable({ type: T.STRING }),
          from: nullable(ref),
          to: nullable(ref),
          at: nullable({ type: T.ARRAY, items: { type: T.STRING } }),
        },
      },
    },
  },
};
