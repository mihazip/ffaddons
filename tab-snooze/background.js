// Storage key for snoozed tabs
const SNOOZED_TABS_KEY = 'snoozedTabs';

// Initialize extension
browser.runtime.onInstalled.addListener(() => {
  console.log('Tab Snooze extension installed');
  checkAndOpenSnoozedTabs();
});

// Check for snoozed tabs on browser startup
browser.runtime.onStartup.addListener(() => {
  console.log('Browser started, checking for snoozed tabs');
  checkAndOpenSnoozedTabs();
});

// Listen for messages from popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'snoozeTab') {
    await handleSnoozeTab(message.tab, message.snoozeTime);
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

// Listen for alarms
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('snooze-')) {
    const snoozeId = alarm.name.replace('snooze-', '');
    await openSnoozedTab(snoozeId);
  }
});

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

    // Save to storage
    await browser.storage.local.set({ [SNOOZED_TABS_KEY]: snoozedTabs });

    // Create alarm
    const alarmTime = snoozeTime;
    await browser.alarms.create(`snooze-${snoozeId}`, {
      when: alarmTime
    });

    // Show notification
    const snoozeDate = new Date(snoozeTime);
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/moon-48.png'),
      title: 'Tab Snoozed',
      message: `"${tab.title}" will reopen on ${snoozeDate.toLocaleString()}`
    });

    // Close the tab
    await browser.tabs.remove(tab.id);

    console.log(`Tab snoozed until ${snoozeDate.toLocaleString()}`);
  } catch (error) {
    console.error('Error handling snooze:', error);
  }
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

    // Show notification
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/moon-48.png'),
      title: 'Tab Unsnoozed',
      message: `"${snooze.title}" is now open`
    });

    // Remove from storage
    delete snoozedTabs[snoozeId];
    await browser.storage.local.set({ [SNOOZED_TABS_KEY]: snoozedTabs });

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
