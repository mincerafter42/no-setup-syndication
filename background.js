function syncRefreshAlarm(now) {
	// creates the syndicationRefresh alarm if it doesn't already exist
	// makes the syndicationRefresh alarm fire with the period defined by the synced syndicationRefreshTime setting
	chrome.storage.sync.get("syndicationRefreshTime", ({syndicationRefreshTime}) => {
		let alarmSettings = {periodInMinutes: syndicationRefreshTime}
		if (now) alarmSettings.when = Date.now();
		chrome.alarms.create("syndicationRefresh", alarmSettings);
	});
	chrome.browserAction.setBadgeBackgroundColor({color: "#421E07"}); // set badge background color too
}

chrome.alarms.onAlarm.addListener(alarm=>{
	if ("syndicationRefresh"===alarm.name) chrome.storage.sync.get(["syndicationFeeds", "syndicationLastViewed"], ({syndicationFeeds, syndicationLastViewed})=>{allFeedContents(syndicationFeeds).then(response=>{
		// the syndicationRefresh alarm just went off so we get the feed contents and last viewed date
		let combinedItems=[];
		for (const feed of response) { // iterate through every feed in responses
			if ("fulfilled"===feed.status) combinedItems.push(...feed.value.item); // push feed's items onto combinedItems
		}
		let newPosts = combinedItems.filter(item=>item.pubDate>syndicationLastViewed); // newPosts is set to only the posts that are newer than last view date
		if (newPosts.length>0&&newPosts.length<1e3) chrome.browserAction.setBadgeText({text: String(newPosts.length)}); // if number of posts is over 0 and under 1000, put it on badge
		else if (newPosts.length>999) chrome.browserAction.setBadgeText({text: "999+"}); // if it's 4 or more digits set badge to 999+
		else chrome.browserAction.setBadgeText({text: ""}); // if there are no posts make badge empty
		chrome.permissions.contains({permissions: ["downloads"]}, downloadsAllowed=>{if (downloadsAllowed) { // check if the downloads permission is allowed. If it is, download enclosures
			let enclosures = combinedItems.filter(item=>item.enclosure).map(item=>item.enclosure); // set enclosures to list of enclosures
			for (const enclosure of enclosures) { // iterate through enclosures (any order)
				chrome.downloads.search({url: enclosure.url}, (downloads)=>{ // check for existing downloads with the same URL
					if (downloads.length===0) chrome.downloads.download({url: enclosure.url, conflictAction: "uniquify", saveAs: false}); // if none exist, download file
					else if (downloads[0].state !== "complete" && downloads[0].canResume) chrome.downloads.resume(downloads[0].id) // if download is incomplete and resumable, resume it
				});
			}
		}});
	})}); // woah check out these clumps of brackets!
});

function allFeedContents(syndicationFeeds) {
	/*
	gets and returns contents of all feeds listed in syndicationFeeds
	syndicationFeeds is an array of feeds where each feed is formatted as {url: <feed's URL>}
	*/
	let feeds = [];
	for (let feed=0;feed<syndicationFeeds.length;feed++) { // iterate through every feed
		feeds.push(xmlPromise(syndicationFeeds[feed].url).then(parseFeed)); // add a Promise to get contents of the feed, then parse XML into an object
	}
	return Promise.allSettled(feeds); // return a Promise combining all the Promises
}

function xmlPromise(url) { //returns a Promise to get the XML content from the given URL
	let antiCache = new URL(url);
	antiCache.searchParams.append("t", Date.now()); // prevent caching by using a unique query string
	return new Promise(function(resolve, reject) { //creating Promise
		let request = new XMLHttpRequest(); //creating XMLHttpRequest
		request.open("GET", antiCache); // request will get data from url
		request.onload = ()=>resolve(request.responseXML); //when the request is done, resolve the Promise with the response XML
		request.onerror = ()=>reject(null);
		request.send(); // send request
	});
}

