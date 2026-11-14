#!/usr/bin/env node
/* Builds assets/texts/aeneid-dryden.json from Project Gutenberg's plain text of Dryden's Aeneid
   (ebook #228, https://www.gutenberg.org/ebooks/228). Dryden's translation (1697) is in the
   public domain; the Gutenberg header, licence and trademark text are not copied.

     node tools/build_aeneid_text.cjs path/to/pg228.txt

   Output: {"source": …, "books": [[line, …] × 12]}. Each book's prose "Argument" is dropped, so
   line 1 of a book is its first line of verse. The numbering is a plain count of Dryden's
   verse lines in this text; it is not Virgil's Latin numbering. */
const fs = require('fs'), path = require('path');
const input = process.argv[2];
if (!input) { console.error('usage: node tools/build_aeneid_text.cjs path/to/pg228.txt'); process.exit(2); }

const text = fs.readFileSync(input, 'utf8').replace(/\r\n/g, '\n');
const start = text.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK'), end = text.indexOf('*** END OF THE PROJECT GUTENBERG EBOOK');
if (start < 0 || end < 0) throw new Error('Gutenberg start/end markers not found');
const lines = text.slice(start, end).split('\n');

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
// A book begins at a line that is exactly " BOOK <numeral>" (the contents list is indented further).
const heads = NUMERALS.map(n => { const i = lines.findIndex(l => l === ` BOOK ${n}`); if (i < 0) throw new Error(`BOOK ${n} not found`); return i; });

const books = heads.map((head, b) => {
  const body = lines.slice(head + 1, b < 11 ? heads[b + 1] : lines.length);
  const argument = body.findIndex(l => l.trim() === 'THE ARGUMENT.');
  if (argument < 0) throw new Error(`BOOK ${NUMERALS[b]} has no argument`);
  // Skip the blank lines after the heading, then the argument's own paragraph.
  let i = argument + 1;
  while (i < body.length && body[i].trim() === '') i++;
  while (i < body.length && body[i].trim() !== '') i++;
  // Verse always begins with a capital. A line that does not is the tail of a long line the
  // edition wrapped, so it rejoins the line before it (three in the whole poem).
  const verse = [];
  for (const line of body.slice(i).map(l => l.trim()).filter(Boolean)) {
    if (/^[a-z]/.test(line) && verse.length) verse[verse.length - 1] += ' ' + line; else verse.push(line);
  }
  return verse;
});

for (const [b, verse] of books.entries()) {
  if (verse.length < 700 || verse.length > 1500) throw new Error(`BOOK ${NUMERALS[b]} has ${verse.length} lines`);
  for (const line of verse) if (line.length > 96 || line.length < 20 || /Gutenberg|ARGUMENT|^BOOK /.test(line)) throw new Error(`unexpected line in BOOK ${NUMERALS[b]}: ${line}`);
}
if (!books[0][0].startsWith('Arms, and the man I sing')) throw new Error('Book I does not open with the first line');
if (!books[11].at(-1).startsWith('And the disdainful soul')) throw new Error('Book XII does not close with the last line');

const out = path.join(__dirname, '..', 'assets', 'texts', 'aeneid-dryden.json');
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify({source: 'Virgil, Aeneid, translated by John Dryden (1697). Text from Project Gutenberg ebook #228. Public domain.', books}) + '\n');
console.log(`wrote ${path.relative(process.cwd(), out)}: ${books.map(b => b.length).join(' + ')} = ${books.reduce((n, b) => n + b.length, 0)} lines`);
