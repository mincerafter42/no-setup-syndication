function syncRefreshAlarm() {
	// creates the syndicationRefresh alarm if it doesn't already exist
	// makes the syndicationRefresh alarm fire with the period defined by the synced syndicationRefreshTime setting
	chrome.storage.sync.get("syndicationRefreshTime", ({syndicationRefreshTime}) => {chrome.alarms.create("syndicationRefresh", {periodInMinutes: syndicationRefreshTime})});
	console.log("Synchronized the syndicationRefreshTime alarm"); // gonna use this to find when the impossible error occurs
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

chrome.runtime.onMessage.addListener(function(messageObject, sender, response) { //message function for a message received from elsewhere in the extension
	if (messageObject.message=="syncRefreshAlarm") syncRefreshAlarm(); // if the "message" key's value is "syncRefreshAlarm", run the syncRefreshAlarm function
});
