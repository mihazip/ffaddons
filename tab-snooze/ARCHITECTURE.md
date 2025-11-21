# Tab Snooze Extension - Architecture Documentation

This document provides a comprehensive overview of the Tab Snooze extension architecture, design decisions, and context for future development phases.

## Overview

Tab Snooze is a Firefox extension that allows users to temporarily hide (snooze) tabs and have them automatically reopen at a specified time. The extension supports preset snooze durations, custom date/time selection, and recurring snoozes.

## File Structure

```
tab-snooze/
├── manifest.json           # Extension metadata and permissions
├── popup.html              # Main popup UI (snooze options + modals)
├── popup.js                # Popup logic (time calculations + UI handlers)
├── background.js           # Core background logic (alarms, storage, scheduling)
├── options.html            # Settings page UI
├── options.js              # Settings page logic (save/load preferences)
├── snoozed.html            # Snoozed tabs management page
├── snoozed.js              # List display + tab management
├── styles.css              # All styling (popup + modals)
└── icons/                  # Extension icons (16, 32, 48, 128px)
```

## Core Components

### 1. Popup UI (`popup.html` + `popup.js`)

**Purpose**: Main user interface for snoozing tabs

**Structure**:
- **Snooze Grid**: 3-column grid of preset snooze options
- **Advanced Options**: Pick a Date and Repeatedly buttons (toggleable)
- **Navigation**: Settings and View Snoozed buttons (always visible)
- **Modals**: Date picker and recurring snooze configuration

**Key Functions** (`popup.js`):
- `calculateSnoozeTime(option)` - Converts preset option to millisecond timestamp
- `formatTimingDisplay(option)` - Generates human-readable time display
- `snoozeTab(option, customTime)` - Sends snooze request to background script

### 2. Background Script (`background.js`)

**Purpose**: Core snooze logic, alarm management, and tab restoration

**Key Functions**:
- `handleSnoozeTab(tab, snoozeTime)` - Stores tab, creates alarm, closes tab
- `handleSnoozeRecurring(tab, firstOccurrence, recurrencePattern)` - Creates first recurring instance
- `openSnoozedTab(snoozeId)` - Restores tab when alarm fires
- `calculateNextOccurrence(currentTime, pattern)` - Calculates next recurring date

**Storage**:
- Uses `browser.storage.local` for snoozed tabs data
- Uses `browser.alarms` API for scheduled tab restoration

### 3. Settings Page (`options.html` + `options.js`)

**Purpose**: User preferences for snooze times and UI customization

**Settings Categories**:
1. **Snooze Durations**: Custom times for presets
2. **Advanced Options**: Toggle visibility of Pick a Date / Repeatedly buttons
3. **Date & Time Format**: Display preferences
4. **Notifications**: Snooze and unsnooze notification settings

**Key Functions** (`options.js`):
- `loadSettings()` - Loads settings from `browser.storage.sync`
- `saveSettings()` - Validates and saves settings
- `setupRadioHandlers()` - Manages radio button groups with custom time option
- `getRadioValue()` / `setRadioValue()` - Helper functions for radio groups

### 4. Snoozed Tabs Page (`snoozed.html` + `snoozed.js`)

**Purpose**: View and manage all snoozed tabs

**Features**:
- List of all snoozed tabs with time remaining
- Quick actions: Open Now, Delete
- Stats: Total snoozed, Due today
- Auto-refresh every 30 seconds

## Settings System

### Settings Structure

```javascript
{
  // Snooze Durations
  laterTodayHours: 3,           // Hours for "Later Today" (1-12)
  eveningTime: '18:00',         // Time for evening snoozes
  morningTime: '09:00',         // Time for morning snoozes
  weekendTime: '10:00',         // Time for weekend snoozes
  somedayValue: 3,              // Someday duration value (1-999)
  somedayUnit: 'months',        // Someday duration unit (days/weeks/months/years)

  // UI Customization
  showPickDate: true,           // Show "Pick a Date" button
  showRepeatedly: true,         // Show "Repeatedly" button

  // Display Preferences
  dateFormat: 'DD-MM-YYYY',     // Date display format
  timeFormat: '24',             // 24-hour or 12-hour time

  // Notifications
  showSnoozeNotification: true,           // Notify when tab is snoozed
  unsnoozeNotificationMode: 'individual'  // 'individual'|'bundled'|'off'
}
```

### Time Settings UI Pattern

