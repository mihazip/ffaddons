// Get the appropriate label for the weekend option
function getWeekendLabel() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // If it's Saturday (6), show "Next Weekend", otherwise show "This Weekend"
  return dayOfWeek === 6 ? 'Next Weekend' : 'This Weekend';
}

// Get settings from storage
async function getSettings() {
  const defaults = {
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

    case 'this-eve': {
      const [eveHours, eveMinutes] = settings.eveningTime.split(':').map(Number);
      now.setHours(eveHours, eveMinutes, 0, 0);
      if (now.getTime() <= Date.now()) {
        now.setDate(now.getDate() + 1);
      }
      return now.getTime();
    }

    case 'tomorrow': {
      const [mornHours, mornMinutes] = settings.morningTime.split(':').map(Number);
      now.setDate(now.getDate() + 1);
      now.setHours(mornHours, mornMinutes, 0, 0);
      return now.getTime();
    }

    case 'tomorrow-eve': {
      const [eveHours, eveMinutes] = settings.eveningTime.split(':').map(Number);
      now.setDate(now.getDate() + 1);
      now.setHours(eveHours, eveMinutes, 0, 0);
      return now.getTime();
    }

    case 'next-weekend': {
      const [weekendHours, weekendMinutes] = settings.weekendTime.split(':').map(Number);
      // Find next Saturday
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
      now.setDate(now.getDate() + daysUntilSaturday);
      now.setHours(weekendHours, weekendMinutes, 0, 0);
      return now.getTime();
    }

    case 'next-week': {
      const [mornHours, mornMinutes] = settings.morningTime.split(':').map(Number);
      now.setDate(now.getDate() + 7);
      now.setHours(mornHours, mornMinutes, 0, 0);
      return now.getTime();
    }

    case 'in-a-month': {
      const [mornHours, mornMinutes] = settings.morningTime.split(':').map(Number);
      now.setMonth(now.getMonth() + 1);
      now.setHours(mornHours, mornMinutes, 0, 0);
      return now.getTime();
    }

    case 'someday': {
      const [mornHours, mornMinutes] = settings.morningTime.split(':').map(Number);
      // Calculate someday based on settings
      switch (settings.somedayUnit) {
        case 'days':
          now.setDate(now.getDate() + settings.somedayValue);
          break;
        case 'weeks':
          now.setDate(now.getDate() + (settings.somedayValue * 7));
          break;
        case 'months':
          now.setMonth(now.getMonth() + settings.somedayValue);
          break;
        case 'years':
          now.setFullYear(now.getFullYear() + settings.somedayValue);
          break;
      }
      now.setHours(mornHours, mornMinutes, 0, 0);
      return now.getTime();
    }

    default:
      return null;
  }
}

// Format timing display for a button option
async function formatTimingDisplay(option) {
  const snoozeTime = await calculateSnoozeTime(option);
  if (!snoozeTime) return '';

  const targetDate = new Date(snoozeTime);
  const now = new Date();
  const settings = await getSettings();

  // Helper to format time
  const formatTimeString = (date) => {
    const hours24 = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (settings.timeFormat === '12') {
      const hours12 = hours24 % 12 || 12;
      const period = hours24 < 12 ? 'AM' : 'PM';
      return `${hours12}:${minutes} ${period}`;
    } else {
      const hours = String(hours24).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  };

  // Helper to get day name
  const getDayName = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Helper to format date
  const formatDateString = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  switch(option) {
    case 'later-today': {
      const hoursDiff = Math.round((snoozeTime - now.getTime()) / (1000 * 60 * 60));
      if (hoursDiff === 1) {
        return 'in 1 hour';
      } else {
        return `in ${hoursDiff} hours`;
      }
    }

    case 'this-eve': {
      const [eveHours, eveMinutes] = settings.eveningTime.split(':').map(Number);
      const todayEvening = new Date();
      todayEvening.setHours(eveHours, eveMinutes, 0, 0);
      if (targetDate.getDate() === now.getDate()) {
        return formatTimeString(targetDate);
      } else {
        return `tomorrow ${formatTimeString(targetDate)}`;
      }
    }

    case 'tomorrow':
      return formatTimeString(targetDate);

    case 'tomorrow-eve':
      return formatTimeString(targetDate);

    case 'next-weekend':
      return `${getDayName(targetDate)}, ${formatDateString(targetDate)}`;

    case 'next-week': {
      return `${getDayName(targetDate)}, ${formatDateString(targetDate)}`;
    }

    case 'in-a-month':
      return formatDateString(targetDate);

    case 'someday': {
      const value = settings.somedayValue;
      const unit = settings.somedayUnit;
      // Handle singular vs plural
      const displayUnit = value === 1 ? unit.slice(0, -1) : unit;
      return `in ${value} ${displayUnit}`;
    }

    default:
      return '';
  }
}

// Calculate time for custom panel
function calculateCustomPanelTime(panel) {
  const now = new Date();

  switch (panel.type) {
    case 'relative':
      // X hours from now
      now.setHours(now.getHours() + panel.value);
      return now.getTime();

    case 'relative-time': {
      // X days from now at specific time
      const [hours, minutes] = panel.time.split(':').map(Number);
      now.setDate(now.getDate() + panel.value);
      now.setHours(hours, minutes, 0, 0);
      return now.getTime();
    }

    case 'next-weekday': {
      // Next occurrence of a weekday
      const [hours, minutes] = panel.time.split(':').map(Number);
      const targetDay = panel.weekday;
      const currentDay = now.getDay();

      // Calculate days until target day
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) {
        daysUntil += 7;
      }

      now.setDate(now.getDate() + daysUntil);
      now.setHours(hours, minutes, 0, 0);
      return now.getTime();
    }

    case 'absolute': {
      // Specific time today or tomorrow
      const [hours, minutes] = panel.time.split(':').map(Number);
      now.setHours(hours, minutes, 0, 0);

      // If time has passed today, move to tomorrow
      if (now.getTime() <= Date.now()) {
        now.setDate(now.getDate() + 1);
      }

      return now.getTime();
    }

    default:
      return null;
  }
}