function parseFeed(feedXML) {
	// take as input a feed in XML format, return relevant data as an object. Assumes input is the responseXML attribute of an XMLHttpRequest
	function matchingChildren(xml, childrenToFind) { // given an XML element and an object listing child names, finds element's immediate children with those names and returns an object with filters applied to children
		let result = {};
		for (let element in childrenToFind) { // iterate through names of items in childrenToFind
			const matching = Array.from(xml.children).filter(value=>element==value.tagName); // set "matching" to all immediate matching children
			if (matching.length>0) {
				if (typeof childrenToFind[element]==="object") result[element] = matchingChildren(matching[0],childrenToFind[element]); // if the value is an object, it's an object listing children of *this* element to find
				else if (typeof childrenToFind[element]==="function") result[element] = childrenToFind[element](matching); // if the value is a function, run the function on the array of matching elements
				else result[element] = matching[0].textContent; // else get a single element's text content
			}
		}
		return result;
	}
	if (feedXML === null) throw "No XML given to parse"; // if responseXML is not a document it will always be null, in this case throw an error
	else { // there is a document
		switch (feedXML.documentElement.tagName) { // check the root element's tag name
		case "rss": // it's "rss", meaning now we know this is an RSS feed
			const childrenToFind = {title:0, description:0, link:0, // these are the children we're looking for (in <channel>)
			item: matching=>matching.map(item=>matchingChildren(item,{title:0,link:0,description:0,pubDate:([matching])=>rfc822Date(matching.textContent),enclosure:([matching])=>{return {url: matching.attributes.getNamedItem("url").value}},guid:([matching])=>{
				let isPermaLink = matching.attributes.getNamedItem("isPermaLink")
				return {id: matching.textContent, isPermaLink: isPermaLink?isPermaLink.value:"true"}} // in the guid element, need to check if the isPermaLink attribute exists because otherwise there'll be an error with null.value
			}))
			}
			return matchingChildren(feedXML.documentElement, {channel: childrenToFind}).channel; // <channel> exists but we can just return its contents
		default: // tag name is not "rss", throw error
			throw "Unknown feed format";
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
	if (null===captured822) return null; // returns null if no RFC 822 string was found
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
			let centuryLookup={};
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
	syndicationDateFormat (Intl.DateTimeFormat-formatted date display options), initialized to show full year, short month name, numeric day
	if those values do not already exist. */ 
	chrome.storage.sync.get(["syndicationFeeds", "syndicationRefreshTime", "syndicationLastViewed", "syndicationDateFormat"], keys=>{
		if (!Array.isArray(keys.syndicationFeeds)) chrome.storage.sync.set({syndicationFeeds: []});
		if (typeof keys.syndicationRefreshTime !== "number") chrome.storage.sync.set({syndicationRefreshTime: 20}, ()=>syncRefreshAlarm()); // syncRefreshAlarm must be run after syndicationRefreshTime is created
		else syncRefreshAlarm(); // suncRefreshAlarm must be run whether or not syndicationRefreshTime was initialized here
		if (typeof keys.syndicationLastViewed !== "number") chrome.storage.sync.set({syndicationLastViewed: Date.now()});
		if (typeof keys.syndicationDateFormat !== "object") chrome.storage.sync.set({syndicationDateFormat: {year: "numeric", month: "short", day: "numeric"}});
	});
});

chrome.runtime.onStartup.addListener(function() {
	syncRefreshAlarm(true); //run this on every startup since alarms aren't persistent
});

chrome.runtime.onMessage.addListener(function(messageObject, sender, respond) { //message function for a message received from elsewhere in the extension
	switch (messageObject.message) {
	case "syncRefreshAlarm":
		syncRefreshAlarm(); // if the "message" key's value is "syncRefreshAlarm", run the syncRefreshAlarm function
		break;
	case "getFeedContents": // if the "message" key's value is "getFeedContents",
		// get syndicationFeeds from storage and use it to respond with the contents of the feeds
		chrome.storage.sync.get(["syndicationFeeds", "syndicationLastViewed", "syndicationDateFormat"], keys=>{allFeedContents(keys.syndicationFeeds).then(value=>respond({response: value, lastViewed: keys.syndicationLastViewed, dateFormat: keys.syndicationDateFormat, originalFeeds: keys.syndicationFeeds}))});
		return true; // must return true to be asynchronous
	}
});
