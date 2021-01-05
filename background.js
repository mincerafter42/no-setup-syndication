/*
to do:
create ability to add and remove feeds from options page
make feed contents display when clicked
make badge show number of new posts (updating every time syndicationRefresh fires)
add error checking
make visually appealing
*/

function syncRefreshAlarm() {
	// creates the syndicationRefresh alarm if it doesn't already exist
	// makes the syndicationRefresh alarm fire with the period defined by the synced syndicationRefreshTime setting
	chrome.storage.sync.get("syndicationRefreshTime", ({syndicationRefreshTime}) => {chrome.alarms.create("syndicationRefresh", {periodInMinutes: syndicationRefreshTime})});
}

function allFeedContents(syndicationFeeds) {
	/*
	gets and returns contents of all feeds listed in syndicationFeeds
	syndicationFeeds is an array of feeds where each feed is formatted as {url: <feed's URL>}
	*/
	let feeds = []; // feeds is an empty array that will be filled with Promises for every feed
	for (let feed=0;feed<syndicationFeeds.length;feed++) { // iterate through every feed
		feeds.push(xmlPromise(syndicationFeeds[feed].url)); // add a Promise to get contents of the feed (to do: use then() to add a function parsing relevant parts of the feed into an object)
	}
	return Promise.allSettled(feeds); // return a Promise combining all the Promises
}

function xmlPromise(url) { //returns a Promise to get the XML content from the given URL
	return new Promise(function(resolve) { //creating Promise
		let request = new XMLHttpRequest(); //creating XMLHttpRequest
		request.open("GET", url); // request will get data from url
		request.onreadystatechange = function() {
			if (request.readyState === XMLHttpRequest.DONE) resolve(request.responseXML); //when the request is done, resolve the Promise with the response XML
		}
		request.send(); // send request
	});
}

function parseFeed(feedXML) {
	// take as input a feed in XML format, return relevant data as an object. Assumes input is the responseXML attribute of an XMLHttpRequest
	if (feedXML === null) throw "No XML given to parse"; // if responseXML is not a document it will always be null, in this case throw an error
	else { // there is a document
		switch (feedXML.documentElement.tagName) { // check the root element's tag name
		case "rss": // it's "rss", meaning now we know this is an RSS feed
			// gotta add code here to parse the rss feed
			const items = feedXML.getElementsByTagName("item") // sets "items" to an iterable of all <item> elements in the RSS feed
			let parsedItems = []; // parsedItems will be filled with parsed contents of the <item> elements
			for (let item=0;item<items.length;item++) { // iterate through items
				const optionalChild = tagName => items[item].getElementsByTagName(tagName)[0]; // this code will be used a lot, finds first child of the item with given tagName
				let parsedItem = {} // object that will be filled with item's attributes
				if (optionalChild("title")) parsedItem.title = optionalChild("title").textContent; // if <title> element exists, item's title is its content
				if (optionalChild("link")) parsedItem.link = optionalChild("link").textContent; // if <link> element exists, item's link is its content
				if (optionalChild("pubDate")) parsedItem.pubDate = rfc822Date(optionalChild("pubDate").textContent); // if <pubDate> element exists, item's pubDate is its content parsed by rfc822Date
				if (optionalChild("description")) parsedItem.description = optionalChild("description").textContent; // if <description> element exists, item's description is its content
				parsedItems.push(parsedItem); // adds item to array of items
			}
			return parsedItems; // returns array of items parsed
		default: // tag name is not "rss"
			throw "Unknown feed format"; // so throw error
		}
	}
}

