/**
 * Tests for background.js recurring event logic.
 *
 * Coverage:
 *  - calculateNextOccurrence (daily / weekly / weekly-multi / monthly / yearly / unknown)
 *  - advanceToFuture (stale snoozeTime after browser was closed for days)
 *  - openSnoozedTab: creates next instance and removes current
 *  - Race condition: two recurring alarms fire simultaneously → both next instances survive
 *  - checkAndOpenSnoozedTabs: opens overdue tabs, reschedules future ones
 */

const bg = require('../background.js');
const {
  calculateNextOccurrence,
  advanceToFuture,
  openSnoozedTab,
  createRecurringInstance,
  checkAndOpenSnoozedTabs,
  getSnoozedTabs,
} = bg;

const SNOOZED_KEY = 'snoozedTabs';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeTab(overrides = {}) {
  return { url: 'https://example.com', title: 'Example', favIconUrl: '', ...overrides };
}

function snoozeAt(ms, overrides = {}) {
  return {
    id: 'test-id',
    url: 'https://example.com',
    title: 'Example',
    favIconUrl: '',
    snoozeTime: ms,
    createdAt: ms - 1000,
    ...overrides,
  };
}

function recurringSnooze(ms, pattern, overrides = {}) {
  return snoozeAt(ms, {
    recurring: true,
    recurrencePattern: pattern,
    seriesId: 'series-1',
    instanceNumber: 1,
    ...overrides,
  });
}

async function seedStorage(tabs) {
  await browser.storage.local.set({ [SNOOZED_KEY]: tabs });
}

// Freeze Date.now() to a known value so relative assertions are stable.
function mockNow(ms) {
  jest.spyOn(Date, 'now').mockReturnValue(ms);
}

// ─── setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  __resetBrowserMock();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ════════════════════════════════════════════════════════════════════════════
// calculateNextOccurrence
// ════════════════════════════════════════════════════════════════════════════

