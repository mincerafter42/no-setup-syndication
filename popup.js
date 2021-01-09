function makeGhostButton(icon, alt, classes) { // function to make a button consisting of the given image with given alt text, with the .ghost class
	let button = document.createElement("button");
	button.className = "ghost "+classes;
	let image = document.createElement("img");
	image.alt = alt;
	image.src = "icons/"+icon+".svg";
	button.appendChild(image);
	return button;
}

function parseFeedNow() {
chrome.runtime.sendMessage({message: "getFeedContents"}, {}, ({response, lastViewed, dateFormat})=>{ // send the message {message: "getFeedContents"}
	/* function parsing {response} to that message, should be the result of a Promise.allSettled()
	need to read feeds from promises, put items in chronological order, and display items */
	if (response.length>1) {
	let combinedItems=[]; // combinedItems will fill with items from all feeds
	for (let feed=0;feed<response.length;feed++) { // iterate through every Promise in the array
		if (response[feed].status === "fulfilled") { // only need to pay attention if the promise is fulfilled
			let sourceAdded = response[feed].value.item.map(item=>{item.source = response[feed].value.title; return item}); // makes each item include a "source" attribute giving the feed it's from
			combinedItems.push(...sourceAdded); // push items from this feed into combinedItems
		}
	}
	combinedItems.sort((item1, item2)=>item2.pubDate-item1.pubDate); // sort items by pubDate, more recent items first
	// now we just need to display the items in combinedItems
	const dateFormatter = new Intl.DateTimeFormat([], dateFormat);
	for (let item=0;item<combinedItems.length;item++) { // iterate through every item in combinedItems
		let itemDisplay = document.createElement("div"); // make a div
		if (combinedItems[item].pubDate>lastViewed) itemDisplay.className = "item unread"; // if this item is more recent than last read, give it the unread class
		else itemDisplay.className = "item read"; // if it's less recent than last read give it the read class
		
		let itemDescription = document.createElement("div");
		
		let itemMeta = document.createElement("div"); // create a meta element to contain non-description info
		itemMeta.className = "meta";
		itemDisplay.appendChild(itemMeta)
		
		let itemMinimize = makeGhostButton("minimize", "Minimize", "float-left"), itemMaximize = makeGhostButton("maximize", "Maximize", "float-left"); // make a minimize and maximize button
		itemMinimize.addEventListener("click", function() { // when minimize button is clicked, it hides item description and itself, and shows maximize button
			itemMinimize.style.display = "none";
			itemMaximize.style.display = "inline-block";
			itemDescription.style.display = "none";
		});
		itemMaximize.addEventListener("click", function() { // vice versa for maximize button
			itemMaximize.style.display = "none";
			itemMinimize.style.display = "inline-block";
			itemDescription.style.display = "block";
		});
		itemMeta.appendChild(itemMinimize); // append both to item meta (they come before title)
		itemMeta.appendChild(itemMaximize);
		if (combinedItems[item].pubDate>lastViewed) itemMaximize.style.display = "none"; // if this is a new item hide maximize button initially
		else {itemMinimize.style.display = "none"; itemDescription.style.display = "none";} //if this item was already viewed initialize to minimized
		
		let itemTitle = document.createElement("h2"); // make an h2 with the item's title and link and put it in the meta
		if (combinedItems[item].link) {
			let itemLink = document.createElement("a");
			itemLink.target = "_blank";
			itemLink.href = combinedItems[item].link;
			itemLink.textContent = combinedItems[item].title;
			itemTitle.appendChild(itemLink);
		}
		else itemTitle.textContent = combinedItems[item].title;
		itemMeta.appendChild(itemTitle);
		
		let itemTime = document.createElement("span"); // make an element with the publish date and put it in the meta
		itemTime.className = "time";
		itemTime.appendChild(document.createTextNode(dateFormatter.format(new Date(combinedItems[item].pubDate))));
		itemTime.appendChild(document.createElement("br"));
		itemTime.appendChild(document.createTextNode(combinedItems[item].source));
		itemMeta.appendChild(itemTime);
		
		// make a div with the item's description and put it in the div
		itemDescription.className = "description"
		itemDescription.innerHTML = combinedItems[item].description;
		let itemDescriptionLinks = itemDescription.getElementsByTagName("a"); // getting all the links in the description to make sure they open in new tabs and are absolute URLs
		for (const link of itemDescriptionLinks) { // iterate through links (any order)
			link.target = "_blank"; // link will open in new tab
			if (link.origin === window.origin) link.href = new URL(link.pathname+link.search+link.hash, combinedItems[item].link); // if the origin is the same as the extension window, assume link is relative and fix
		}
		itemDisplay.appendChild(itemDescription);
		document.getElementById("feed").appendChild(itemDisplay); // add the div to the "feed" element
	}
	chrome.storage.sync.set({syndicationLastViewed: Date.now()}); // set last viewed date to now
	chrome.browserAction.setBadgeText({text: ""}); // make badge empty, user just viewed posts
	document.getElementById("statusbar").textContent = "Loaded feeds";
	}
	else document.getElementById("statusbar").textContent = "You have no feeds";
});
}

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
	let feedURL;
	const feedURLText = document.getElementById("feedAddURL").value;
	if (feedURLText.length>0) { // makes sure input is at least 1 character long
		try {feedURL = new URL(feedURLText)} // checks if input is by itself a valid URL
		catch(e) {feedURL = new URL("https://"+feedURLText)} // if not, prefix it with https:// (seems to work when anything follows the https://)
		chrome.storage.sync.get("syndicationFeeds", ({syndicationFeeds})=>{ // get the current list of feeds then
			syndicationFeeds.push({url: feedURL.href}); // pushes this feed onto it then
			chrome.storage.sync.set({syndicationFeeds: syndicationFeeds}); // syncs it with the storage
			parseFeedNow(); // then update the feeds seen here in popup
		});
	}
	document.getElementById("feedAdder").style.display="none"; // hide feedAdder
});

parseFeedNow(); // show feed items when popup opened