**Radio Buttons with Custom Option**:
- Preset options (e.g., 17:00, 18:00, 19:00)
- "Custom" radio button that reveals a time picker
- Automatically detects if saved time matches a preset or is custom

**Implementation**:
- `setRadioValue()` handles loading custom vs preset times
- `getRadioValue()` extracts selected time (from preset or custom input)
- `setupRadioHandlers()` shows/hides custom input when "Custom" is selected

## Time Calculation Logic

### Preset Options

| Option | Calculation | Uses Setting |
|--------|-------------|--------------|
| Later Today | Current time + N hours | `laterTodayHours` |
| This Evening | Today at evening time (or tomorrow if past) | `eveningTime` |
| Tomorrow | Tomorrow at morning time | `morningTime` |
| Tomorrow Eve | Tomorrow at evening time | `eveningTime` |
| Next Weekend | Next Saturday at weekend time | `weekendTime` |
| Next Week | 7 days from now at morning time | `morningTime` |
| In a Month | Next month at morning time | `morningTime` |
| Someday | Custom duration from now at morning time | `somedayValue` + `somedayUnit` + `morningTime` |

### Someday Calculation

The "Someday" option now supports flexible durations:

```javascript
switch (settings.somedayUnit) {
  case 'days':
    date.setDate(date.getDate() + settings.somedayValue);
    break;
  case 'weeks':
    date.setDate(date.getDate() + (settings.somedayValue * 7));
    break;
  case 'months':
    date.setMonth(date.getMonth() + settings.somedayValue);
    break;
  case 'years':
    date.setFullYear(date.getFullYear() + settings.somedayValue);
    break;
}
```

## Phase 1 Implementation (Completed)

### Goals
- Allow users to customize times for existing preset buttons
- Add show/hide toggles for advanced options
- Maintain backward compatibility with existing installations

### Changes Made

#### 1. Settings Page (`options.html`)
- ✅ Added radio button groups for Evening/Morning/Weekend times
- ✅ Added number input + dropdown for Someday duration
- ✅ Added checkboxes to show/hide Pick a Date and Repeatedly buttons
- ✅ Added CSS for radio groups and custom time inputs

#### 2. Settings Logic (`options.js`)
- ✅ Updated default settings with new options
- ✅ Implemented radio button handling (preset + custom)
- ✅ Added validation for Someday value (1-999)
- ✅ Added helper functions for radio group management

#### 3. Time Calculations (`popup.js`)
- ✅ Updated `getSettings()` to include new settings
- ✅ Modified `calculateSnoozeTime()` to use custom times instead of hardcoded values
- ✅ Updated `formatTimingDisplay()` to show dynamic Someday duration
- ✅ Added logic to hide/show advanced option buttons

### Migration Strategy

**Backward Compatibility**:
- Default settings match original hardcoded values
- Existing users will see no change until they customize settings
- New settings are optional and have sensible defaults

## Phase 2 Implementation (Completed)

### Goals
- Allow users to show/hide individual preset buttons ✅
- Enable reordering of snooze option buttons ✅
- Maintain Settings and View Snoozed as always-visible navigation ✅

### Changes Made

#### 1. Settings Structure (`options.js` + `popup.js`)
Added two new settings to `defaultSettings`:

```javascript
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
```

- **`panelVisibility`**: Object mapping button IDs to boolean values (show/hide)
- **`panelOrder`**: Array of button IDs defining the display order in the grid

#### 2. Popup Rendering (`popup.js`)
Modified the popup initialization to dynamically render buttons:

- Load `panelVisibility` and `panelOrder` from settings
- Clear the grid and rebuild it based on settings
- Filter buttons by visibility (only show checked buttons)
- Sort buttons according to `panelOrder`
- Append advanced options (Pick a Date, Repeatedly) if enabled
- Always append Settings and View Snoozed buttons at the end

**Key Code** (`popup.js:266-315`):
```javascript
// Phase 2: Reorder buttons in the grid based on settings
const grid = document.querySelector('.snooze-grid');
const allButtons = Array.from(grid.querySelectorAll('.snooze-btn[data-option]'));

// Separate preset buttons from special buttons
const presetButtons = allButtons.filter(btn => {
  const option = btn.dataset.option;
  return settings.panelOrder.includes(option);
});

// Clear the grid
grid.innerHTML = '';

// Add preset buttons in order, filtering by visibility
for (const optionId of settings.panelOrder) {
  if (settings.panelVisibility[optionId]) {
    const button = presetButtons.find(btn => btn.dataset.option === optionId);
    if (button) {
      grid.appendChild(button);
      // Update timing display
    }
  }
}

// Add advanced options + always-visible buttons
```

