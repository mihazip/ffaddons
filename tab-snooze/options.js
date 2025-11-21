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
  unsnoozeNotificationMode: 'individual', // 'individual', 'bundled', or 'off'
  // Phase 2: Button grid customization
  panelVisibility: {
    'later-today': true,
    'this-eve': true,
    'tomorrow': true,
    'tomorrow-eve': true,
    'next-weekend': true,
    'next-week': true,
    'in-a-month': true,
    'someday': true
  },
  panelOrder: [
    'later-today',
    'tomorrow',
    'tomorrow-eve',
    'this-eve',
    'next-weekend',
    'next-week',
    'in-a-month',
    'someday'
  ]
};

// Button metadata (icons and labels)
const buttonMetadata = {
  'later-today': { icon: '☀️', label: 'Later Today' },
  'this-eve': { icon: '🌃', label: 'This Evening' },
  'tomorrow': { icon: '🌅', label: 'Tomorrow' },
  'tomorrow-eve': { icon: '🌆', label: 'Tomorrow Eve' },
  'next-weekend': { icon: '🎉', label: 'Next Weekend' },
  'next-week': { icon: '📅', label: 'Next Week' },
  'in-a-month': { icon: '📆', label: 'In a Month' },
  'someday': { icon: '🔮', label: 'Someday' }
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

  // Initialize button grid customizer
  initButtonGridCustomizer();
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
      unsnoozeNotificationMode: document.getElementById('unsnooze-notification-mode').value,
      // Phase 2: Button grid customization
      panelVisibility: getCurrentPanelVisibility(),
      panelOrder: getCurrentPanelOrder()
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

    // Validate that at least one button is visible
    const visibleCount = Object.values(settings.panelVisibility).filter(v => v).length;
    if (visibleCount === 0) {
      showStatus('At least one snooze button must be visible', 'error');
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

// ===== Button Grid Customizer =====

// Initialize button grid customizer
async function initButtonGridCustomizer() {
  const settings = await browser.storage.sync.get(defaultSettings);
  renderButtonGrid(settings.panelOrder, settings.panelVisibility);
}

// Render button grid
function renderButtonGrid(panelOrder, panelVisibility) {
  const container = document.getElementById('button-grid-customizer');
  container.innerHTML = '';

  panelOrder.forEach((buttonId, index) => {
    const metadata = buttonMetadata[buttonId];
    if (!metadata) return;

    const item = document.createElement('div');
    item.className = 'button-grid-item';
    item.dataset.buttonId = buttonId;
    item.draggable = true;

    item.innerHTML = `
      <span class="drag-handle">☰</span>
      <span class="button-icon">${metadata.icon}</span>
      <span class="button-label">${metadata.label}</span>
      <input type="checkbox" ${panelVisibility[buttonId] ? 'checked' : ''}>
    `;

    // Drag event listeners
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragleave', handleDragLeave);

    container.appendChild(item);
  });
}

// Drag and drop handlers
let draggedItem = null;

function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedItem) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  if (draggedItem !== this) {
    const container = document.getElementById('button-grid-customizer');
    const allItems = Array.from(container.children);
    const draggedIndex = allItems.indexOf(draggedItem);
    const targetIndex = allItems.indexOf(this);

    if (draggedIndex < targetIndex) {
      this.parentNode.insertBefore(draggedItem, this.nextSibling);
    } else {
      this.parentNode.insertBefore(draggedItem, this);
    }
  }

  this.classList.remove('drag-over');
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');

  const container = document.getElementById('button-grid-customizer');
  const allItems = Array.from(container.children);
  allItems.forEach(item => {
    item.classList.remove('drag-over');
  });
}

// Get current panel order from the DOM
function getCurrentPanelOrder() {
  const container = document.getElementById('button-grid-customizer');
  const items = Array.from(container.children);
  return items.map(item => item.dataset.buttonId);
}

// Get current panel visibility from the DOM
function getCurrentPanelVisibility() {
  const container = document.getElementById('button-grid-customizer');
  const items = Array.from(container.children);
  const visibility = {};

  items.forEach(item => {
    const buttonId = item.dataset.buttonId;
    const checkbox = item.querySelector('input[type="checkbox"]');
    visibility[buttonId] = checkbox.checked;
  });

  return visibility;
}
