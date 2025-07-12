chrome.tabs.onUpdated.addListener((tabID, tab) => {
  if (tab.url && tab.url.includes("youtube.com/watch")) { // Checks whether tab obj has a url and whether that url contains youtube
    const queryParameters = tab.url.split("?")[1]; // Take the left side of ?
    const urlParameters = new URLSearchParams(queryParameters); // turns the string query into object
    console.log(urlParameters);
    chrome.tabs.sendMessage(tabID, {
      type: "NEW Bookmark",
      videoID: urlParameters.get("v"),
    });
  }
});