#### 3. Settings Page UI (`options.html`)
Added a new "Button Grid Customization" section with:

- Visual list of all preset buttons
- Drag handles (☰) for reordering
- Checkboxes for show/hide
- Button icons and labels for easy identification

**HTML Structure**:
```html
<div class="setting-group">
  <h2>Button Grid Customization</h2>
  <div class="description">
    Show/hide and reorder preset snooze buttons. Drag buttons to reorder them.
    Settings and View Snoozed buttons are always visible.
  </div>
  <div id="button-grid-customizer">
    <!-- Populated by JavaScript -->
  </div>
</div>
```

#### 4. Drag-and-Drop Implementation (`options.js`)
Implemented full drag-and-drop functionality:

- **Button Metadata**: Added `buttonMetadata` object with icons and labels
- **Render Function**: `renderButtonGrid()` creates draggable items
- **Drag Handlers**:
  - `handleDragStart` - Sets dragged item
  - `handleDragOver` - Allows drop
  - `handleDragEnter/Leave` - Visual feedback
  - `handleDrop` - Reorders items in DOM
  - `handleDragEnd` - Cleanup
- **Save/Load**:
  - `getCurrentPanelOrder()` - Reads order from DOM
  - `getCurrentPanelVisibility()` - Reads checkboxes from DOM

**Key Functions** (`options.js:192-313`):
```javascript
function renderButtonGrid(panelOrder, panelVisibility) {
  // Create draggable items for each button
  // Add drag event listeners
  // Render with current state
}

function handleDrop(e) {
  // Reorder DOM elements based on drop position
}

function getCurrentPanelOrder() {
  // Extract button order from DOM
}

function getCurrentPanelVisibility() {
  // Extract visibility from checkboxes
}
```

#### 5. CSS Styling (`options.html`)
Added styles for the grid customizer:

- `.button-grid-item` - Individual button row with flex layout
- `.dragging` - Visual feedback during drag
- `.drag-over` - Visual feedback for drop target
- `.drag-handle` - Grab cursor for drag handle
- Hover effects and transitions

### Validation
Added validation to ensure at least one button is visible:

```javascript
const visibleCount = Object.values(settings.panelVisibility).filter(v => v).length;
if (visibleCount === 0) {
  showStatus('At least one snooze button must be visible', 'error');
  return;
}
```

### User Experience
1. **Settings Page**: Users can drag buttons to reorder them, and check/uncheck to show/hide
2. **Popup**: Buttons appear in the custom order with only visible buttons shown
3. **Always Visible**: Settings and View Snoozed buttons remain at the end regardless of customization
4. **Advanced Options**: Pick a Date and Repeatedly buttons (from Phase 1) are separate from grid customization

### Backward Compatibility
- Default settings show all buttons in original order
- Existing installations will see no change until they customize
- All 8 preset buttons are visible by default

## Phase 3 Implementation (Completed)

### Phase 3: Custom Snooze Panels

**Goals**:
- Allow users to create fully custom snooze buttons ✅
- Support custom name, icon (emoji), and time calculation ✅
- No recurring support for custom panels (use Repeatedly button) ✅

**Implemented Time Calculation Types**:
1. **Relative**: X hours from now (e.g., "Coffee Break" = 15 minutes)
2. **Relative with Time**: X days from now at specific time (e.g., "Tomorrow Morning" = 1 day at 09:00)
3. **Next Weekday**: Next occurrence of a weekday (e.g., "Next Monday" at 09:00)
4. **Absolute Time**: Specific time today/tomorrow (e.g., "EOD" = today at 17:00)

**Storage Structure**:
```javascript
customPanels: [
  {
    id: 'custom-coffee-break',
    name: 'Coffee Break',
    icon: '☕',
    type: 'relative',        // 'relative' | 'relative-time' | 'next-weekday' | 'absolute'
    value: 0.25,             // hours for relative, days for relative-time
    time: '14:30',           // for relative-time, next-weekday, absolute
    weekday: 1,              // 0-6 for next-weekday
    enabled: true
  }
]
```

### Changes Made

#### 1. Settings Structure (`options.js` + `popup.js`)
Added `customPanels` array to `defaultSettings`:

```javascript
customPanels: []  // Array of custom panel objects
```

