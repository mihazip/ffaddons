// Default settings
const defaultSettings = {
  laterTodayHours: 3,
  eveningTime: '18:00',
  morningTime: '09:00',
  weekendTime: '10:00',
  somedayValue: 3,
  somedayUnit: 'months',
  showPickDate: true,
  showRepeatedly: true,
  dateFormat: 'DD-MM-YYYY',
  timeFormat: '24',
  showSnoozeNotification: true,
  unsnoozeNotificationMode: 'individual' // 'individual', 'bundled', or 'off'
};

// Load settings when page opens
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();

  // Save button handler
  document.getElementById('save-btn').addEventListener('click', saveSettings);

  // Radio button change handlers to show/hide custom time inputs
  setupRadioHandlers('evening-time', 'evening-custom-input');
  setupRadioHandlers('morning-time', 'morning-custom-input');
  setupRadioHandlers('weekend-time', 'weekend-custom-input');
});

// Load settings from storage
async function loadSettings() {
  try {
    const settings = await browser.storage.sync.get(defaultSettings);

    // Simple inputs
    document.getElementById('later-today-hours').value = settings.laterTodayHours;
    document.getElementById('date-format').value = settings.dateFormat;
    document.getElementById('time-format').value = settings.timeFormat;
    document.getElementById('show-snooze-notification').checked = settings.showSnoozeNotification;
    document.getElementById('unsnooze-notification-mode').value = settings.unsnoozeNotificationMode;
    document.getElementById('someday-value').value = settings.somedayValue;
    document.getElementById('someday-unit').value = settings.somedayUnit;
    document.getElementById('show-pick-date').checked = settings.showPickDate;
    document.getElementById('show-repeatedly').checked = settings.showRepeatedly;

    // Radio button groups with custom options
    setRadioValue('evening-time', settings.eveningTime, 'evening-custom-time', 'evening-custom-input');
    setRadioValue('morning-time', settings.morningTime, 'morning-custom-time', 'morning-custom-input');
    setRadioValue('weekend-time', settings.weekendTime, 'weekend-custom-time', 'weekend-custom-input');
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    const settings = {
      laterTodayHours: parseInt(document.getElementById('later-today-hours').value),
      eveningTime: getRadioValue('evening-time', 'evening-custom-time'),
      morningTime: getRadioValue('morning-time', 'morning-custom-time'),
      weekendTime: getRadioValue('weekend-time', 'weekend-custom-time'),
      somedayValue: parseInt(document.getElementById('someday-value').value),
      somedayUnit: document.getElementById('someday-unit').value,
      showPickDate: document.getElementById('show-pick-date').checked,
      showRepeatedly: document.getElementById('show-repeatedly').checked,
      dateFormat: document.getElementById('date-format').value,
      timeFormat: document.getElementById('time-format').value,
      showSnoozeNotification: document.getElementById('show-snooze-notification').checked,
      unsnoozeNotificationMode: document.getElementById('unsnooze-notification-mode').value
    };

    // Validate
    if (settings.laterTodayHours < 1 || settings.laterTodayHours > 12) {
      showStatus('Later Today hours must be between 1 and 12', 'error');
      return;
    }

    if (settings.somedayValue < 1 || settings.somedayValue > 999) {
      showStatus('Someday value must be between 1 and 999', 'error');
      return;
    }

    await browser.storage.sync.set(settings);
    showStatus('Settings saved successfully!', 'success');

    // Clear success message after 3 seconds
    setTimeout(() => {
      const statusEl = document.getElementById('status-message');
      statusEl.className = 'status-message';
      statusEl.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
}

// Helper: Setup radio button change handlers
function setupRadioHandlers(radioGroupName, customInputId) {
  const radios = document.querySelectorAll(`input[name="${radioGroupName}"]`);
  const customInput = document.getElementById(customInputId);

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'custom' && radio.checked) {
        customInput.classList.add('visible');
      } else if (radio.checked) {
        customInput.classList.remove('visible');
      }
    });
  });
}

// Helper: Get value from radio group (returns custom time if custom is selected)
function getRadioValue(radioGroupName, customTimeId) {
  const selectedRadio = document.querySelector(`input[name="${radioGroupName}"]:checked`);
  if (!selectedRadio) return '09:00'; // Default fallback

  if (selectedRadio.value === 'custom') {
    return document.getElementById(customTimeId).value;
  }
  return selectedRadio.value;
}

// Helper: Set radio button value (and show custom input if needed)
function setRadioValue(radioGroupName, timeValue, customTimeId, customInputId) {
  // Check if the time value matches one of the preset radio buttons
  const matchingRadio = document.querySelector(`input[name="${radioGroupName}"][value="${timeValue}"]`);

  if (matchingRadio) {
    // It's a preset value
    matchingRadio.checked = true;
  } else {
    // It's a custom value
    const customRadio = document.querySelector(`input[name="${radioGroupName}"][value="custom"]`);
    const customInput = document.getElementById(customInputId);
    const customTimeInput = document.getElementById(customTimeId);

    if (customRadio && customInput && customTimeInput) {
      customRadio.checked = true;
      customTimeInput.value = timeValue;
      customInput.classList.add('visible');
    }
  }
}
