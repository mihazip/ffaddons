// Load and display snoozed tabs
document.addEventListener('DOMContentLoaded', async () => {
  await loadSnoozedTabs();

  // Refresh every 30 seconds
  setInterval(loadSnoozedTabs, 30000);
});

async function loadSnoozedTabs() {
  try {
    const response = await browser.runtime.sendMessage({ action: 'getSnoozedTabs' });
    const snoozedTabs = response || {};

    displaySnoozedTabs(snoozedTabs);
  } catch (error) {
    console.error('Error loading snoozed tabs:', error);
  }
}

function displaySnoozedTabs(snoozedTabs) {
  const onetimeContainer = document.getElementById('onetime-container');
  const recurringContainer = document.getElementById('recurring-container');
  const tabsArray = Object.values(snoozedTabs);

  // Separate one-time and recurring tabs
  const onetimeTabs = tabsArray.filter(tab => !tab.recurring);
  const recurringTabs = tabsArray.filter(tab => tab.recurring);

  // Update stats
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const todayCount = tabsArray.filter(tab => tab.snoozeTime <= endOfDay.getTime()).length;

  document.getElementById('onetime-count').textContent = onetimeTabs.length;
  document.getElementById('recurring-count').textContent = recurringTabs.length;
  document.getElementById('today-count').textContent = todayCount;

  // Display one-time tabs
  if (onetimeTabs.length === 0) {
    onetimeContainer.innerHTML = `
      <div class="empty-section">No one-time snoozes scheduled</div>
    `;
  } else {
    // Sort by snooze time (earliest first)
    onetimeTabs.sort((a, b) => a.snoozeTime - b.snoozeTime);
    const listHtml = onetimeTabs.map(tab => createOnetimeTabItem(tab)).join('');
    onetimeContainer.innerHTML = `<div class="snoozed-list">${listHtml}</div>`;

    // Add event listeners for one-time tabs
    onetimeTabs.forEach(tab => {
      document.getElementById(`open-${tab.id}`).addEventListener('click', () => openNow(tab.id));
      document.getElementById(`delete-${tab.id}`).addEventListener('click', () => deleteSnooze(tab.id));
    });
  }

  // Display recurring tabs
  if (recurringTabs.length === 0) {
    recurringContainer.innerHTML = `
      <div class="empty-section">No recurring tabs scheduled</div>
    `;
  } else {
    // Sort by snooze time (earliest first)
    recurringTabs.sort((a, b) => a.snoozeTime - b.snoozeTime);
    const listHtml = recurringTabs.map(tab => createRecurringTabItem(tab)).join('');
    recurringContainer.innerHTML = `<div class="snoozed-list">${listHtml}</div>`;

    // Add event listeners for recurring tabs
    recurringTabs.forEach(tab => {
      document.getElementById(`open-${tab.id}`).addEventListener('click', () => openNow(tab.id));
      document.getElementById(`delete-${tab.id}`).addEventListener('click', () => deleteRecurringSeries(tab));
    });
  }
}

function createOnetimeTabItem(tab) {
  const snoozeDate = new Date(tab.snoozeTime);
  const now = Date.now();
  const timeUntil = getTimeUntil(now, tab.snoozeTime);

  const faviconHtml = tab.favIconUrl
    ? `<img src="${tab.favIconUrl}" class="favicon" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div class="favicon-placeholder" style="display:none;">🌐</div>`
    : `<div class="favicon-placeholder">🌐</div>`;

  return `
    <div class="snoozed-item">
      ${faviconHtml}
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
      </div>
      <div class="snooze-info">
        <div class="snooze-time">${timeUntil}</div>
        <div class="snooze-date">${snoozeDate.toLocaleString()}</div>
      </div>
      <div class="actions">
        <button id="open-${tab.id}" class="action-btn open-now-btn">Open Now</button>
        <button id="delete-${tab.id}" class="action-btn delete-btn">Delete</button>
      </div>
    </div>
  `;
}

function createRecurringTabItem(tab) {
  const snoozeDate = new Date(tab.snoozeTime);
  const now = Date.now();
  const timeUntil = getTimeUntil(now, tab.snoozeTime);
  const pattern = tab.recurrencePattern;

  const faviconHtml = tab.favIconUrl
    ? `<img src="${tab.favIconUrl}" class="favicon" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div class="favicon-placeholder" style="display:none;">🌐</div>`
    : `<div class="favicon-placeholder">🌐</div>`;

  // Generate recurrence description
  let recurrenceDesc = `Repeats ${pattern.frequency}`;
  if (pattern.frequency === 'weekly' && pattern.daysOfWeek) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = pattern.daysOfWeek.map(d => dayNames[d]).join(', ');
    recurrenceDesc += ` on ${days}`;
  } else if (pattern.frequency === 'monthly' && pattern.dayOfMonth) {
    recurrenceDesc += ` on day ${pattern.dayOfMonth}`;
  } else if (pattern.frequency === 'yearly' && pattern.month !== undefined && pattern.dayOfMonth) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    recurrenceDesc += ` on ${monthNames[pattern.month]} ${pattern.dayOfMonth}`;
  }

  // Format time
  const timeStr = snoozeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  recurrenceDesc += ` at ${timeStr}`;

  // End date info
  let endDateInfo = '';
  if (pattern.endDate) {
    const endDate = new Date(pattern.endDate);
    endDateInfo = `<div class="recurring-info">Ends: ${endDate.toLocaleDateString()}</div>`;
  }

  return `
    <div class="snoozed-item recurring-item">
      ${faviconHtml}
      <div class="tab-info">
        <div class="tab-title">
          ${escapeHtml(tab.title)}
          <span class="recurring-badge">🔄 ${capitalizeFirst(pattern.frequency)}</span>
        </div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
        <div class="recurring-info">${recurrenceDesc}</div>
        ${endDateInfo}
      </div>
      <div class="snooze-info">
        <div class="snooze-time">${timeUntil}</div>
        <div class="snooze-date">Next: ${snoozeDate.toLocaleString()}</div>
      </div>
      <div class="actions">
        <button id="open-${tab.id}" class="action-btn open-now-btn">Open Now</button>
        <button id="delete-${tab.id}" class="action-btn delete-btn">Stop Series</button>
      </div>
    </div>
  `;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTimeUntil(now, future) {
  const diff = future - now;

  if (diff < 0) {
    return 'Overdue';
  }

  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `in ${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return 'in less than a minute';
  }
}

async function openNow(snoozeId) {
  try {
    await browser.runtime.sendMessage({
      action: 'unsnoozeTab',
      snoozeId: snoozeId
    });

    // Reload the list
    await loadSnoozedTabs();
  } catch (error) {
    console.error('Error opening tab:', error);
  }
}

async function deleteSnooze(snoozeId) {
  if (!confirm('Are you sure you want to delete this snoozed tab?')) {
    return;
  }

  try {
    await browser.runtime.sendMessage({
      action: 'deleteSnooze',
      snoozeId: snoozeId
    });

    // Reload the list
    await loadSnoozedTabs();
  } catch (error) {
    console.error('Error deleting snooze:', error);
  }
}

async function deleteRecurringSeries(tab) {
  const message = `Are you sure you want to stop this recurring tab?\n\n"${tab.title}"\n\nThis will cancel all future occurrences.`;
  
  if (!confirm(message)) {
    return;
  }

  try {
    await browser.runtime.sendMessage({
      action: 'deleteSnooze',
      snoozeId: tab.id
    });

    // Reload the list
    await loadSnoozedTabs();
  } catch (error) {
    console.error('Error deleting recurring series:', error);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