Each custom panel object contains:
- `id`: Unique identifier (`custom-${timestamp}`)
- `name`: Panel display name (max 20 characters)
- `icon`: Emoji character
- `type`: Calculation type (relative/relative-time/next-weekday/absolute)
- `value`: Numeric value for relative calculations
- `time`: Time string for time-based calculations
- `weekday`: Day of week (0-6) for next-weekday type
- `enabled`: Boolean to show/hide panel

#### 2. Settings Page UI (`options.html`)
Added a new "Custom Snooze Panels" section with:

- **Panels List**: Shows all created custom panels with icons and descriptions
- **Add/Edit/Delete Controls**: Buttons for managing panels
- **Enable/Disable Toggle**: Checkboxes to show/hide individual panels
- **Modal Dialog**: Full-featured form for creating/editing panels

**Modal Features**:
- Panel name input (max 20 characters)
- Emoji picker grid (72 emojis organized by category)
- Calculation type dropdown
- Conditional inputs that show/hide based on selected type:
  - **Relative**: Hours input (0.25-24 hours)
  - **Relative with Time**: Days input + time picker
  - **Next Weekday**: Weekday dropdown + time picker
  - **Absolute**: Time picker

#### 3. Settings Page Logic (`options.js`)
Implemented comprehensive custom panel management:

**Key Functions**:
- `initCustomPanels()` - Loads and initializes panels on page load
- `renderCustomPanelsList()` - Displays panels with icons and details
- `getCalculationDetailsText()` - Generates human-readable descriptions
- `renderEmojiPicker()` - Creates 8x9 grid of 72 emojis
- `showCustomPanelModal()` - Opens modal for add/edit
- `updateCalculationInputs()` - Shows/hides type-specific inputs
- `saveCustomPanel()` - Validates and saves panel to storage
- `editCustomPanel()` - Loads panel data for editing
- `deleteCustomPanel()` - Removes panel with confirmation

**Validation**:
- Panel name required and max 20 characters
- Icon selection required
- Type-specific validation (hours 0.25-24, days 1-365, etc.)

#### 4. Popup Rendering (`popup.js`)
Modified popup grid rendering to include custom panels:

**Rendering Order**:
1. Preset buttons (filtered and ordered by Phase 2 settings)
2. **Custom panels** (filtered by `enabled` flag)
3. Advanced options (Pick a Date, Repeatedly)
4. Always-visible buttons (Settings, View Snoozed)

**Button Creation**:
```javascript
const button = document.createElement('button');
button.className = 'snooze-btn';
button.dataset.option = panel.id;
button.dataset.customPanel = 'true';
button.innerHTML = `
  <div class="icon">${panel.icon}</div>
  <div class="label">${panel.name}</div>
  <div class="timing">${timingText}</div>
`;
```

#### 5. Time Calculation (`popup.js`)
Added two new functions for custom panel time handling:

**`calculateCustomPanelTime(panel)`**:
- **Relative**: Adds hours to current time
- **Relative with Time**: Adds days and sets specific time
- **Next Weekday**: Finds next occurrence of weekday at time
- **Absolute**: Sets time today or tomorrow if passed

**`formatCustomPanelTiming(panel)`**:
- Respects user's 12/24-hour format preference
- Shows "in X min/hours" for relative
- Shows day name and date for future dates
- Shows "tomorrow" prefix for next-day absolute times

#### 6. Click Handler Updates (`popup.js`)
Updated snooze button click handler to detect and handle custom panels:

```javascript
if (isCustomPanel) {
  const panel = settings.customPanels.find(p => p.id === option);
  if (panel) {
    const snoozeTime = calculateCustomPanelTime(panel);
    snoozeTab('custom', snoozeTime);
  }
}
```

### User Experience
1. **Settings Page**: Users can add unlimited custom panels with unique names and emojis
2. **Visual Feedback**: Each panel shows icon, name, and calculation description
3. **Easy Management**: Edit/Delete buttons, plus enable/disable toggles
4. **Popup**: Custom panels appear after preset buttons with calculated timing
5. **Type Safety**: Conditional inputs prevent invalid configurations

### Backward Compatibility
- Default `customPanels` is an empty array
- Existing installations see no changes until they add custom panels
- Custom panels are optional and don't affect preset functionality

### UI Considerations (Implemented)**:
- Settings page: Form to add/edit/delete custom panels ✅
- Emoji picker for icon selection ✅
- Dropdown for time calculation type ✅
- Conditional inputs based on selected type ✅
- Calculated time display in timing element ✅

### Phase 4: Improved Time Pickers (Planned)

