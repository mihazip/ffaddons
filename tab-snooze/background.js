// Storage key for snoozed tabs
const SNOOZED_TABS_KEY = 'snoozedTabs';
const PERIODIC_CHECK_ALARM = 'periodic-check-overdue';
const CHECK_INTERVAL_MINUTES = 2; // Check every 2 minutes for overdue tabs

// Notification queue for bundling
let notificationQueue = [];
let notificationTimer = null;
const NOTIFICATION_BATCH_DELAY = 2000; // 2 seconds to batch notifications

// Initialize periodic check alarm
async function initPeriodicCheck() {
  // Clear any existing periodic alarm
  await browser.alarms.clear(PERIODIC_CHECK_ALARM);

  // Create new periodic alarm to check for overdue tabs
  await browser.alarms.create(PERIODIC_CHECK_ALARM, {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });

  console.log(`Periodic check alarm created (every ${CHECK_INTERVAL_MINUTES} minutes)`);
}

// Initialize extension
browser.runtime.onInstalled.addListener(async () => {
  console.log('Tab Snooze extension installed');
  await initPeriodicCheck();
  await checkAndOpenSnoozedTabs();
});

// Check for snoozed tabs on browser startup
browser.runtime.onStartup.addListener(async () => {
  console.log('Browser started, checking for snoozed tabs');
  await initPeriodicCheck();
  await checkAndOpenSnoozedTabs();
});

// Listen for messages from popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'snoozeTab') {
    await handleSnoozeTab(message.tab, message.snoozeTime);
    return true;
  } else if (message.action === 'snoozeRecurring') {
    await handleSnoozeRecurring(message.tab, message.firstOccurrence, message.recurrencePattern);
    return true;
  } else if (message.action === 'getSnoozedTabs') {
    const tabs = await getSnoozedTabs();
    return Promise.resolve(tabs);
  } else if (message.action === 'unsnoozeTab') {
    await unsnoozeTab(message.snoozeId);
    return true;
  } else if (message.action === 'deleteSnooze') {
    await deleteSnooze(message.snoozeId);
    return true;
  }
});

// Serialize alarm processing so concurrent alarms don't race on storage writes
let alarmProcessingQueue = Promise.resolve();

function queueAlarmProcessing(snoozeId) {
  alarmProcessingQueue = alarmProcessingQueue
    .then(() => openSnoozedTab(snoozeId))
    .catch(err => console.error('Error processing alarm for snooze:', snoozeId, err));
}

// Listen for alarms
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PERIODIC_CHECK_ALARM) {
    // Periodic check for overdue tabs (safety net for missed alarms)
    console.log('Running periodic check for overdue tabs');
    checkAndOpenSnoozedTabs().catch(err => console.error('Error in periodic check:', err));
  } else if (alarm.name.startsWith('snooze-')) {
    // Individual tab alarm - queue to prevent concurrent storage race conditions
    const snoozeId = alarm.name.replace('snooze-', '');
    queueAlarmProcessing(snoozeId);
  }
});

// Queue a notification for a restored tab
function queueNotification(tabTitle, isRecurring, recurrenceFrequency) {
  notificationQueue.push({
    title: tabTitle,
    isRecurring: isRecurring,
    recurrenceFrequency: recurrenceFrequency
  });

  // Reset the timer - we'll wait for all tabs to be queued
  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }

  notificationTimer = setTimeout(() => {
    flushNotificationQueue();
  }, NOTIFICATION_BATCH_DELAY);
}

