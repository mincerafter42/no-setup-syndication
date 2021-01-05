# No Setup Syndication
The goals for this extension are:
- Work immediately upon installation
- Allow the user to choose RSS feeds
- Display contents of the chosen RSS feeds in chronological order in a popup when extension is used
- Keep track of most recent time user opened the extension
 - Use this to display a visual difference between read posts and unread posts
 - Also use this to display the number of unread posts in the badge, updating in regular intervals (user-defined with a default)
- Make the extension visually appealing
- Ideally, allow Atom feeds as well
- Ideally, function on both Chromium and Firefox (Firefox supports the `chrome` namespace)

This extension is still under development. It has not yet met all the goals and is not ready for general use. I plan to distribute the extension for Chromium (and Firefox if I meet that goal) when it is ready for general use.

## Installation instructions
### Installation instructions for Chromium
Go to <chrome://extensions>. Enable **Developer Mode**. Click **Load Unpacked** and select an uncompressed folder containing these files.
### Temporary installation instructions for Firefox
Go to <about:debugging#/runtime/this-firefox>. Click **Load temporary add-on** and select the `manifest.json` file.