**Current Issue**: `<input type="time">` has poor UX (text field, inconsistent behavior)

**Proposed Solutions**:
1. **Settings Page**: Keep radio presets (good UX already)
2. **Modals** (Pick a Date, Repeatedly):
   - Replace with dual dropdown: Hour (00-23) + Minute (00, 15, 30, 45)
   - Add number input with datalist as fallback for keyboard users
   - Better accessibility and mobile-friendly

**Implementation**:
```html
<div class="time-picker">
  <select id="hours">
    <option value="00">00</option>
    ...
    <option value="23">23</option>
  </select>
  <span>:</span>
  <select id="minutes">
    <option value="00">00</option>
    <option value="15">15</option>
    <option value="30">30</option>
    <option value="45">45</option>
  </select>
</div>
```

## Design Decisions

### Why Radio Buttons for Time Settings?

**Pros**:
- Common times are one click away
- Clear visual representation of all options
- Custom option still available for power users
- No hidden states

**Alternatives Considered**:
- Pure dropdown: Less scannable, hides options
- Pure time picker: No quick presets, slower UX
- Slider: Novel but harder to use precisely

### Why Separate "Advanced Options" Section?

**Reasoning**:
- Pick a Date and Repeatedly open modals (different behavior than presets)
- Not everyone uses these features
- Allows users to simplify UI if they only use presets
- Maintains clear separation between quick actions and complex actions

### Why Keep Settings/View Snoozed Always Visible?

**Reasoning**:
- Settings access must always be available (user might hide everything accidentally)
- View Snoozed is core functionality, not optional
- These are navigation, not snooze actions
- Prevents user from getting "locked out" of configuration

## Development Guidelines

### Adding New Settings

1. Add to `defaultSettings` in both `options.js` and `popup.js`
2. Add UI in `options.html` (with appropriate input type)
3. Add load logic in `loadSettings()` (`options.js`)
4. Add save logic in `saveSettings()` with validation (`options.js`)
5. Add usage in relevant functions (`popup.js` or `background.js`)

### Modifying Time Calculations

1. Update `calculateSnoozeTime()` in `popup.js`
2. Update corresponding case in `formatTimingDisplay()`
3. Test edge cases (past midnight, month boundaries, leap years)
4. Consider recurring snooze implications (if applicable)

### Testing Checklist

- [ ] New settings save and load correctly
- [ ] Default values work for new installations
- [ ] Existing installations migrate without issues
- [ ] All time calculations use settings (no hardcoded values remain)
- [ ] Edge cases handled (midnight rollover, invalid times)
- [ ] UI updates in real-time when settings change
- [ ] Radio button custom inputs show/hide correctly

## Known Limitations

1. **Browser Storage Limits**: `browser.storage.sync` has quotas (implementation note for Phase 3)
2. **Alarm Precision**: Browser alarms can be delayed by a few seconds
3. **Time Picker UX**: Current `<input type="time">` is not ideal (Phase 4 addresses this)
4. **No Panel Icons Yet**: Phase 3 will add emoji picker for custom panels

## Communication Between Components

```
┌─────────────┐
│  Popup UI   │
│ (popup.js)  │
└──────┬──────┘
       │ browser.runtime.sendMessage()
       ↓
┌─────────────┐      ┌──────────────┐
│ Background  │◄────►│ browser.     │
│ (background │      │ storage.     │
│    .js)     │      │ local/sync   │
└──────┬──────┘      └──────────────┘
       │
       ↓
┌─────────────┐
│ browser.    │
│ alarms      │
│ (triggers   │
│  tab open)  │
└─────────────┘
```

## Debugging Tips

- Check browser console for errors in popup.js
- Check background page console for background.js errors
- Inspect storage: `browser.storage.sync.get()` in console
- List alarms: `browser.alarms.getAll()` in console
- Test with short durations (seconds) during development

## Version History

- **v1.0.0**: Initial release with hardcoded times
- **v1.1.0**: Added recurring snoozes
- **v1.2.0**: Phase 1 - Custom time settings
- **v1.3.0**: Phase 2 - Grid customization
- **v1.4.0**: Phase 3 - Custom panels (current)
- **v1.5.0** (planned): Phase 4 - Improved time pickers

---

**Last Updated**: 2025-11-21
**Author**: Claude Code (Anthropic)
**Current Phase**: Phase 3 Complete - Custom Snooze Panels
**Next Phase**: Phase 4 - Improved Time Pickers
