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
  ],
  // Phase 3: Custom panels
  customPanels: []
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

  // Initialize custom panels
  initCustomPanels();
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

// ===== Custom Panels Management =====

// Available emojis for custom panels
const availableEmojis = [
  '☕', '🍵', '🥤', '🍺', '🍕', '🍔', '🌮', '🍜',
  '💼', '📧', '📞', '💻', '⌨️', '🖱️', '📱', '⌚',
  '🏃', '🚶', '🧘', '💪', '🏋️', '🚴', '🏊', '⚽',
  '📚', '📖', '✏️', '📝', '📊', '📈', '📉', '💡',
  '🎵', '🎸', '🎮', '🎬', '📺', '🎨', '🖼️', '📷',
  '✈️', '🚗', '🚕', '🚌', '🚇', '🚂', '🚁', '🚀',
  '🏠', '🏢', '🏪', '🏫', '🏥', '🏛️', '⛪', '🏰',
  '⏰', '⏲️', '⌛', '⏱️', '🕐', '🕑', '🕒', '🕓',
  '☀️', '🌙', '⭐', '🌟', '💫', '✨', '🌈', '🔥',
  '❤️', '💚', '💙', '💛', '💜', '🧡', '💖', '💝'
];

let currentEditingPanelId = null;
let customPanels = [];

// Initialize custom panels
async function initCustomPanels() {
  const settings = await browser.storage.sync.get(defaultSettings);
  customPanels = settings.customPanels || [];

  renderCustomPanelsList();
  setupCustomPanelHandlers();
  renderEmojiPicker();
}

// Render custom panels list
function renderCustomPanelsList() {
  const container = document.getElementById('custom-panels-list');

  if (customPanels.length === 0) {
    container.innerHTML = '<div class="empty-state">No custom panels yet. Click "Add Custom Panel" to create one.</div>';
    return;
  }

  container.innerHTML = '';

  customPanels.forEach(panel => {
    const item = document.createElement('div');
    item.className = 'custom-panel-item';
    item.dataset.panelId = panel.id;

    const detailsText = getCalculationDetailsText(panel);

    item.innerHTML = `
      <span class="panel-icon">${panel.icon}</span>
      <div class="panel-info">
        <div class="panel-name">${panel.name}</div>
        <div class="panel-details">${detailsText}</div>
      </div>
      <div class="panel-actions">
        <label>
          <input type="checkbox" class="toggle-checkbox" ${panel.enabled ? 'checked' : ''}>
          Show
        </label>
        <button class="edit-btn" data-panel-id="${panel.id}">Edit</button>
        <button class="delete-btn" data-panel-id="${panel.id}">Delete</button>
      </div>
    `;

    // Add toggle handler
    const checkbox = item.querySelector('.toggle-checkbox');
    checkbox.addEventListener('change', () => {
      panel.enabled = checkbox.checked;
      saveCustomPanels();
    });

    // Add edit handler
    const editBtn = item.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => editCustomPanel(panel.id));

    // Add delete handler
    const deleteBtn = item.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteCustomPanel(panel.id));

    container.appendChild(item);
  });
}

