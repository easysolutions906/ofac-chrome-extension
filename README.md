# OFAC Quick Screen -- Chrome Extension

Right-click any selected text on a webpage to screen it against the OFAC sanctions list (SDN).

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select this `chrome-extension/` directory
5. The extension icon will appear in your toolbar

## Usage

1. Select any name or text on a webpage
2. Right-click the selection
3. Click **Screen "..." against OFAC**
4. Results appear in the popup

### Match scoring

- **Exact** (95-100%) -- Red badge. Strong indication of a sanctions match.
- **Strong** (80-94%) -- Orange badge. Likely match; manual review recommended.
- **Partial** (60-79%) -- Yellow badge. Possible match; verify details.
- **Low** (<60%) -- Gray badge. Unlikely match.

## Free Tier

Without an API key, you get **5 free screens per day**. The counter resets at midnight (local time).

## Unlimited Screening

1. Click the extension icon
2. Open **Settings** at the bottom
3. Click **Get API Key** to purchase a key
4. Paste the key into the input field and click **Save**

With an API key, there is no daily limit.

## API

This extension screens against the live OFAC SDN list via:

```
POST https://ofac-screening-production.up.railway.app/screen
```

## Notes

- The extension does not include custom icons. Chrome will use a default icon. Replace with proper PNG icons (16x16, 48x48, 128x128) by adding an `icons` field to `manifest.json`.
- This is a compliance screening tool. Always verify matches through official OFAC sources before taking action.
