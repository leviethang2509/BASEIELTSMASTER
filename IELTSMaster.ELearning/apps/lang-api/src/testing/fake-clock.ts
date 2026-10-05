/** Chỉ giả `Date`: jsonwebtoken cần nextTick/setImmediate thật. */
export function fakeDate(now: Date | string) {
  jest.useFakeTimers({
    now: new Date(now),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'queueMicrotask',
    ],
  });
}
