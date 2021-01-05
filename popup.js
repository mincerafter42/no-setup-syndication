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