// Get calculation details text for display
function getCalculationDetailsText(panel) {
  switch (panel.type) {
    case 'relative':
      const hours = panel.value;
      if (hours < 1) {
        return `${hours * 60} minutes from now`;
      } else if (hours === 1) {
        return '1 hour from now';
      } else {
        return `${hours} hours from now`;
      }

    case 'relative-time':
      const days = panel.value;
      const dayText = days === 1 ? 'day' : 'days';
      return `${days} ${dayText} from now at ${panel.time}`;

    case 'next-weekday':
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Next ${weekdays[panel.weekday]} at ${panel.time}`;

    case 'absolute':
      return `Today/Tomorrow at ${panel.time}`;

    default:
      return 'Unknown calculation type';
  }
}

// Setup custom panel handlers
function setupCustomPanelHandlers() {
  const addBtn = document.getElementById('add-custom-panel-btn');
  const modal = document.getElementById('custom-panel-modal');
  const cancelBtn = document.getElementById('cancel-panel-btn');
  const saveBtn = document.getElementById('save-panel-btn');
  const calculationType = document.getElementById('calculation-type');

  // Add button
  addBtn.addEventListener('click', () => {
    currentEditingPanelId = null;
    showCustomPanelModal();
  });

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Save button
  saveBtn.addEventListener('click', () => {
    saveCustomPanel();
  });

  // Close modal on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Calculation type change handler
  calculationType.addEventListener('change', () => {
    updateCalculationInputs();
  });
}

// Render emoji picker
function renderEmojiPicker() {
  const container = document.getElementById('emoji-picker');
  container.innerHTML = '';

  availableEmojis.forEach(emoji => {
    const option = document.createElement('div');
    option.className = 'emoji-option';
    option.textContent = emoji;
    option.dataset.emoji = emoji;

    option.addEventListener('click', () => {
      // Remove selected class from all
      container.querySelectorAll('.emoji-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      // Add selected class to clicked
      option.classList.add('selected');
    });

    container.appendChild(option);
  });
}

// Show custom panel modal (for add or edit)
function showCustomPanelModal(panel = null) {
  const modal = document.getElementById('custom-panel-modal');
  const modalTitle = document.getElementById('modal-title');

  if (panel) {
    modalTitle.textContent = 'Edit Custom Panel';

    // Populate form with panel data
    document.getElementById('panel-name').value = panel.name;
    document.getElementById('calculation-type').value = panel.type;

    // Select emoji
    const emojiOptions = document.querySelectorAll('.emoji-option');
    emojiOptions.forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.emoji === panel.icon);
    });

    // Populate type-specific fields
    switch (panel.type) {
      case 'relative':
        document.getElementById('relative-hours').value = panel.value;
        break;
      case 'relative-time':
        document.getElementById('relative-days').value = panel.value;
        document.getElementById('relative-time-value').value = panel.time;
        break;
      case 'next-weekday':
        document.getElementById('weekday-select').value = panel.weekday;
        document.getElementById('weekday-time').value = panel.time;
        break;
      case 'absolute':
        document.getElementById('absolute-time').value = panel.time;
        break;
    }
  } else {
    modalTitle.textContent = 'Add Custom Panel';

    // Reset form
    document.getElementById('panel-name').value = '';
    document.getElementById('calculation-type').value = 'relative';

    // Deselect all emojis
    const emojiOptions = document.querySelectorAll('.emoji-option');
    emojiOptions.forEach(opt => opt.classList.remove('selected'));

    // Reset all inputs
    document.getElementById('relative-hours').value = 1;
    document.getElementById('relative-days').value = 1;
    document.getElementById('relative-time-value').value = '09:00';
    document.getElementById('weekday-select').value = 1;
    document.getElementById('weekday-time').value = '09:00';
    document.getElementById('absolute-time').value = '17:00';
  }

  updateCalculationInputs();
  modal.style.display = 'flex';
}

// Update calculation inputs visibility based on type
function updateCalculationInputs() {
  const type = document.getElementById('calculation-type').value;

  // Hide all conditional inputs
  document.querySelectorAll('.conditional-input').forEach(el => {
    el.classList.remove('visible');
  });

  // Show relevant input
  switch (type) {
    case 'relative':
      document.getElementById('relative-options').classList.add('visible');
      break;
    case 'relative-time':
      document.getElementById('relative-time-options').classList.add('visible');
      break;
    case 'next-weekday':
      document.getElementById('next-weekday-options').classList.add('visible');
      break;
    case 'absolute':
      document.getElementById('absolute-options').classList.add('visible');
      break;
  }
}

// Save custom panel
async function saveCustomPanel() {
  const name = document.getElementById('panel-name').value.trim();
  const selectedEmoji = document.querySelector('.emoji-option.selected');
  const type = document.getElementById('calculation-type').value;

  // Validation
  if (!name) {
    alert('Please enter a panel name');
    return;
  }

  if (name.length > 20) {
    alert('Panel name must be 20 characters or less');
    return;
  }

  if (!selectedEmoji) {
    alert('Please select an icon');
    return;
  }

  const icon = selectedEmoji.dataset.emoji;

  // Build panel object
  const panel = {
    id: currentEditingPanelId || `custom-${Date.now()}`,
    name,
    icon,
    type,
    enabled: true
  };

  // Add type-specific data
  switch (type) {
    case 'relative':
      const hours = parseFloat(document.getElementById('relative-hours').value);
      if (hours < 0.25 || hours > 24) {
        alert('Hours must be between 0.25 and 24');
        return;
      }
      panel.value = hours;
      break;

    case 'relative-time':
      const days = parseInt(document.getElementById('relative-days').value);
      if (days < 1 || days > 365) {
        alert('Days must be between 1 and 365');
        return;
      }
      panel.value = days;
      panel.time = document.getElementById('relative-time-value').value;
      break;

    case 'next-weekday':
      panel.weekday = parseInt(document.getElementById('weekday-select').value);
      panel.time = document.getElementById('weekday-time').value;
      break;

    case 'absolute':
      panel.time = document.getElementById('absolute-time').value;
      break;
  }

  // Add or update panel
  if (currentEditingPanelId) {
    const index = customPanels.findIndex(p => p.id === currentEditingPanelId);
    if (index !== -1) {
      customPanels[index] = panel;
    }
  } else {
    customPanels.push(panel);
  }

  // Save to storage
  await saveCustomPanels();

  // Close modal and refresh list
  document.getElementById('custom-panel-modal').style.display = 'none';
  renderCustomPanelsList();
}

// Save custom panels to storage
async function saveCustomPanels() {
  try {
    await browser.storage.sync.set({ customPanels });
  } catch (error) {
    console.error('Error saving custom panels:', error);
    showStatus('Error saving custom panels', 'error');
  }
}

// Edit custom panel
function editCustomPanel(panelId) {
  const panel = customPanels.find(p => p.id === panelId);
  if (panel) {
    currentEditingPanelId = panelId;
    showCustomPanelModal(panel);
  }
}

// Delete custom panel
async function deleteCustomPanel(panelId) {
  if (!confirm('Are you sure you want to delete this custom panel?')) {
    return;
  }

  customPanels = customPanels.filter(p => p.id !== panelId);
  await saveCustomPanels();
  renderCustomPanelsList();
}
