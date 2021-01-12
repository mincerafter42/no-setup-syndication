# No Setup Syndication
Features of this extension:
- Works immediately upon installation
- Allows the user to choose RSS feeds
- Display contents of the chosen RSS feeds in chronological order in a popup when extension is used
- Keeps track of most recent time user opened the extension
  - Uses this to display a visual difference between read posts and unread posts
  - Also uses this to display the number of unread posts in the badge, updating in regular intervals (user-defined with a default)
- Customizable date format (using `Intl.DateTimeFormat`);
- Support for enclosed media
  - Optional ability to download enclosed media
- Functions on both Chromium and Firefox (Firefox supports the `chrome` namespace)

This extension is still under development. I plan to distribute it for Chrome and Firefox when it is ready for release.

Things I'm still working on:
- Visual appeal
- Accessibility
- Support for Atom feeds

Contents of the /icons folder are used under the Mozilla Public License.

## Installation instructions
### Installation instructions for Chromium
Go to <chrome://extensions>. Enable **Developer Mode**. Click **Load Unpacked** and select an uncompressed folder containing these files.
Known issue: If Chromium's setting "Ask where to save each file before downloading" is enabled, and this extension's setting "Download enclosed media" is enabled, save prompts will show for the enclosed media. This is [a known issue with Chromium](https://bugs.chromium.org/p/chromium/issues/detail?id=417112).
### Temporary installation instructions for Firefox
Go to <about:debugging#/runtime/this-firefox>. Click **Load temporary add-on** and select the `manifest.json` file.
