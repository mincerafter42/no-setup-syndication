// when initialized,
// set the syndicationRefreshTime input to the value of syndicationRefreshTime in storage
chrome.storage.sync.get("syndicationRefreshTime", ({syndicationRefreshTime}) => {document.getElementById("syndicationRefreshTime").value=syndicationRefreshTime});
// add an event listener to the save button
document.getElementById("save").addEventListener("click", function() {
	// when the save button is clicked,
	// set synchronizationRefreshTime to user-inputted value then send a message to update the period of the syndicationRefresh alarm
	chrome.storage.sync.set({syndicationRefreshTime: Number(document.getElementById("syndicationRefreshTime").value)}, ()=>{chrome.runtime.sendMessage({message:"syncRefreshAlarm"})});
});
