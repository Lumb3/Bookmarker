let yt = document.getElementById("open-youtube");
let history = document.getElementById("view-history");
yt.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://www.youtube.com/" });
});
history.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://www.youtube.com" }, (tab) => {
    setTimeout(() => {
      chrome.action.openPopup();
    }, 1000);
  });
});
