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
  const container = document.getElementById('snoozed-container');
  const tabsArray = Object.values(snoozedTabs);

  // Update stats
  const totalCount = tabsArray.length;
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const todayCount = tabsArray.filter(tab => tab.snoozeTime <= endOfDay.getTime()).length;

  document.getElementById('total-count').textContent = totalCount;
  document.getElementById('today-count').textContent = todayCount;

  if (tabsArray.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😴</div>
        <div class="empty-state-text">No snoozed tabs yet</div>
      </div>
    `;
    return;
  }

  // Sort by snooze time (earliest first)
  tabsArray.sort((a, b) => a.snoozeTime - b.snoozeTime);

  const listHtml = tabsArray.map(tab => createTabItem(tab)).join('');
  container.innerHTML = `<div class="snoozed-list">${listHtml}</div>`;

  // Add event listeners
  tabsArray.forEach(tab => {
    document.getElementById(`open-${tab.id}`).addEventListener('click', () => openNow(tab.id));
    document.getElementById(`delete-${tab.id}`).addEventListener('click', () => deleteSnooze(tab.id));
  });
}

function createTabItem(tab) {
  const snoozeDate = new Date(tab.snoozeTime);
  const now = Date.now();
  const timeUntil = getTimeUntil(now, tab.snoozeTime);

  const faviconHtml = tab.favIconUrl
    ? `<img src="${tab.favIconUrl}" class="favicon" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div class="favicon-placeholder" style="display:none;">🌐</div>`
    : `<div class="favicon-placeholder">🌐</div>`;

  // Generate recurring badge and info if applicable
  let recurringBadge = '';
  let recurringInfo = '';
  if (tab.recurring && tab.recurrencePattern) {
    const pattern = tab.recurrencePattern;
    recurringBadge = `<span class="recurring-badge">🔄 ${capitalizeFirst(pattern.frequency)}</span>`;

    // Generate detailed recurrence info
    let details = '';
    if (pattern.frequency === 'weekly' && pattern.daysOfWeek) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = pattern.daysOfWeek.map(d => dayNames[d]).join(', ');
      details = ` on ${days}`;
    } else if (pattern.frequency === 'monthly' && pattern.dayOfMonth) {
      details = ` on day ${pattern.dayOfMonth}`;
    } else if (pattern.frequency === 'yearly' && pattern.month !== undefined && pattern.dayOfMonth) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      details = ` on ${monthNames[pattern.month]} ${pattern.dayOfMonth}`;
    }

    recurringInfo = `<div class="recurring-info">Repeats ${pattern.frequency}${details}</div>`;

    if (pattern.endDate) {
      const endDate = new Date(pattern.endDate);
      recurringInfo += `<div class="recurring-info">Ends: ${endDate.toLocaleDateString()}</div>`;
    }
  }

  return `
    <div class="snoozed-item ${tab.recurring ? 'recurring-item' : ''}">
      ${faviconHtml}
      <div class="tab-info">
        <div class="tab-title">
          ${escapeHtml(tab.title)}
          ${recurringBadge}
        </div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
        ${recurringInfo}
      </div>
      <div class="snooze-info">
        <div class="snooze-time">${timeUntil}</div>
        <div class="snooze-date">${tab.recurring ? 'Next: ' : ''}${snoozeDate.toLocaleString()}</div>
      </div>
      <div class="actions">
        <button id="open-${tab.id}" class="action-btn open-now-btn">Open Now</button>
        <button id="delete-${tab.id}" class="action-btn delete-btn">Delete</button>
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
