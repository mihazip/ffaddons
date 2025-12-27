# 🌙 Tab Snooze

A browser extension that lets you snooze tabs and reopen them later at your chosen time.

## Features

- **Quick Snooze Options**: 3x4 grid of preset snooze times
  - Later Today (configurable)
  - This Evening
  - Tomorrow
  - Tomorrow Evening
  - Next Weekend
  - Next Week
  - In a Month
  - Someday
  - Pick a Custom Date
  - Repeatedly (coming soon)

- **Customizable Settings**: Configure snooze durations and times
- **Manage Snoozed Tabs**: View all your snoozed tabs in one place
- **Notifications**: Get notified when tabs are snoozed and unsnoozed
- **Persistent Storage**: Tabs will reopen even if the browser was closed
- **Cross-Device Sync**: Snoozed tabs sync across devices via Firefox Sync (when signed in)
- **Export/Import**: Backup and restore your snoozed tabs with JSON export/import

## Installation

### Firefox

1. Open the `icons/generate-icons.html` file in your browser
2. Click "Generate All Icons" and download each icon to the `icons/` folder
3. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the `tab-snooze` directory

### Chrome

1. Generate the icon files as described above
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `tab-snooze` directory

## Usage

### Snoozing a Tab

1. Click the moon icon in your browser toolbar
2. Select one of the snooze options
3. The tab will close and reopen at the scheduled time

### Viewing Snoozed Tabs

1. Click the moon icon
2. Click "View Snoozed" button
3. See all your snoozed tabs with:
   - Time remaining
   - Option to open immediately
   - Option to delete the snooze

### Configuring Settings

1. Click the moon icon
2. Click the "Settings" button
3. Adjust:
   - Later Today duration (in hours)
   - Evening time (default: 6:00 PM)
   - Morning time (default: 9:00 AM)
   - Notification preferences

## How It Works

When you snooze a tab:
1. The extension saves the tab's URL, title, and favicon
2. Creates an alarm for the specified time
3. Closes the tab
4. When the alarm fires (or when you open your browser after the time has passed), the tab reopens
5. You receive a notification that the tab has been unsnoozed

## File Structure

```
tab-snooze/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup UI
├── popup.js              # Popup logic
├── styles.css            # Popup styling
├── background.js         # Background script (manages snoozes)
├── options.html          # Settings page
├── options.js            # Settings logic
├── snoozed.html          # View snoozed tabs page
├── snoozed.js            # Snoozed tabs logic
├── icons/                # Extension icons
│   ├── moon.svg          # Vector icon
│   ├── generate-icons.html  # Icon generator tool
│   ├── moon-16.png
│   ├── moon-32.png
│   ├── moon-48.png
│   └── moon-128.png
└── README.md             # This file
```

## Privacy

This extension:
- Stores data locally in your browser only
- Does not send any data to external servers
- Does not track your browsing
- Only requires permissions necessary for its functionality

## Permissions

- `tabs`: To access tab information and close/open tabs
- `alarms`: To schedule when tabs should reopen
- `storage`: To save snoozed tabs persistently
- `notifications`: To notify you when tabs are snoozed/unsnoozed

## Development

This extension is built with vanilla JavaScript and uses the WebExtensions API, making it compatible with both Firefox and Chrome.

### Browser API Compatibility

The extension uses `browser.*` APIs (Firefox standard). For Chrome, you may need to add a polyfill or use Chrome's `chrome.*` APIs.

## Future Features

- Recurring snoozes (daily, weekly, etc.)
- Snooze multiple tabs at once
- Keyboard shortcuts
- Dark/light theme toggle

## License

MIT License - Feel free to use and modify as needed.

## Firefox Add-on Signing & Manifest

### Extension ID

For Firefox add-ons to be properly signed and distributed via addons.mozilla.org (AMO), the extension needs a unique identifier. This is configured in `manifest.json` under `browser_specific_settings`:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "tab-snooze@ffaddons.local"
  }
}
```

The `id` field:
- Must be unique across all Firefox add-ons
- Can be an email-style ID (`addon-name@your-domain`) or a UUID
- Is required for signing and distribution on AMO
- Ensures consistent storage isolation between versions

### Data Collection Disclosure

Firefox requires extensions to declare their data collection practices. The `data_collection_permissions` field in the manifest documents what data the extension accesses:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "tab-snooze@ffaddons.local",
    "data_collection_permissions": {
      "required": ["websiteContent"]
    }
  }
}
```

This declaration indicates:
- The extension accesses tab URLs and titles (website content)
- All data is stored locally and synced via Firefox Sync
- No data is transmitted to external servers

### Signing Process

To distribute the extension on AMO:

1. Create an account at [addons.mozilla.org](https://addons.mozilla.org)
2. Go to Developer Hub → Submit a New Add-on
3. Upload a ZIP file containing all extension files
4. AMO will validate the manifest and sign the extension
5. Once approved, users can install from AMO

For self-distribution (outside AMO):
1. Use the [web-ext](https://github.com/mozilla/web-ext) tool
2. Run `web-ext sign --api-key=YOUR_KEY --api-secret=YOUR_SECRET`
3. Distribute the signed `.xpi` file

### Storage Considerations

This extension uses `browser.storage.sync` for snoozed tabs, which:
- Syncs data across devices when signed into Firefox Sync
- Falls back to local storage if not signed in
- Has a 100KB total storage limit
- Persists across browser updates and reinstalls (with same extension ID)

**Note for developers**: Temporary add-ons (loaded via `about:debugging`) use isolated storage, separate from signed versions. Always export your snoozed tabs before testing with temporary add-ons.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
