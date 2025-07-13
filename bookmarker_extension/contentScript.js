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
    if (document.querySelector(".youtube-bookmark-button")) return;

    const controls = document.querySelector(".ytp-left-controls");
    youtubePlayer = document.querySelector(".video-stream");
    if (!controls || !youtubePlayer) return;

    const bookmarkBtn = document.createElement("img");
    const bookmarkIcon = chrome.runtime.getURL("assets/bookmark.png");
    const saveIcon = chrome.runtime.getURL("assets/check.png");

    bookmarkBtn.src = bookmarkIcon;
    bookmarkBtn.className = "youtube-bookmark-button";
    bookmarkBtn.title = "Click to bookmark current timestamp";
    bookmarkBtn.style.cursor = "pointer";

    bookmarkBtn.addEventListener("click", () => {
      bookmarkBtn.src = saveIcon;

      addBookmarkEvent();

      setTimeout(() => {
        bookmarkBtn.src = bookmarkIcon;
      }, 1000);
    });

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