describe('calculateNextOccurrence', () => {
  // Use a fixed reference: Monday 2024-01-08 09:00:00 local
  const MON_9AM = new Date('2024-01-08T09:00:00').getTime();

  test('daily: returns exactly 24 hours later at the same clock time', () => {
    const next = calculateNextOccurrence(MON_9AM, { frequency: 'daily' });
    const nextDate = new Date(next);
    const origDate = new Date(MON_9AM);
    expect(nextDate.getDate()).toBe(origDate.getDate() + 1);
    expect(nextDate.getHours()).toBe(origDate.getHours());
    expect(nextDate.getMinutes()).toBe(origDate.getMinutes());
  });

  test('weekly: finds the next matching day of the week', () => {
    // MON_9AM is a Monday (day 1). Ask for Wednesday (3) next.
    const next = calculateNextOccurrence(MON_9AM, { frequency: 'weekly', daysOfWeek: [3] });
    const nextDate = new Date(next);
    expect(nextDate.getDay()).toBe(3); // Wednesday
    expect(nextDate.getHours()).toBe(9);
  });

  test('weekly: skips to the correct day when multiple days are selected', () => {
    // Monday → next selected day in [2 (Tue), 5 (Fri)] should be Tuesday
    const next = calculateNextOccurrence(MON_9AM, { frequency: 'weekly', daysOfWeek: [2, 5] });
    const nextDate = new Date(next);
    expect(nextDate.getDay()).toBe(2); // Tuesday
  });

  test('weekly: returns null when daysOfWeek is empty', () => {
    const next = calculateNextOccurrence(MON_9AM, { frequency: 'weekly', daysOfWeek: [] });
    expect(next).toBeNull();
  });

  test('monthly: moves to the same day next month', () => {
    const jan15 = new Date('2024-01-15T09:00:00').getTime();
    const next = calculateNextOccurrence(jan15, { frequency: 'monthly', dayOfMonth: 15 });
    const nextDate = new Date(next);
    expect(nextDate.getMonth()).toBe(1); // February
    expect(nextDate.getDate()).toBe(15);
    expect(nextDate.getHours()).toBe(9);
  });

  test('monthly: clamps to last day of shorter month (Jan 31 → Feb 28/29)', () => {
    const jan31 = new Date('2024-01-31T09:00:00').getTime();
    const next = calculateNextOccurrence(jan31, { frequency: 'monthly', dayOfMonth: 31 });
    const nextDate = new Date(next);
    expect(nextDate.getMonth()).toBe(1); // February
    // 2024 is a leap year, so Feb has 29 days; 31 clamps to 29
    expect(nextDate.getDate()).toBe(29);
  });

  test('yearly: advances to next year, same month and day', () => {
    const mar5 = new Date('2024-03-05T09:00:00').getTime();
    const next = calculateNextOccurrence(mar5, { frequency: 'yearly', month: 2, dayOfMonth: 5 });
    const nextDate = new Date(next);
    expect(nextDate.getFullYear()).toBe(2025);
    expect(nextDate.getMonth()).toBe(2); // March
    expect(nextDate.getDate()).toBe(5);
  });

  test('yearly: clamps Feb 29 to Feb 28 on non-leap years', () => {
    const leap = new Date('2024-02-29T09:00:00').getTime();
    const next = calculateNextOccurrence(leap, { frequency: 'yearly', month: 1, dayOfMonth: 29 });
    const nextDate = new Date(next);
    expect(nextDate.getFullYear()).toBe(2025);
    expect(nextDate.getMonth()).toBe(1); // February
    expect(nextDate.getDate()).toBe(28); // clamped
  });

  test('unknown frequency: returns null', () => {
    expect(calculateNextOccurrence(MON_9AM, { frequency: 'hourly' })).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// advanceToFuture
// ════════════════════════════════════════════════════════════════════════════

describe('advanceToFuture', () => {
  test('returns the time unchanged when it is already in the future', () => {
    const futureTime = Date.now() + 10 * 60 * 1000; // 10 min from now
    const result = advanceToFuture(futureTime, { frequency: 'daily' });
    expect(result).toBe(futureTime);
  });

  test('advances a daily event that is 1 day in the past to a future time', () => {
    const yesterday9am = Date.now() - 23 * 60 * 60 * 1000; // ~1 day ago
    const result = advanceToFuture(yesterday9am, { frequency: 'daily' });
    expect(result).toBeGreaterThan(Date.now());
  });

  test('advances a daily event that is multiple days in the past to a future time', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const result = advanceToFuture(threeDaysAgo, { frequency: 'daily' });
    expect(result).toBeGreaterThan(Date.now());
  });

  test('returns null when the pattern is broken (e.g. empty daysOfWeek)', () => {
    const past = Date.now() - 60 * 1000;
    const result = advanceToFuture(past, { frequency: 'weekly', daysOfWeek: [] });
    expect(result).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// openSnoozedTab — single recurring event
// ════════════════════════════════════════════════════════════════════════════

describe('openSnoozedTab – recurring daily', () => {
  const NOW = new Date('2024-03-10T09:00:00').getTime();
  const PATTERN = { frequency: 'daily' };

  beforeEach(() => {
    mockNow(NOW);
  });

  test('opens the tab', async () => {
    const snooze = recurringSnooze(NOW - 1000, PATTERN);
    await seedStorage({ 'snooze-1': snooze });
    await openSnoozedTab('snooze-1');
    expect(browser.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: snooze.url })
    );
  });

  test('removes the current instance from storage', async () => {
    const snooze = recurringSnooze(NOW - 1000, PATTERN);
    await seedStorage({ 'snooze-1': snooze });
    await openSnoozedTab('snooze-1');
    const store = __getLocalStore();
    const tabs = store[SNOOZED_KEY];
    expect(tabs['snooze-1']).toBeUndefined();
  });

  test('creates a new next instance in storage', async () => {
    const snooze = recurringSnooze(NOW - 1000, PATTERN);
    await seedStorage({ 'snooze-1': snooze });
    await openSnoozedTab('snooze-1');
    const store = __getLocalStore();
    const tabs = store[SNOOZED_KEY];
    const remainingIds = Object.keys(tabs);
    expect(remainingIds.length).toBe(1);
    const next = tabs[remainingIds[0]];
    expect(next.recurring).toBe(true);
    expect(next.snoozeTime).toBeGreaterThan(NOW);
  });

  test('schedules an alarm for the next instance', async () => {
    const snooze = recurringSnooze(NOW - 1000, PATTERN);
    await seedStorage({ 'snooze-1': snooze });
    await openSnoozedTab('snooze-1');
    const alarms = __getAlarms();
    const alarmNames = Object.keys(alarms);
    expect(alarmNames.some(n => n.startsWith('snooze-'))).toBe(true);
  });

  test('does not reschedule when endDate has been reached', async () => {
    const endDate = NOW - 1; // already past
    const pattern = { frequency: 'daily', endDate };
    const snooze = recurringSnooze(NOW - 1000, pattern);
    await seedStorage({ 'snooze-1': snooze });
    await openSnoozedTab('snooze-1');
    const tabs = __getLocalStore()[SNOOZED_KEY];
    expect(Object.keys(tabs).length).toBe(0);
  });

  test('does nothing when snoozeId is not found in storage', async () => {
    await seedStorage({});
    await openSnoozedTab('ghost-id');
    expect(browser.tabs.create).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Race condition: two recurring alarms firing simultaneously
// ════════════════════════════════════════════════════════════════════════════

describe('race condition – two concurrent openSnoozedTab calls', () => {
  const NOW = new Date('2024-03-10T09:00:00').getTime();
  const PATTERN = { frequency: 'daily' };

  beforeEach(() => {
    mockNow(NOW);
  });

  test('both next instances are preserved when two alarms fire simultaneously', async () => {
    // This replicates the chess + geoguessr scenario:
    // both are scheduled at the same time, both alarms fire together.
    const chess = recurringSnooze(NOW - 100, PATTERN, { url: 'https://chess.com', title: 'Chess', id: 'chess-1' });
    const geo = recurringSnooze(NOW - 100, PATTERN, { url: 'https://geoguessr.com', title: 'Geo', id: 'geo-1' });

    await seedStorage({ 'chess-1': chess, 'geo-1': geo });

    // Fire both concurrently — simulating two alarms firing at the same time
    // WITHOUT the fix, the second write overwrites the first and one next-instance is lost.
    await Promise.all([
      openSnoozedTab('chess-1'),
      openSnoozedTab('geo-1'),
    ]);

    const tabs = __getLocalStore()[SNOOZED_KEY];
    const ids = Object.keys(tabs);

    // Both current instances should be gone
    expect(tabs['chess-1']).toBeUndefined();
    expect(tabs['geo-1']).toBeUndefined();

    // Both next instances must exist
    expect(ids.length).toBe(2);

    const urls = ids.map(id => tabs[id].url);
    expect(urls).toContain('https://chess.com');
    expect(urls).toContain('https://geoguessr.com');
  });

  test('both tabs are opened when two alarms fire simultaneously', async () => {
    const chess = recurringSnooze(NOW - 100, PATTERN, { url: 'https://chess.com', title: 'Chess', id: 'chess-1' });
    const geo = recurringSnooze(NOW - 100, PATTERN, { url: 'https://geoguessr.com', title: 'Geo', id: 'geo-1' });

    await seedStorage({ 'chess-1': chess, 'geo-1': geo });

    await Promise.all([
      openSnoozedTab('chess-1'),
      openSnoozedTab('geo-1'),
    ]);

    const createdUrls = browser.tabs.create.mock.calls.map(c => c[0].url);
    expect(createdUrls).toContain('https://chess.com');
    expect(createdUrls).toContain('https://geoguessr.com');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// checkAndOpenSnoozedTabs
// ════════════════════════════════════════════════════════════════════════════

describe('checkAndOpenSnoozedTabs', () => {
  const NOW = new Date('2024-03-10T12:00:00').getTime();

  beforeEach(() => {
    mockNow(NOW);
  });

  test('opens overdue tabs', async () => {
    const overdue = snoozeAt(NOW - 5000);
    await seedStorage({ 'old-1': overdue });
    await checkAndOpenSnoozedTabs();
    expect(browser.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: overdue.url })
    );
  });

  test('recreates alarms for future tabs without opening them', async () => {
    const future = snoozeAt(NOW + 60 * 60 * 1000); // 1 hour from now
    await seedStorage({ 'future-1': future });
    await checkAndOpenSnoozedTabs();
    expect(browser.tabs.create).not.toHaveBeenCalled();
    expect(browser.alarms.create).toHaveBeenCalledWith(
      'snooze-future-1',
      expect.objectContaining({ when: future.snoozeTime })
    );
  });

  test('handles a mix of overdue and future tabs', async () => {
    const overdue = snoozeAt(NOW - 1000, { url: 'https://overdue.example.com' });
    const future = snoozeAt(NOW + 1000, { url: 'https://future.example.com' });
    await seedStorage({ 'old-1': overdue, 'new-1': future });
    await checkAndOpenSnoozedTabs();

    const opened = browser.tabs.create.mock.calls.map(c => c[0].url);
    expect(opened).toContain('https://overdue.example.com');
    expect(opened).not.toContain('https://future.example.com');
  });

  test('handles empty storage gracefully', async () => {
    await seedStorage({});
    await expect(checkAndOpenSnoozedTabs()).resolves.not.toThrow();
    expect(browser.tabs.create).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// stale snoozeTime – browser closed for multiple days
// ════════════════════════════════════════════════════════════════════════════

describe('stale snoozeTime – browser closed for days', () => {
  test('next occurrence is in the future even when snoozeTime is days in the past', async () => {
    const NOW = Date.now();
    mockNow(NOW);

    const threeDaysAgo = NOW - 3 * 24 * 60 * 60 * 1000;
    const snooze = recurringSnooze(threeDaysAgo, { frequency: 'daily' });
    await seedStorage({ 'stale-1': snooze });

    await openSnoozedTab('stale-1');

    const tabs = __getLocalStore()[SNOOZED_KEY];
    const ids = Object.keys(tabs);
    if (ids.length > 0) {
      // The newly created next instance must be scheduled in the future
      expect(tabs[ids[0]].snoozeTime).toBeGreaterThan(NOW);
    }

    // Alarm (if created) must be for a future time
    const alarms = __getAlarms();
    for (const alarm of Object.values(alarms)) {
      expect(alarm.when).toBeGreaterThan(NOW);
    }
  });
});
