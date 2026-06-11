export const QUOTES = [
  'Just do one thing.',
  'Future you will be grateful.',
  'Five minutes is enough.',
  'Done beats perfect.',
  'Start ugly.',
  'One step is still progress.',
  'You only need to start.',
  'Small counts.',
  'Good enough is good.',
  'Rest is allowed too.',
];

export function getRandomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
