// makes the Options button open the options page
document.getElementById("options").addEventListener("click", ()=>chrome.runtime.openOptionsPage());

// makes the Add Feed button show the feedAdder element (UI to add a feed) with an empty input when clicked
document.getElementById("add").addEventListener("click", function() {
	document.getElementById("feedAddURL").value="";
	document.getElementById("feedAdder").style.display="block";
});

// makes the Cancel button in feedAdder hide feedAdder and do nothing else
document.getElementById("feedAddCancel").addEventListener("click", ()=>document.getElementById("feedAdder").style.display="none");
// makes the Add Feed button in feedAdder add the URL to the array of feeds with permission to access feed URL
document.getElementById("feedAddConfirm").addEventListener("click", function() {
	chrome.storage.sync.get("syndicationFeeds", ({syndicationFeeds})=>{ // get the current list of feeds then
		syndicationFeeds.push({url: document.getElementById("feedAddURL").value}); // pushes this feed onto it then
		chrome.storage.sync.set({syndicationFeeds: syndicationFeeds}); // syncs it with the storage
	});
	document.getElementById("feedAdder").style.display="none"; // hide feedAdder
});

chrome.runtime.sendMessage({message: "getFeedContents"}, {}, (response)=>{ // send the message {message: "getFeedContents"}
	/* function parsing response to that message, should be the result of a Promise.allSettled()
	need to read feeds from promises, put items in chronological order, and display items */
	let combinedItems=[]; // combinedItems will fill with items from all feeds
	for (let feed=0;feed<response.length;feed++) { // iterate through every Promise in the array
		if (response[feed].status === "fulfilled") { // only need to pay attention if the promise is fulfilled
			combinedItems.push(...response[feed].value.items); // push items from this feed into combinedItems
		}
	}
	combinedItems.sort((item1, item2)=>item2.pubDate-item1.pubDate); // sort items by pubDate, more recent items first
	// now we just need to display the items in combinedItems
});
