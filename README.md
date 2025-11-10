# Firefox Addons Collection

A collection of Firefox/Chrome browser extensions.

## Extensions

### 🌙 Tab Snooze

Snooze tabs and reopen them later at your chosen time. Features include:
- Quick snooze presets (Later Today, Tomorrow, Next Week, etc.)
- Custom date/time picker
- Manage snoozed tabs
- Configurable settings
- Desktop notifications

[Read more →](./tab-snooze/README.md)

## Installation

Each extension has its own directory with a README containing installation instructions.

### General Steps for Development

1. Navigate to the extension directory
2. Generate required icon assets (if applicable)
3. Load the extension in your browser:
   - **Firefox**: `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on"
   - **Chrome**: `chrome://extensions/` → Enable "Developer mode" → "Load unpacked"

## Structure

```
ffaddons/
├── tab-snooze/          # Tab snoozing extension
│   ├── manifest.json
│   ├── popup.html
│   ├── background.js
│   └── ...
└── [future extensions]/
```

## Contributing

Feel free to contribute improvements or report issues!

## License

MIT License
