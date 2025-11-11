// Get settings from storage
async function getSettings() {
  const defaults = {
    laterTodayHours: 3,
    timeFormat: '24'
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
  console.log('Popup DOMContentLoaded');

  // Date picker modal elements
  const modal = document.getElementById('date-picker-modal');
  const confirmBtn = document.getElementById('confirm-date-btn');
  const cancelBtn = document.getElementById('cancel-date-btn');

  console.log('Modal elements:', { modal, confirmBtn, cancelBtn });

  // Format time based on user preference
  function formatTime(date, format) {
    const hours24 = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (format === '12') {
      const hours12 = hours24 % 12 || 12;
      const period = hours24 < 12 ? 'AM' : 'PM';
      return `${hours12}:${minutes} ${period}`;
    } else {
      const hours = String(hours24).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  }

  // Parse time based on user preference
  function parseTime(timeStr, format) {
    if (format === '12') {
      // Format: "2:30 PM" or "02:30 PM"
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return null;

      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();

      if (hours < 1 || hours > 12) return null;
      if (minutes < 0 || minutes > 59) return null;

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      return { hours, minutes };
    } else {
      // Format: "14:30"
      const parts = timeStr.split(':');
      if (parts.length !== 2) return null;

      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);

      if (hours < 0 || hours > 23) return null;
      if (minutes < 0 || minutes > 59) return null;

      return { hours, minutes };
    }
  }

  async function showDatePicker() {
    console.log('showDatePicker called');
    console.log('modal element:', modal);

    const settings = await getSettings();
    const now = new Date();

    // Set default to 1 minute from now
    const defaultDateTime = new Date(now.getTime() + 60 * 1000);

    const dateInput = document.getElementById('custom-date');
    const timeInput = document.getElementById('custom-time');

    console.log('dateInput:', dateInput);
    console.log('timeInput:', timeInput);

    // Format date as YYYY-MM-DD for date input
    const year = defaultDateTime.getFullYear();
    const month = String(defaultDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(defaultDateTime.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;

    // Set minimum date to today
    const today = new Date();
    const minYear = today.getFullYear();
    const minMonth = String(today.getMonth() + 1).padStart(2, '0');
    const minDay = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${minYear}-${minMonth}-${minDay}`;

    timeInput.placeholder = settings.timeFormat === '12' ? '2:30 PM' : '14:30';
    timeInput.value = formatTime(defaultDateTime, settings.timeFormat);

    console.log('Setting modal.style.display to flex');
    modal.style.display = 'flex';
    console.log('modal.style.display is now:', modal.style.display);
  }

  // Handle snooze button clicks
  const snoozeButtons = document.querySelectorAll('.snooze-btn[data-option]');
  console.log('Found snooze buttons:', snoozeButtons.length);
  snoozeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const option = button.dataset.option;
      console.log('Snooze button clicked, option:', option);

      if (option === 'pick-date') {
        console.log('Pick date option selected, calling showDatePicker');
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

  // Confirm button handler
  confirmBtn.addEventListener('click', async () => {
    const settings = await getSettings();
    const dateInput = document.getElementById('custom-date');
    const timeInput = document.getElementById('custom-time');

    // Parse date from date input (YYYY-MM-DD format)
    if (!dateInput.value) {
      alert('Please select a date');
      return;
    }

    const [year, month, day] = dateInput.value.split('-').map(Number);
    const parsedTime = parseTime(timeInput.value, settings.timeFormat);

    if (!parsedTime) {
      const timeExample = settings.timeFormat === '12' ? '2:30 PM' : '14:30';
      alert(`Invalid time format. Please use: ${timeExample}`);
      return;
    }

    // Create date in local timezone
    const selectedDateTime = new Date(
      year,
      month - 1,
      day,
      parsedTime.hours,
      parsedTime.minutes,
      0,
      0
    );

    if (isNaN(selectedDateTime.getTime())) {
      alert('Invalid date or time');
      return;
    }

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
