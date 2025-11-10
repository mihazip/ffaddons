// Default settings
const defaultSettings = {
  laterTodayHours: 3,
  eveningTime: '18:00',
  morningTime: '09:00',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24',
  showSnoozeNotification: true,
  showUnsnoozeNotification: true
};

// Load settings when page opens
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();

  // Save button handler
  document.getElementById('save-btn').addEventListener('click', saveSettings);
});

// Load settings from storage
async function loadSettings() {
  try {
    const settings = await browser.storage.sync.get(defaultSettings);

    document.getElementById('later-today-hours').value = settings.laterTodayHours;
    document.getElementById('evening-time').value = settings.eveningTime;
    document.getElementById('morning-time').value = settings.morningTime;
    document.getElementById('date-format').value = settings.dateFormat;
    document.getElementById('time-format').value = settings.timeFormat;
    document.getElementById('show-snooze-notification').checked = settings.showSnoozeNotification;
    document.getElementById('show-unsnooze-notification').checked = settings.showUnsnoozeNotification;
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
      eveningTime: document.getElementById('evening-time').value,
      morningTime: document.getElementById('morning-time').value,
      dateFormat: document.getElementById('date-format').value,
      timeFormat: document.getElementById('time-format').value,
      showSnoozeNotification: document.getElementById('show-snooze-notification').checked,
      showUnsnoozeNotification: document.getElementById('show-unsnooze-notification').checked
    };

    // Validate
    if (settings.laterTodayHours < 1 || settings.laterTodayHours > 12) {
      showStatus('Later Today hours must be between 1 and 12', 'error');
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
