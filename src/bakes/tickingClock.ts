/** For tests: a clock that moves on a minute each time it is read, starting 2026-11-20 12:00 UTC. */
export function tickingClock(): () => Date {
  let minute = 0;
  return () => new Date(Date.UTC(2026, 10, 20, 12, minute++));
}
