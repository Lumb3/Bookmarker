(() => {
  let youtubePlayer;
  let currentVideo = "";
  let currentVideoBookmarks = [];
  let isInitialized = false;

  const getTime = (time) => {
    const date = new Date(0);
    date.setSeconds(time);
    return date.toISOString().substring(11, 19);
  };

  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      if (!currentVideo) {
        resolve([]);
        return;
      }
      chrome.storage.sync.get([currentVideo], (data) => {
        resolve(data[currentVideo] ? JSON.parse(data[currentVideo]) : []);
      });
    });
  };

  const loadBookmarks = async () => {
    if (!currentVideo) return;

    return new Promise((resolve) => {
      chrome.storage.sync.get([currentVideo], (data) => {
        try {
          currentVideoBookmarks = data[currentVideo]
            ? JSON.parse(data[currentVideo])
            : [];
        } catch {
          currentVideoBookmarks = [];
        }
        resolve();
      });
    });
  };

  const addBookmarkEvent = async () => {
    if (!youtubePlayer || !currentVideo) {
      console.error("Cannot add bookmark: video not initialized");
      return;
    }

    const currentTime = youtubePlayer.currentTime;

    const newBookmark = {
      time: currentTime,
      desc: `Bookmark at ${getTime(currentTime)}`,
      note: "",
    };

    currentVideoBookmarks = await fetchBookmarks();
    currentVideoBookmarks.push(newBookmark);
    currentVideoBookmarks.sort((a, b) => a.time - b.time);

    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify(currentVideoBookmarks),
    });
  };

  const injectButton = () => {
    const existingButton = document.querySelector(".youtube-bookmark-button");
    if (existingButton) {
      return; // Button already exists, don't duplicate
    }

    if (!document.querySelector('link[href*="font-awesome"]')) {
      const faLink = document.createElement("link");
      faLink.rel = "stylesheet";
      faLink.href =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css";
      document.head.appendChild(faLink);
    }

    const controls = document.querySelector(".ytp-left-controls");
    youtubePlayer = document.querySelector(".video-stream");

    if (!controls || !youtubePlayer) {
      setTimeout(injectButton, 500);
      return;
    }

    const button = document.createElement("button");
    button.className = "youtube-bookmark-button";
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
      width: 40px;
      height: 40px;
    `;

    button.innerHTML = `<i class="fa-solid fa-plus" style="color: #B197FC;"></i>`;

    button.addEventListener("click", async () => {
      if (!currentVideo) {
        console.error("Video ID not ready");
        return;
      }

      button.innerHTML = `<i class="fa-solid fa-check" style="color: #B197FC;"></i>`;

      await addBookmarkEvent();

      setTimeout(() => {
        button.innerHTML = `<i class="fa-solid fa-plus" style="color: #B197FC;"></i>`;
      }, 1000);
    });

    controls.appendChild(button);
    isInitialized = true;
  };

  const handleNewVideo = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const newVideoId = urlParams.get("v");

    if (!newVideoId) return;

    if (newVideoId !== currentVideo) {
      currentVideo = newVideoId;
      isInitialized = false;
      await loadBookmarks();
      injectButton();
    }
  };

  chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (msg.type === "PLAY") {
      if (youtubePlayer) youtubePlayer.currentTime = parseFloat(msg.value);
    }
  });

  // Initial load - wait for it to complete
  const initialize = async () => {
    await handleNewVideo();

    // Monitor for SPA navigation
    const observer = new MutationObserver(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get("v");

      if (videoId && videoId !== currentVideo) {
        handleNewVideo();
      } else if (
        !document.querySelector(".youtube-bookmark-button") &&
        currentVideo
      ) {
        injectButton();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  // Start initialization
  initialize();
})();
