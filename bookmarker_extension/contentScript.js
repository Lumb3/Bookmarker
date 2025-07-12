(() => {
  let youtubePlayer;
  let currentVideo = "";
  let currentVideoBookmarks = [];

  const getTime = (time) => {
    const date = new Date(0);
    date.setSeconds(time);
    return date.toISOString().substring(11, 19);
  };

  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([currentVideo], (data) => {
        resolve(data[currentVideo] ? JSON.parse(data[currentVideo]) : []);
      });
    });
  };

  const loadBookmarks = async () => {
    chrome.storage.sync.get([currentVideo], (data) => {
      try {
        currentVideoBookmarks = data[currentVideo]
          ? JSON.parse(data[currentVideo])
          : [];
      } catch {
        currentVideoBookmarks = [];
      }
    });
  };

  const addBookmarkEvent = async () => {
    if (!youtubePlayer) return;
    const currentTime = youtubePlayer.currentTime;

    const newBookmark = {
      time: currentTime,
      desc: `Bookmark at ${getTime(currentTime)}`,
    };

    currentVideoBookmarks = await fetchBookmarks();
    currentVideoBookmarks.push(newBookmark);
    currentVideoBookmarks.sort((a, b) => a.time - b.time);

    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify(currentVideoBookmarks),
    });
  };

  const injectButton = () => {
    const existing = document.getElementsByClassName(
      "youtube-bookmark-button"
    )[0];
    if (existing) return;

    const controls = document.getElementsByClassName("ytp-left-controls")[0];
    youtubePlayer = document.getElementsByClassName("video-stream")[0];
    if (!controls || !youtubePlayer) return;

    const bookmarkBtn = document.createElement("img");
    bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
    bookmarkBtn.className = "youtube-bookmark-button";
    bookmarkBtn.title = "Click to bookmark current timestamp";
    bookmarkBtn.style.cursor = "pointer";

    bookmarkBtn.addEventListener("click", addBookmarkEvent);
    controls.appendChild(bookmarkBtn);
  };

  const handleNewVideo = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentVideo = urlParams.get("v");
    await loadBookmarks();
    injectButton();
  };

  chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (msg.type === "NEW Bookmark") {
      handleNewVideo();
    } else if (msg.type === "PLAY") {
      if (youtubePlayer) youtubePlayer.currentTime = msg.value;
    }
  });

  // Run when script loads
  handleNewVideo();
})();