function rfc822Date(rfc822) { // function that takes a date string in RFC 822's format and outputs that date in milliseconds since Unix epoch.
	const regex822 = /(?:(\w{3}),? )?(\d\d?) (\w{3}) (\d\d)?(\d\d) (\d\d):(\d\d)(?::(\d\d))? (?:(\w{1,3})|([+-]\d\d)(\d\d))/g,
	/* that is a regex that matches rfc822 (but also with RSS' allowance for 4-digit years)
	capture groups:
	* day of week (may not be present)
	* day of month (1-2 digits)
	* month
	* first 2 digits of year (may not be present)
	* last 2 digits of year
	* hour
	* minute
	* second (may not be present)
	* string time zone
	* time zone hour (with + or -)
	* time zone minute
	time zone is either hour and minute or string, never both */
		timezoneLookup = {UT: "+00", GMT: "+00", EDT: "-04", EST: "-05", CDT: "-05", CST: "-06", MDT: "-06", MST: "-07", PDT: "-07", PST: "-08",
		A: "+01", B: "+02", C: "+03", D: "+04", E: "+05", F: "+06", G: "+07", H: "+08", I: "+09", K: "+10", L: "+11", M: "+12",
		N: "-01", O: "-02", P: "-03", Q: "-04", R: "-05", S: "-06", T: "-07", U: "-08", V: "-09", W: "-10", X: "-11", Y: "-12",
		Z: "+00"}, // every string time possible under RFC 822
		monthLookup = {Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"}, // RFC 822 months to Date.parse months
		dayLookup = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6}
	/* Date.parse is in the format YYYY-MM-DDTHH:mm:ssZ */
	
	let captured822 = regex822.exec(rfc822); // captured822 will contain the captured groups
	if (null==captured822) return null; // returns null if no RFC 822 string was found
	if (2>captured822[2].length) captured822[2] = "0"+captured822[2]; // if day of month is 1 digit, pad it to 2 digits
	if (captured822[9]) { // if there is a string time zone,
		captured822[10] = timezoneLookup[captured822[9]]; // set hour to string's corresponding hour from lookup
		captured822[11] = "00"; // set minute to 00 (all string timezones have a minute of 00)
	}
	if (!captured822[8]) captured822[8] = "00"; // set second to 00 if unspecified
	
	if (!captured822[4]) { // first 2 digits of year are not present, must guess
		const currentYear = new Date().getFullYear();
		let centuryGuess = Math.floor(currentYear/100)-(currentYear%100<captured822[5]); // start with guess of most recent year ending with those digits (can't be future)
		if (captured822[1]) { // if there is a day of week, we can use it to guess within last 400 years (cycle repeats after 400 years)
			let centuryLookup={}; // centuryLookup will become a lookup of weekdays to centuries
			for (let centuryOffset=3;centuryOffset>=0;centuryOffset--) { // centuryOffset will start 3 centuries earlier and iterate to first guess century
				centuryLookup[new Date(centuryGuess-centuryOffset+captured822[5],monthLookup[captured822[3]]-1,captured822[2]).getDay()]=centuryGuess-centuryOffset;
			} // centuryLookup now has up to 4 items, each with key a day of week and value the century it would correspond to
			centuryGuess = centuryLookup[dayLookup[captured822[1]]] || centuryGuess; // if a century has the correct day of week, choose it, else stay with first guess century
		}
		if (3==centuryGuess.length) centuryGuess = "0"+centuryGuess; // future-proofing: if centuryGuess is 3 or 4 digits, convert it to the extended 6-digit year notation (+YYYYYY-MM-DDTHH:mm:ssZ)
		if (4==centuryGuess.length) centuryGuess = "+"+centuryGuess;
		captured822[4] = centuryGuess; // finally, sets century to whatever best guess was
	}
	
	// turns date into format parsable by Date.parse, returns it parsed
	return Date.parse(captured822[4]+captured822[5]+"-"+monthLookup[captured822[3]]+"-"+captured822[2]+"T"+captured822[6]+":"+captured822[7]+":"+captured822[8]+captured822[10]+":"+captured822[11]);
}

chrome.runtime.onInstalled.addListener(function() { //function that runs when extension is installed (or updated)
	/* attempt to initialize the synced values:
	syndicationFeeds (array of all user-selected feeds), initialized to empty array,
	syndicationRefreshTime (how often to get an updated list of feeds, in minutes), initialized to 20,
	syndicationLastViewed (Unix timestamp of most recent time the user viewed feeds), initialized to current time,
	if those values do not already exist. */ 
	chrome.storage.sync.get("syndicationFeeds", ({syndicationFeeds})=>{if (!Array.isArray(syndicationFeeds)) chrome.storage.sync.set({syndicationFeeds: []});});
	chrome.storage.sync.get("syndicationRefreshTime", ({syndicationRefreshTime})=>{
		if (typeof syndicationRefreshTime !== "number") chrome.storage.sync.set({syndicationRefreshTime: 20}, ()=>syncRefreshAlarm()); // syncRefreshAlarm must be run after syndicationRefreshTime is created
		else syncRefreshAlarm(); // suncRefreshAlarm must be run whether or not syndicationRefreshTime was initialized here
	});
	chrome.storage.sync.get("syndicationLastViewed", ({syndicationLastViewed})=>{if (typeof syndicationLastViewed !== "number") chrome.storage.sync.set({syndicationLastViewed: Date.now()});});
});

chrome.runtime.onStartup.addListener(function() {
	syncRefreshAlarm(); //run this on every startup since alarms aren't persistent
});

chrome.runtime.onMessage.addListener(function(messageObject, sender, respond) { //message function for a message received from elsewhere in the extension
	switch (messageObject.message) {
	case "syncRefreshAlarm":
		syncRefreshAlarm(); // if the "message" key's value is "syncRefreshAlarm", run the syncRefreshAlarm function
		break;
	}
});
