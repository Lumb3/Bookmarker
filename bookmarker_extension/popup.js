import { getCurrentTab } from "./utils.js";

const onPlay = async (e) => {
  const time = e.target.dataset.time;
  const activeTab = await getCurrentTab();
  chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: time,
  });
};

const onDelete = async (e) => {
  const time = e.target.dataset.time;
  const activeTab = await getCurrentTab();

  const queryParams = new URLSearchParams(activeTab.url.split("?")[1]);
  const currentVideo = queryParams.get("v");

  chrome.storage.sync.get([currentVideo], (data) => {
    const bookmarks = JSON.parse(data[currentVideo] || "[]");
    const updatedBookmarks = bookmarks.filter((b) => b.time != time);

    chrome.storage.sync.set(
      { [currentVideo]: JSON.stringify(updatedBookmarks) },
      () => {
        viewBookmarks(updatedBookmarks); 
      }
    );
  });
};

const onEdit = async (e) => {
  const oldTime = e.target.dataset.time;
  const activeTab = await getCurrentTab();

  const queryParams = new URLSearchParams(activeTab.url.split("?")[1]);
  const videoId = queryParams.get("v");

  chrome.storage.sync.get([videoId], (data) => {
    let bookmarks = JSON.parse(data[videoId] || "[]");
    const index = bookmarks.findIndex((b) => b.time == oldTime);
    if (index === -1) return;

    const newDesc = prompt(
      "Enter a new title for this bookmark:",
      bookmarks[index].desc
    );
    if (!newDesc) return;

    bookmarks[index].desc = newDesc;

    chrome.storage.sync.set({ [videoId]: JSON.stringify(bookmarks) }, () => {
      viewBookmarks(bookmarks);
    });
  });
};

const addNewBookmark = (container, bookmark) => {
  const newBookmark = document.createElement("div");
  newBookmark.className = "bookmark";
  newBookmark.id = `bookmark-${bookmark.time}`;
  newBookmark.setAttribute("timestamp", bookmark.time);

  const title = document.createElement("div");
  title.textContent = bookmark.desc;
  title.className = "bookmark-title";

  const controls = document.createElement("div");
  controls.className = "bookmark-controls";

  const playBtn = document.createElement("img");
  playBtn.src = chrome.runtime.getURL("assets/play.png");
  playBtn.className = "icon play";
  playBtn.title = "Play";
  playBtn.dataset.time = bookmark.time;

  const deleteBtn = document.createElement("img");
  deleteBtn.src = chrome.runtime.getURL("assets/delete.png");
  deleteBtn.className = "icon delete";
  deleteBtn.title = "Delete";
  deleteBtn.dataset.time = bookmark.time;

  const editBtn = document.createElement("img");
  editBtn.src = chrome.runtime.getURL("assets/edit.png");
  editBtn.className = "icon edit";
  editBtn.title = "Edit title";
  editBtn.dataset.time = bookmark.time;

  playBtn.addEventListener("click", onPlay);
  deleteBtn.addEventListener("click", onDelete);
  editBtn.addEventListener("click", onEdit);

  controls.appendChild(playBtn);
  controls.appendChild(deleteBtn);
  controls.appendChild(editBtn);

  newBookmark.appendChild(title);
  newBookmark.appendChild(controls);
  container.appendChild(newBookmark);
};

const viewBookmarks = (bookmarks = []) => {
  const container = document.getElementById("bookmarks");
  container.innerHTML = "";

  if (bookmarks.length > 0) {
    bookmarks.forEach((b) => addNewBookmark(container, b));
  } else {
    container.innerHTML = `<i class="row">No bookmarks to show</i>`;
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const currentTab = await getCurrentTab();
  if (!currentTab || !currentTab.url) return;

  const queryParams = new URLSearchParams(currentTab.url.split("?")[1]);
  const currentVideo = queryParams.get("v");

  if (currentTab.url.includes("youtube.com/watch") && currentVideo) {
    chrome.storage.sync.get([currentVideo], (data) => {
      const videoBookmarks = data[currentVideo]
        ? JSON.parse(data[currentVideo])
        : [];
      viewBookmarks(videoBookmarks);
    });
  } else {
    const title = document.getElementsByClassName("title")[0];
    if (title) {
      title.textContent = "This is not a YouTube video page.";
    }
  }
});
