// Get settings from storage
async function getSettings() {
  const defaults = {
    laterTodayHours: 3
  };

  const result = await browser.storage.sync.get(defaults);
  return result;
}

// Calculate snooze time based on option
async function calculateSnoozeTime(option) {
  const now = new Date();
  const settings = await getSettings();

  switch(option) {
    case 'later-today':
      now.setHours(now.getHours() + settings.laterTodayHours);
      return now.getTime();

    case 'this-eve':
      now.setHours(18, 0, 0, 0);
      if (now.getTime() <= Date.now()) {
        now.setDate(now.getDate() + 1);
      }
      return now.getTime();

    case 'tomorrow':
      now.setDate(now.getDate() + 1);
      now.setHours(9, 0, 0, 0);
      return now.getTime();

    case 'tomorrow-eve':
      now.setDate(now.getDate() + 1);
      now.setHours(18, 0, 0, 0);
      return now.getTime();

    case 'next-weekend':
      // Find next Saturday
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
      now.setDate(now.getDate() + daysUntilSaturday);
      now.setHours(10, 0, 0, 0);
      return now.getTime();

    case 'next-week':
      now.setDate(now.getDate() + 7);
      now.setHours(9, 0, 0, 0);
      return now.getTime();

    case 'in-a-month':
      now.setMonth(now.getMonth() + 1);
      now.setHours(9, 0, 0, 0);
      return now.getTime();

    case 'someday':
      // Someday = 3 months from now
      now.setMonth(now.getMonth() + 3);
      now.setHours(9, 0, 0, 0);
      return now.getTime();

    default:
      return null;
  }
}

// Snooze the current tab
async function snoozeTab(option, customTime = null) {
  try {
    // Get the current tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab) {
      console.error('No active tab found');
      return;
    }

    let snoozeTime;
    if (customTime) {
      snoozeTime = customTime;
    } else {
      snoozeTime = await calculateSnoozeTime(option);
    }

    if (!snoozeTime) {
      console.error('Could not calculate snooze time');
      return;
    }

    // Send message to background script to handle the snooze
    await browser.runtime.sendMessage({
      action: 'snoozeTab',
      tab: {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      },
      snoozeTime: snoozeTime
    });

    // Close the popup
    window.close();
  } catch (error) {
    console.error('Error snoozing tab:', error);
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Handle snooze button clicks
  const snoozeButtons = document.querySelectorAll('.snooze-btn[data-option]');
  snoozeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const option = button.dataset.option;

      if (option === 'pick-date') {
        showDatePicker();
      } else if (option === 'repeatedly') {
        // TODO: Implement repeatedly functionality
        alert('Repeatedly feature coming soon!');
      } else {
        snoozeTab(option);
      }
    });
  });

  // Handle settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    browser.runtime.openOptionsPage();
    window.close();
  });

  // Handle view snoozed button
  document.getElementById('view-snoozed-btn').addEventListener('click', async () => {
    // Open a new tab with snoozed tabs list
    const url = browser.runtime.getURL('snoozed.html');
    await browser.tabs.create({ url });
    window.close();
  });

  // Date picker modal handlers
  const modal = document.getElementById('date-picker-modal');
  const confirmBtn = document.getElementById('confirm-date-btn');
  const cancelBtn = document.getElementById('cancel-date-btn');

  function showDatePicker() {
    // Set minimum datetime to now
    const now = new Date();
    const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('custom-datetime').min = minDateTime;

    // Set default to 1 hour from now
    const defaultTime = new Date(now.getTime() + 60 * 60 * 1000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('custom-datetime').value = defaultTime;

    modal.style.display = 'flex';
  }

  confirmBtn.addEventListener('click', () => {
    const dateTimeInput = document.getElementById('custom-datetime');

    // Parse datetime-local value as local time (not UTC)
    // datetime-local format: "YYYY-MM-DDTHH:MM"
    const [datePart, timePart] = dateTimeInput.value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    // Create date in local timezone
    const selectedDateTime = new Date(year, month - 1, day, hour, minute, 0, 0);

    if (selectedDateTime.getTime() > Date.now()) {
      snoozeTab('custom', selectedDateTime.getTime());
      modal.style.display = 'none';
    } else {
      alert('Please select a future date and time');
    }
  });

  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Close modal on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});
