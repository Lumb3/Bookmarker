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
    // Check and remove existing button FIRST
    const existingButton = document.querySelector(".youtube-bookmark-button");
    if (existingButton) {
      existingButton.remove();
    }

    // Check if FontAwesome is already loaded
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const faLink = document.createElement("link");
      faLink.rel = "stylesheet";
      faLink.href =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css";
      document.head.appendChild(faLink);
    }

    const controls = document.querySelector(".ytp-left-controls");
    youtubePlayer = document.querySelector(".video-stream");
    if (!controls || !youtubePlayer) return;

    const button = document.createElement("button");
    button.className = "youtube-bookmark-button"; // Add class for easy identification
    button.title = "Click to bookmark";
    button.style.cssText = `
    cursor: pointer;
    background: transparent;
    border: none;
    font-size: 30px;
    padding: 0;
    margin: 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

    button.innerHTML = `<i class="fa-solid fa-plus" style="color: #B197FC;"></i>`;

    button.addEventListener("click", () => {
      button.innerHTML = `<i class="fa-solid fa-check" style="color: #B197FC;"></i>`;

      addBookmarkEvent();
      // Revert back to the plus icon after 1 second
      setTimeout(() => {
        button.innerHTML = `<i class="fa-solid fa-plus" style="color: #B197FC;"></i>`;
      }, 1000);
    });

    controls.appendChild(button);
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