// Flush the notification queue and show notifications based on mode
async function flushNotificationQueue() {
  if (notificationQueue.length === 0) {
    return;
  }

  // Get notification settings
  const settings = await browser.storage.sync.get({
    unsnoozeNotificationMode: 'individual'
  });

  const mode = settings.unsnoozeNotificationMode;

  if (mode === 'off') {
    // No notifications - just clear the queue
    notificationQueue = [];
    return;
  }

  if (mode === 'bundled') {
    // Show one bundled notification
    const count = notificationQueue.length;
    let message;

    if (count === 1) {
      const tab = notificationQueue[0];
      message = tab.isRecurring
        ? `"${tab.title}" is now open (recurring ${tab.recurrenceFrequency})`
        : `"${tab.title}" is now open`;
    } else {
      message = `${count} tabs have been restored`;
    }

    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/moon-48.png'),
      title: 'Tabs Unsnoozed',
      message: message
    });
  } else {
    // Individual mode - show one notification per tab
    for (const tab of notificationQueue) {
      const message = tab.isRecurring
        ? `"${tab.title}" is now open (recurring ${tab.recurrenceFrequency})`
        : `"${tab.title}" is now open`;

      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/moon-48.png'),
        title: 'Tab Unsnoozed',
        message: message
      });
    }
  }

  // Clear the queue
  notificationQueue = [];
}

// Handle snoozing a tab
async function handleSnoozeTab(tab, snoozeTime) {
  try {
    // Generate unique ID for this snooze
    const snoozeId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get existing snoozed tabs
    const snoozedTabs = await getSnoozedTabs();

    // Add new snooze
    snoozedTabs[snoozeId] = {
      id: snoozeId,
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      snoozeTime: snoozeTime,
      createdAt: Date.now()
    };

// Save to storage (using local for reliability - sync has size limits)
    await browser.storage.local.set({ [SNOOZED_TABS_KEY]: snoozedTabs });

    // Create alarm
    const alarmTime = snoozeTime;
    await browser.alarms.create(`snooze-${snoozeId}`, {
      when: alarmTime
    });

    // Show notification if enabled
    const settings = await browser.storage.sync.get({
      showSnoozeNotification: true
    });

    if (settings.showSnoozeNotification) {
      const snoozeDate = new Date(snoozeTime);
      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/moon-48.png'),
        title: 'Tab Snoozed',
        message: `"${tab.title}" will reopen on ${snoozeDate.toLocaleString()}`
      });
    }

    // Close the tab
    await browser.tabs.remove(tab.id);

    console.log(`Tab snoozed until ${snoozeDate.toLocaleString()}`);
  } catch (error) {
    console.error('Error handling snooze:', error);
  }
}

