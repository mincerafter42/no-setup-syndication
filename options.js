// when initialized,
// set the syndicationRefreshTime input to the value of syndicationRefreshTime in storage
// set the date format inputs to the values of syndicationDateFormat in storage, and add event listeners so they update syndicationDateFormat
chrome.storage.sync.get(["syndicationRefreshTime", "syndicationDateFormat"], keys=> {
	document.getElementById("syndicationRefreshTime").value=keys.syndicationRefreshTime;
	const dateFormatKeys = ["year", "month", "weekday", "day", "hour12", "hour", "minute", "second"];
	function displayDate(sync) {
		let dateFormat = {}
		for (key of dateFormatKeys) {
			const value = document.getElementById(key+"format").value;
			if ("hidden" !== value) dateFormat[key] = value;
		}
		if (sync) chrome.storage.sync.set({syndicationDateFormat: dateFormat});
		document.getElementById("dateFormatPreview").textContent = new Intl.DateTimeFormat([], dateFormat).format(new Date());
	}
	for (key of dateFormatKeys) {
		const menu = document.getElementById(key+"format");
		if (keys.syndicationDateFormat[key] !== undefined) menu.value = keys.syndicationDateFormat[key];
		menu.addEventListener("change", ()=>displayDate(true));
	}
	displayDate();
});

const downloadSetting = document.getElementById("downloadsAllowed");
chrome.permissions.contains({permissions: ["downloads"]}, downloadsAllowed=>downloadSetting.checked = downloadsAllowed) // set the downloadsAllowed checkbox to whether downloads are allowed
downloadSetting.addEventListener("change", function() {
	if (downloadSetting.checked) chrome.permissions.request({permissions: ["downloads"]}, granted=>downloadSetting.checked = granted); // if downloadSetting gets checked, request permission to enable downloads
	else chrome.permissions.remove({permissions: ["downloads"]}); // if it gets unchecked, remove the permission
});

document.getElementById("syndicationRefreshTime").addEventListener("change", function() {
	// when the refresh time input is changed,
	// set synchronizationRefreshTime to user-inputted value then send a message to update the period of the syndicationRefresh alarm
	chrome.storage.sync.set({syndicationRefreshTime: Number(document.getElementById("syndicationRefreshTime").value)}, ()=>{chrome.runtime.sendMessage({message:"syncRefreshAlarm"})});
});

// debug: when lastViewed is updated set it to the last viewed date
document.getElementById("lastViewed").addEventListener("change", function() {
	chrome.storage.sync.set({syndicationLastViewed: Date.parse(document.getElementById("lastViewed").value)});
});

/* here we need to get the feeds and show options.  */
chrome.runtime.sendMessage({message:"getFeedContents"}, {}, ({response, originalFeeds})=>{ // make the background script get feed contents, then
	for (let feed=0;feed<response.length;feed++) { // iterate through every feed
		let feedSettings = document.createElement("li"); // make a list item. It will contain the feed name, description, and the Remove button.
		let feedTitle = document.createElement("h3"); // this h3 element will contain the title (unless feed failed to load)
		let feedURL = document.createElement("p");
		feedURL.textContent = "URL: "+originalFeeds[feed].url;
		let feedDescription = document.createElement("p"); // this p element will contain the description (unless feed failed to load)
		if (response[feed].status === "rejected") { // but if the feed failed to load,
			feedTitle.textContent = "Error getting feed"; // the title is set to a static error message
			feedDescription.textContent = response[feed].reason; // and the description is set to the error given
		} else {
			feedTitle.textContent = response[feed].value.title; // the feed loaded, set the h2's text to feed's title
			feedDescription.textContent = response[feed].value.description; // and description's innerHTML
		}
		feedSettings.appendChild(feedTitle);
		feedSettings.appendChild(feedURL);
		feedSettings.appendChild(feedDescription);
		let removeButton = document.createElement("button"); // make the Remove button
		removeButton.textContent = "Remove"; // set the button's text to "Remove"
		removeButton.addEventListener("click", function() { // when it's clicked
			chrome.storage.sync.get("syndicationFeeds", ({syndicationFeeds})=>{ // get the syndicationFeeds setting
				syndicationFeeds.splice(feed, 1); // remove the feed from syndicationFeeds
				chrome.storage.sync.set({syndicationFeeds: syndicationFeeds}); // and sync it
			});
			document.getElementById("feeds").removeChild(feedSettings); // and also remove the list item from the list of feeds
		});
		feedSettings.appendChild(removeButton);
		document.getElementById("feeds").appendChild(feedSettings); // add list item to list of feeds
	}
});
