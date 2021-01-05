// when initialized,
// set the syndicationRefreshTime input to the value of syndicationRefreshTime in storage
chrome.storage.sync.get("syndicationRefreshTime", ({syndicationRefreshTime}) => {document.getElementById("syndicationRefreshTime").value=syndicationRefreshTime});
// add an event listener to the save button
document.getElementById("save").addEventListener("click", function() {
	// when the save button is clicked,
	// set synchronizationRefreshTime to user-inputted value then send a message to update the period of the syndicationRefresh alarm
	chrome.storage.sync.set({syndicationRefreshTime: Number(document.getElementById("syndicationRefreshTime").value)}, ()=>{chrome.runtime.sendMessage({message:"syncRefreshAlarm"})});
});

chrome.permissions.getAll(function(perms) {
	document.body.appendChild(document.createTextNode(JSON.stringify(perms)));
}); //debug: print extension's permissions

document.getElementById("debugRequest").addEventListener("click", function() {
	console.log("Request not created");
	let request = new XMLHttpRequest();
	console.log("Request created");
	request.open("GET", "https://xkcd.com/rss.xml");
	console.log("Request opened");
	request.onload = function() {console.log("Request loaded");console.log(request.responseXML)}
	console.log("Request onload function set");
	request.send();
	console.log("Sent request");
});
