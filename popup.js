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

chrome.runtime.sendMessage({message: "getFeedContents"}, {}, ({response, lastViewed})=>{ // send the message {message: "getFeedContents"}
	/* function parsing {response} to that message, should be the result of a Promise.allSettled()
	need to read feeds from promises, put items in chronological order, and display items */
	let combinedItems=[]; // combinedItems will fill with items from all feeds
	for (let feed=0;feed<response.length;feed++) { // iterate through every Promise in the array
		if (response[feed].status === "fulfilled") { // only need to pay attention if the promise is fulfilled
			combinedItems.push(...response[feed].value.item); // push items from this feed into combinedItems
		}
	}
	combinedItems.sort((item1, item2)=>item2.pubDate-item1.pubDate); // sort items by pubDate, more recent items first
	// now we just need to display the items in combinedItems
	const dateFormat = new Intl.DateTimeFormat();
	for (let item=0;item<combinedItems.length;item++) { // iterate through every item in combinedItems
		let itemDisplay = document.createElement("div"); // make a div
		if (combinedItems[item].pubDate>lastViewed) itemDisplay.className = "item unread"; // if this item is more recent than last read, give it the unread class
		else itemDisplay.className = "item read"; // if it's less recent than last read give it the read class
		
		let itemMeta = document.createElement("div");
		itemMeta.className = "meta";
		itemDisplay.appendChild(itemMeta)
		
		let itemTitle = document.createElement("h2"); // make an h2 with the item's title and put it in the div
		if (combinedItems[item].link) {
			let itemLink = document.createElement("a");
			itemLink.target = "_blank";
			itemLink.href = combinedItems[item].link;
			itemLink.textContent = combinedItems[item].title;
			itemTitle.appendChild(itemLink);
		}
		else itemTitle.textContent = combinedItems[item].title;
		itemMeta.appendChild(itemTitle);
		
		let itemTime = document.createElement("span");
		itemTime.className = "time";
		itemTime.textContent = dateFormat.format(new Date(combinedItems[item].pubDate));
		itemMeta.appendChild(itemTime);
		
		let itemDescription = document.createElement("div"); // make a div with the item's description and put it in the div
		itemDescription.className = "description"
		itemDescription.innerHTML = combinedItems[item].description;
		let itemDescriptionLinks = itemDescription.getElementsByTagName("a"); // getting all the links in the description to make sure they open in new tabs and are absolute URLs
		for (const link of itemDescriptionLinks) { // iterate through links (any order)
			link.target = "_blank"; // link will open in new tab
			if (link.origin === window.origin) link.href = new URL(link.pathname+link.search+link.hash, combinedItems[item].link); // if the origin is the same as the extension window, assume link is relative and fix
		}
		itemDisplay.appendChild(itemDescription);
		document.getElementById("feed").appendChild(itemDisplay); // add the div to the "feed" element
		// to do: separate items by date
	}
});