// Format timing display for custom panel
async function formatCustomPanelTiming(panel) {
  const snoozeTime = calculateCustomPanelTime(panel);
  if (!snoozeTime) return '';

  const targetDate = new Date(snoozeTime);
  const now = new Date();
  const settings = await getSettings();

  // Helper to format time
  const formatTimeString = (date) => {
    const hours24 = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (settings.timeFormat === '12') {
      const hours12 = hours24 % 12 || 12;
      const period = hours24 < 12 ? 'AM' : 'PM';
      return `${hours12}:${minutes} ${period}`;
    } else {
      const hours = String(hours24).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  };

  // Helper to get day name
  const getDayName = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Helper to format date
  const formatDateString = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  switch (panel.type) {
    case 'relative': {
      const hours = panel.value;
      if (hours < 1) {
        const minutes = Math.round(hours * 60);
        return `in ${minutes} min`;
      } else if (hours === 1) {
        return 'in 1 hour';
      } else {
        return `in ${hours} hours`;
      }
    }

    case 'relative-time': {
      if (panel.value === 1) {
        return formatTimeString(targetDate);
      } else {
        return `${getDayName(targetDate)}, ${formatDateString(targetDate)}`;
      }
    }

    case 'next-weekday':
      return `${getDayName(targetDate)}, ${formatDateString(targetDate)}`;

    case 'absolute':
      if (targetDate.getDate() === now.getDate()) {
        return formatTimeString(targetDate);
      } else {
        return `tomorrow ${formatTimeString(targetDate)}`;
      }

    default:
      return '';
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
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup DOMContentLoaded');

  // Date picker modal elements
  const modal = document.getElementById('date-picker-modal');
  const confirmBtn = document.getElementById('confirm-date-btn');
  const cancelBtn = document.getElementById('cancel-date-btn');

  console.log('Modal elements:', { modal, confirmBtn, cancelBtn });

  // Get settings (including panelVisibility and panelOrder)
  const settings = await getSettings();

  // Phase 2 & 3: Reorder buttons in the grid based on settings (mixing preset and custom)
  const grid = document.querySelector('.snooze-grid');
  const allButtons = Array.from(grid.querySelectorAll('.snooze-btn[data-option]'));

  // Separate preset buttons from special buttons (pick-date, repeatedly, settings, view-snoozed)
  const presetButtons = {};
  allButtons.forEach(btn => {
    const option = btn.dataset.option;
    const presetPanelIds = [
      'later-today', 'this-eve', 'tomorrow', 'tomorrow-eve',
      'next-weekend', 'next-week', 'in-a-month', 'someday'
    ];
    if (presetPanelIds.includes(option)) {
      presetButtons[option] = btn;
    }
  });

  const pickDateBtn = grid.querySelector('[data-option="pick-date"]');
  const repeatedlyBtn = grid.querySelector('[data-option="repeatedly"]');
  const settingsBtn = grid.querySelector('#settings-btn');
  const viewSnoozedBtn = grid.querySelector('#view-snoozed-btn');

  // Clear the grid
  grid.innerHTML = '';

  // Create a lookup for custom panels
  const customPanels = settings.customPanels || [];
  const customPanelLookup = {};
  customPanels.forEach(panel => {
    customPanelLookup[panel.id] = panel;
  });

  // Add panels (both preset and custom) in the order specified by panelOrder
  for (const panelId of settings.panelOrder) {
    // Check if it's a preset panel
    if (presetButtons[panelId] && settings.panelVisibility[panelId]) {
      const button = presetButtons[panelId];
      grid.appendChild(button);

      // Update label for weekend option dynamically
      if (panelId === 'next-weekend') {
        const labelElement = button.querySelector('.label');
        if (labelElement) {
          labelElement.textContent = getWeekendLabel();
        }
      }

      // Update timing display for visible buttons
      const timingElement = button.querySelector('.timing');
      if (timingElement) {
        const timingText = await formatTimingDisplay(panelId);
        timingElement.textContent = timingText;
      }
    }
    // Check if it's a custom panel
    else if (customPanelLookup[panelId]) {
      const panel = customPanelLookup[panelId];
      if (panel.enabled) {
        const button = document.createElement('button');
        button.className = 'snooze-btn';
        button.dataset.option = panel.id;
        button.dataset.customPanel = 'true';

        const timingText = await formatCustomPanelTiming(panel);

        button.innerHTML = `
          <div class="icon">${panel.icon}</div>
          <div class="label">${panel.name}</div>
          <div class="timing">${timingText}</div>
        `;

        grid.appendChild(button);
      }
    }
  }

  // Add advanced option buttons if enabled
  if (pickDateBtn && settings.showPickDate) {
    grid.appendChild(pickDateBtn);
  }
  if (repeatedlyBtn && settings.showRepeatedly) {
    grid.appendChild(repeatedlyBtn);
  }

  // Always add Settings and View Snoozed buttons at the end
  if (settingsBtn) {
    grid.appendChild(settingsBtn);
  }
  if (viewSnoozedBtn) {
    grid.appendChild(viewSnoozedBtn);
  }

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

  // Format date based on user preference
  function formatDate(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (format === 'DD-MM-YYYY') {
      return `${day}-${month}-${year}`;
    } else {
      return `${year}-${month}-${day}`;
    }
  }

  // Parse date based on user preference
  function parseDate(dateStr, format) {
    let day, month, year;

    if (format === 'DD-MM-YYYY') {
      // Format: "31-12-2025"
      const parts = dateStr.split('-');
      if (parts.length !== 3) return null;

      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = parseInt(parts[2]);
    } else {
      // Format: "2025-12-31"
      const parts = dateStr.split('-');
      if (parts.length !== 3) return null;

      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    }

    // Validate
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 1 || month > 12) return null;
    if (year < 2000 || year > 2100) return null;

    return { year, month, day };
  }

  // Calendar state
  let currentCalendarDate = new Date();
  let selectedDate = null;

  // Get month name
  function getMonthName(date) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()];
  }

  // Get days in month
  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  function getFirstDayOfMonth(year, month) {
    const day = new Date(year, month, 1).getDay();
    // Convert Sunday=0 to Sunday=6 (to make Monday=0)
    return day === 0 ? 6 : day - 1;
  }

  // Check if two dates are the same day
  function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // Render calendar
  function renderCalendar() {
    const calendarDays = document.getElementById('calendar-days');
    const calendarTitle = document.getElementById('calendar-title');

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Update title
    calendarTitle.textContent = `${getMonthName(currentCalendarDate)} ${year}`;

    // Clear calendar
    calendarDays.innerHTML = '';

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day empty';
      calendarDays.appendChild(emptyDay);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.textContent = day;

      const currentDate = new Date(year, month, day);

      // Mark today
      if (isSameDay(currentDate, today)) {
        dayElement.classList.add('today');
      }

      // Mark selected
      if (selectedDate && isSameDay(currentDate, selectedDate)) {
        dayElement.classList.add('selected');
      }

      // Disable past dates
      if (currentDate < today && !isSameDay(currentDate, today)) {
        dayElement.classList.add('disabled');
      } else {
        // Add click handler for future dates
        dayElement.addEventListener('click', () => {
          selectedDate = new Date(year, month, day);
          renderCalendar(); // Re-render to show selection
        });
      }

      calendarDays.appendChild(dayElement);
    }
  }

  async function showDatePicker() {
    console.log('showDatePicker called');
    console.log('modal element:', modal);

    const settings = await getSettings();
    const now = new Date();

    // Set default to 1 minute from now
    const defaultDateTime = new Date(now.getTime() + 60 * 1000);

    // Initialize calendar to current month
    currentCalendarDate = new Date(defaultDateTime);
    selectedDate = new Date(defaultDateTime);

    // Render the calendar
    renderCalendar();

    const timeInput = document.getElementById('custom-time');

    console.log('timeInput:', timeInput);

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
    button.addEventListener('click', async () => {
      const option = button.dataset.option;
      const isCustomPanel = button.dataset.customPanel === 'true';
      console.log('Snooze button clicked, option:', option, 'isCustomPanel:', isCustomPanel);

      if (option === 'pick-date') {
        console.log('Pick date option selected, calling showDatePicker');
        showDatePicker();
      } else if (option === 'repeatedly') {
        showRecurringModal();
      } else if (isCustomPanel) {
        // Handle custom panel
        const settings = await getSettings();
        const panel = settings.customPanels.find(p => p.id === option);
        if (panel) {
          const snoozeTime = calculateCustomPanelTime(panel);
          snoozeTab('custom', snoozeTime);
        }
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

  // Handle calendar navigation
  document.getElementById('prev-month').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });

  // Confirm button handler
  confirmBtn.addEventListener('click', async () => {
    const settings = await getSettings();
    const timeInput = document.getElementById('custom-time');

    // Check if a date is selected
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    const parsedTime = parseTime(timeInput.value, settings.timeFormat);
    if (!parsedTime) {
      const timeExample = settings.timeFormat === '12' ? '2:30 PM' : '14:30';
      alert(`Invalid time format. Please use: ${timeExample}`);
      return;
    }

    // Create date in local timezone using selected date from calendar
    const selectedDateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
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

  // ===== RECURRING EVENT MODAL =====

  const recurringModal = document.getElementById('recurring-modal');
  const confirmRecurringBtn = document.getElementById('confirm-recurring-btn');
  const cancelRecurringBtn = document.getElementById('cancel-recurring-btn');
  const frequencyButtons = document.querySelectorAll('.frequency-btn');
  const enableEndDateCheckbox = document.getElementById('enable-end-date');
  const endDateInput = document.getElementById('end-date');

  // Track current frequency
  let currentFrequency = 'daily';

  // Show recurring modal
  async function showRecurringModal() {
    const settings = await getSettings();
    const now = new Date();

    // Set default time to 1 minute from now
    const defaultDateTime = new Date(now.getTime() + 60 * 1000);
    const recurringTimeInput = document.getElementById('recurring-time');

    recurringTimeInput.placeholder = settings.timeFormat === '12' ? '2:30 PM' : '14:30';
    recurringTimeInput.value = formatTime(defaultDateTime, settings.timeFormat);

    // Reset frequency to daily
    currentFrequency = 'daily';
    frequencyButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.frequency === 'daily');
    });

    // Hide all frequency-specific options
    document.querySelectorAll('.recurring-option').forEach(el => {
      el.style.display = 'none';
    });

    // Reset end date
    enableEndDateCheckbox.checked = false;
    endDateInput.style.display = 'none';
    endDateInput.value = '';

    // Set defaults for monthly and yearly based on current date
    const dayOfMonth = now.getDate();
    const month = now.getMonth();
    document.getElementById('day-of-month').value = dayOfMonth;
    document.getElementById('day-of-month-yearly').value = dayOfMonth;
    document.getElementById('month-of-year').value = month;

    // Show modal
    recurringModal.style.display = 'flex';
  }

  // Handle frequency button clicks
  frequencyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      frequencyButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update current frequency
      currentFrequency = btn.dataset.frequency;

      // Hide all frequency-specific options
      document.querySelectorAll('.recurring-option').forEach(el => {
        el.style.display = 'none';
      });

      // Show relevant options based on frequency
      if (currentFrequency === 'weekly') {
        document.getElementById('weekly-options').style.display = 'block';
      } else if (currentFrequency === 'monthly') {
        document.getElementById('monthly-options').style.display = 'block';
      } else if (currentFrequency === 'yearly') {
        document.getElementById('yearly-options').style.display = 'block';
      }
    });
  });

  // Handle enable end date checkbox
  enableEndDateCheckbox.addEventListener('change', () => {
    endDateInput.style.display = enableEndDateCheckbox.checked ? 'block' : 'none';
    if (enableEndDateCheckbox.checked) {
      // Set default end date to 1 year from now
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      endDateInput.value = oneYearFromNow.toISOString().split('T')[0];
    }
  });

  // Confirm recurring button handler
  confirmRecurringBtn.addEventListener('click', async () => {
    try {
      const settings = await getSettings();
      const recurringTimeInput = document.getElementById('recurring-time');

      // Parse time
      const parsedTime = parseTime(recurringTimeInput.value, settings.timeFormat);
      if (!parsedTime) {
        const timeExample = settings.timeFormat === '12' ? '2:30 PM' : '14:30';
        alert(`Invalid time format. Please use: ${timeExample}`);
        return;
      }

      // Build recurrence pattern
      const recurrencePattern = {
        frequency: currentFrequency
      };

      // Calculate first occurrence
      const now = new Date();
      let firstOccurrence = new Date();
      firstOccurrence.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

      // If the time has already passed today, start tomorrow
      if (firstOccurrence.getTime() <= now.getTime()) {
        firstOccurrence.setDate(firstOccurrence.getDate() + 1);
      }

      // Add frequency-specific options
      if (currentFrequency === 'weekly') {
        // Get selected days of week
        const checkboxes = document.querySelectorAll('#weekly-options input[type="checkbox"]:checked');
        const selectedDays = Array.from(checkboxes).map(cb => parseInt(cb.value));

        if (selectedDays.length === 0) {
          alert('Please select at least one day of the week');
          return;
        }

        recurrencePattern.daysOfWeek = selectedDays;

        // Adjust first occurrence to next selected day of week
        let daysToAdd = 0;
        const maxDaysToCheck = 7;
        while (daysToAdd < maxDaysToCheck) {
          const checkDate = new Date(firstOccurrence);
          checkDate.setDate(checkDate.getDate() + daysToAdd);
          if (selectedDays.includes(checkDate.getDay())) {
            firstOccurrence.setDate(firstOccurrence.getDate() + daysToAdd);
            break;
          }
          daysToAdd++;
        }
      } else if (currentFrequency === 'monthly') {
        const dayOfMonth = parseInt(document.getElementById('day-of-month').value);
        recurrencePattern.dayOfMonth = dayOfMonth;

        // Set first occurrence to the selected day of this month
        firstOccurrence.setDate(dayOfMonth);

        // If already passed this month, move to next month
        if (firstOccurrence.getTime() <= now.getTime()) {
          firstOccurrence.setMonth(firstOccurrence.getMonth() + 1);
        }

        // Handle shorter months
        const daysInMonth = new Date(firstOccurrence.getFullYear(), firstOccurrence.getMonth() + 1, 0).getDate();
        firstOccurrence.setDate(Math.min(dayOfMonth, daysInMonth));
      } else if (currentFrequency === 'yearly') {
        const month = parseInt(document.getElementById('month-of-year').value);
        const dayOfMonth = parseInt(document.getElementById('day-of-month-yearly').value);

        recurrencePattern.month = month;
        recurrencePattern.dayOfMonth = dayOfMonth;

        // Set first occurrence to the selected month and day
        firstOccurrence.setMonth(month);
        firstOccurrence.setDate(dayOfMonth);

        // If already passed this year, move to next year
        if (firstOccurrence.getTime() <= now.getTime()) {
          firstOccurrence.setFullYear(firstOccurrence.getFullYear() + 1);
        }

        // Handle leap year (Feb 29)
        const daysInMonth = new Date(firstOccurrence.getFullYear(), month + 1, 0).getDate();
        firstOccurrence.setDate(Math.min(dayOfMonth, daysInMonth));
      }

      // Add end date if specified
      if (enableEndDateCheckbox.checked && endDateInput.value) {
        const endDate = new Date(endDateInput.value);
        endDate.setHours(23, 59, 59, 999); // End of day
        recurrencePattern.endDate = endDate.getTime();

        // Validate end date is after first occurrence
        if (recurrencePattern.endDate <= firstOccurrence.getTime()) {
          alert('End date must be after the first occurrence');
          return;
        }
      }

      // Get current tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (!tab) {
        console.error('No active tab found');
        return;
      }

      // Send message to background script
      await browser.runtime.sendMessage({
        action: 'snoozeRecurring',
        tab: {
          id: tab.id,
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl
        },
        firstOccurrence: firstOccurrence.getTime(),
        recurrencePattern: recurrencePattern
      });

      // Close modal and popup
      recurringModal.style.display = 'none';
      window.close();
    } catch (error) {
      console.error('Error setting up recurring snooze:', error);
      alert('Error setting up recurring snooze. Please try again.');
    }
  });

  // Cancel recurring button handler
  cancelRecurringBtn.addEventListener('click', () => {
    recurringModal.style.display = 'none';
  });

  // Close recurring modal on background click
  recurringModal.addEventListener('click', (e) => {
    if (e.target === recurringModal) {
      recurringModal.style.display = 'none';
    }
  });
});
