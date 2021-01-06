// when initialized,
// set the syndicationRefreshTime input to the value of syndicationRefreshTime in storage
chrome.storage.sync.get("syndicationRefreshTime", ({syndicationRefreshTime}) => {document.getElementById("syndicationRefreshTime").value=syndicationRefreshTime});
// add an event listener to the save button
document.getElementById("save").addEventListener("click", function() {
	// when the save button is clicked,
	// set synchronizationRefreshTime to user-inputted value then send a message to update the period of the syndicationRefresh alarm
	chrome.storage.sync.set({syndicationRefreshTime: Number(document.getElementById("syndicationRefreshTime").value)}, ()=>{chrome.runtime.sendMessage({message:"syncRefreshAlarm"})});
});

/* here we need to get the feeds and show options.  */
chrome.runtime.sendMessage({message:"getFeedContents"}, {}, (response)=>{ // make the background script get feed contents, then
	for (let feed=0;feed<response.length;feed++) { // iterate through every feed
		let feedSettings = document.createElement("div"); // make a div. It will contain the feed name, description, and the Remove button.
		let feedTitle = document.createElement("h2"); // this h2 element will contain the title (unless feed failed to load)
		let feedDescription = document.createElement("p"); // this p element will contain the description (unless feed failed to load)
		if (response[feed].status === "rejected") { // but if the feed failed to load,
			feedTitle.textContent = "Error getting feed"; // the title is set to a static error message
			feedDescription.textContent = response[feed].reason; // and the description is set to the error given
		} else {
			feedTitle.textContent = response[feed].value.title; // the feed loaded, set the h2's text to feed's title
			feedDescription.innerHTML = response[feed].value.description; // and description's innerHTML
		}
		feedSettings.appendChild(feedTitle); // append title to div
		feedSettings.appendChild(feedDescription); // append description to div
		let removeButton = document.createElement("button"); // make the Remove button
		removeButton.textContent = "Remove"; // set the button's text to "Remove"
		removeButton.addEventListener("click", function() { // when it's clicked
			chrome.storage.sync.get("syndicationFeeds", ({syndicationFeeds})=>{ // get the syndicationFeeds setting
				syndicationFeeds.splice(feed, 1); // remove the feed from syndicationFeeds
				chrome.storage.sync.set({syndicationFeeds: syndicationFeeds}); // and sync it
			});
			document.getElementById("feeds").removeChild(feedSettings); // and also remove the div from the list of feeds
		});
		feedSettings.appendChild(removeButton); // add button to div
		document.getElementById("feeds").appendChild(feedSettings); // add div to list of feeds
	}
});