// Handle snoozing a recurring tab
async function handleSnoozeRecurring(tab, firstOccurrence, recurrencePattern) {
  try {
    // Generate unique series ID for this recurring tab
    const seriesId = `series-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the first instance
    await createRecurringInstance(tab, firstOccurrence, recurrencePattern, seriesId, 1);

    console.log(`Recurring tab scheduled: ${recurrencePattern.frequency}`);
  } catch (error) {
    console.error('Error handling recurring snooze:', error);
  }
}

// Create a recurring instance
async function createRecurringInstance(tab, snoozeTime, recurrencePattern, seriesId, instanceNumber) {
  try {
    // Generate unique ID for this instance
    const snoozeId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get existing snoozed tabs
    const snoozedTabs = await getSnoozedTabs();

    // Add new recurring snooze
    snoozedTabs[snoozeId] = {
      id: snoozeId,
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      snoozeTime: snoozeTime,
      createdAt: Date.now(),
      recurring: true,
      recurrencePattern: recurrencePattern,
      seriesId: seriesId,
      instanceNumber: instanceNumber
    };

    // Save to storage (using local for reliability - sync has size limits)
    await browser.storage.local.set({ [SNOOZED_TABS_KEY]: snoozedTabs });

    // Create alarm
    await browser.alarms.create(`snooze-${snoozeId}`, {
      when: snoozeTime
    });

    // Show notification for first instance only
    if (instanceNumber === 1) {
      const settings = await browser.storage.sync.get({
        showSnoozeNotification: true
      });

      if (settings.showSnoozeNotification) {
        const snoozeDate = new Date(snoozeTime);
        browser.notifications.create({
          type: 'basic',
          iconUrl: browser.runtime.getURL('icons/moon-48.png'),
          title: 'Recurring Tab Snoozed',
          message: `"${tab.title}" will reopen ${recurrencePattern.frequency} starting ${snoozeDate.toLocaleString()}`
        });
      }

      // Close the tab only on first instance
      await browser.tabs.remove(tab.id);
    }

    console.log(`Recurring instance ${instanceNumber} scheduled for ${new Date(snoozeTime).toLocaleString()}`);
  } catch (error) {
    console.error('Error creating recurring instance:', error);
  }
}

// Advance a calculated next time forward until it is in the future.
// This prevents stale snoozeTime values (e.g. from missed/caught-up events)
// from scheduling alarms in the past, which would fire immediately and
// open the tab again unexpectedly.
function advanceToFuture(nextTime, recurrencePattern) {
  const now = Date.now();
  let candidate = nextTime;
  // Guard: limit iterations to avoid infinite loops for bad patterns
  for (let i = 0; i < 1000 && candidate <= now; i++) {
    candidate = calculateNextOccurrence(candidate, recurrencePattern);
    if (candidate === null) return null;
  }
  return candidate > now ? candidate : null;
}

// Calculate next occurrence for a recurring event
function calculateNextOccurrence(currentTime, recurrencePattern) {
  const current = new Date(currentTime);
  const pattern = recurrencePattern;

  // Extract time from current occurrence
  const hours = current.getHours();
  const minutes = current.getMinutes();

  let next;

  switch (pattern.frequency) {
    case 'daily':
      // Next day at the same time
      next = new Date(current);
      next.setDate(next.getDate() + 1);
      break;

    case 'weekly':
      // Next occurrence on selected days of week
      next = new Date(current);
      next.setDate(next.getDate() + 1); // Start from next day

      // Find next matching day of week
      let daysChecked = 0;
      while (daysChecked < 7) {
        const dayOfWeek = next.getDay();
        if (pattern.daysOfWeek.includes(dayOfWeek)) {
          break;
        }
        next.setDate(next.getDate() + 1);
        daysChecked++;
      }

      // If no matching day found in next 7 days, something is wrong
      if (daysChecked >= 7) {
        return null;
      }
      break;

    case 'monthly': {
      // Build the next-month date from year/month/day components to avoid
      // JavaScript's setMonth overflow (e.g. Jan 31 + setMonth(1) = Mar 2).
      const targetDay = pattern.dayOfMonth;
      const curMonth = current.getMonth();
      const nextMonthNum = (curMonth + 1) % 12;
      const nextYearNum = curMonth === 11 ? current.getFullYear() + 1 : current.getFullYear();
      const daysInNextMonth = new Date(nextYearNum, nextMonthNum + 1, 0).getDate();
      next = new Date(nextYearNum, nextMonthNum, Math.min(targetDay, daysInNextMonth));
      break;
    }

    case 'yearly':
      // Next year on the same date and month
      next = new Date(current);
      next.setFullYear(next.getFullYear() + 1);
      next.setMonth(pattern.month);

      // Handle leap year (Feb 29)
      const targetDayYearly = pattern.dayOfMonth;
      const daysInMonth = new Date(next.getFullYear(), pattern.month + 1, 0).getDate();
      next.setDate(Math.min(targetDayYearly, daysInMonth));
      break;

    default:
      return null;
  }

  // Set the time
  next.setHours(hours, minutes, 0, 0);

  return next.getTime();
}

// Get all snoozed tabs from storage
async function getSnoozedTabs() {
  const result = await browser.storage.local.get(SNOOZED_TABS_KEY);
  return result[SNOOZED_TABS_KEY] || {};
}

// Open a snoozed tab
async function openSnoozedTab(snoozeId) {
  try {
    const snoozedTabs = await getSnoozedTabs();
    const snooze = snoozedTabs[snoozeId];

    if (!snooze) {
      console.log(`Snooze ${snoozeId} not found`);
      return;
    }

    // Open the tab
    await browser.tabs.create({
      url: snooze.url,
      active: true
    });

    // Queue notification (will be shown based on user's notification mode preference)
    queueNotification(
      snooze.title,
      snooze.recurring || false,
      snooze.recurring ? snooze.recurrencePattern.frequency : null
    );

    // If this is a recurring tab, schedule the next occurrence
    if (snooze.recurring) {
      const rawNext = calculateNextOccurrence(snooze.snoozeTime, snooze.recurrencePattern);
      // If rawNext is in the past (e.g. browser was closed for multiple days),
      // advance forward until we reach a future time so the tab doesn't open again immediately.
      const nextTime = rawNext !== null ? advanceToFuture(rawNext, snooze.recurrencePattern) : null;

      if (nextTime) {
        // Check if we should continue recurring (endDate check)
        const shouldContinue = !snooze.recurrencePattern.endDate || nextTime <= snooze.recurrencePattern.endDate;

        if (shouldContinue) {
          // Create next instance
          await createRecurringInstance(
            { url: snooze.url, title: snooze.title, favIconUrl: snooze.favIconUrl },
            nextTime,
            snooze.recurrencePattern,
            snooze.seriesId,
            snooze.instanceNumber + 1
          );

          console.log(`Next recurring instance scheduled for ${new Date(nextTime).toLocaleString()}`);
        } else {
          console.log('Recurring series ended (reached end date)');
        }
      }
    }

    // Reload tabs from storage to get the latest state (including any newly created recurring instance)
    // This prevents overwriting the next instance that was just created above
    const updatedSnoozedTabs = await getSnoozedTabs();

    // Remove current instance from storage
    delete updatedSnoozedTabs[snoozeId];
    await browser.storage.local.set({ [SNOOZED_TABS_KEY]: updatedSnoozedTabs });

    console.log(`Opened snoozed tab: ${snooze.title}`);
  } catch (error) {
    console.error('Error opening snoozed tab:', error);
  }
}

// Manually unsnooze a tab (open it immediately)
async function unsnoozeTab(snoozeId) {
  try {
    // Clear the alarm
    await browser.alarms.clear(`snooze-${snoozeId}`);

    // Open the tab
    await openSnoozedTab(snoozeId);
  } catch (error) {
    console.error('Error unsnoozing tab:', error);
  }
}

// Delete a snooze without opening the tab
async function deleteSnooze(snoozeId) {
  try {
    // Clear the alarm
    await browser.alarms.clear(`snooze-${snoozeId}`);

    // Remove from storage
    const snoozedTabs = await getSnoozedTabs();
    delete snoozedTabs[snoozeId];
    await browser.storage.local.set({ [SNOOZED_TABS_KEY]: snoozedTabs });

    console.log(`Deleted snooze: ${snoozeId}`);
  } catch (error) {
    console.error('Error deleting snooze:', error);
  }
}

// Check for tabs that should have been opened while browser was closed
async function checkAndOpenSnoozedTabs() {
  try {
    const snoozedTabs = await getSnoozedTabs();
    const now = Date.now();

    for (const [snoozeId, snooze] of Object.entries(snoozedTabs)) {
      if (snooze.snoozeTime <= now) {
        // This tab should have been opened already
        await openSnoozedTab(snoozeId);
      } else {
        // Recreate alarm in case it was lost
        await browser.alarms.create(`snooze-${snoozeId}`, {
          when: snooze.snoozeTime
        });
      }
    }
  } catch (error) {
    console.error('Error checking snoozed tabs:', error);
  }
}

// Export for testing (Node.js / Jest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateNextOccurrence,
    advanceToFuture,
    openSnoozedTab,
    createRecurringInstance,
    checkAndOpenSnoozedTabs,
    getSnoozedTabs,
    queueAlarmProcessing,
  };
}
