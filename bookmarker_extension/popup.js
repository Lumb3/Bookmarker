import { getCurrentTab } from "./utils.js";

let currentVideo = "";

const onPlay = async (e) => {
  const time = e.target.dataset.time || e.target.parentElement.dataset.time;
  const activeTab = await getCurrentTab();
  chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: parseFloat(time),
  });
};

const onDelete = async (e) => {
  const time = e.target.dataset.time || e.target.parentElement.dataset.time;
  const activeTab = await getCurrentTab();

  const url = new URL(activeTab.url);
  currentVideo = url.searchParams.get("v");

  chrome.storage.sync.get([currentVideo], (data) => {
    const bookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
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
  const oldTime = e.target.dataset.time || e.target.parentElement.dataset.time;
  const activeTab = await getCurrentTab();

  const url = new URL(activeTab.url);
  currentVideo = url.searchParams.get("v");

  chrome.storage.sync.get([currentVideo], (data) => {
    let bookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
    const index = bookmarks.findIndex((b) => b.time == oldTime);
    if (index === -1) return;

    const newDesc = prompt(
      "Enter a new title for this bookmark:",
      bookmarks[index].desc
    );
    if (newDesc === null) return;
    if (!newDesc.trim()) return;

    bookmarks[index].desc = newDesc.trim();

    chrome.storage.sync.set({ [currentVideo]: JSON.stringify(bookmarks) }, () => {
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

  if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement("link");
    faLink.rel = "stylesheet";
    faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css";
    document.head.appendChild(faLink);
  }

  const playBtn = document.createElement("button");
  playBtn.innerHTML = `<i class="fa-solid fa-play" style="color: #FF33CFFF;"></i>`;
  playBtn.className = "icon play";
  playBtn.title = "Play";
  playBtn.style.border = "none";
  playBtn.style.fontSize = "15px";
  playBtn.style.background = "transparent";
  playBtn.style.cursor = "pointer";
  playBtn.dataset.time = bookmark.time;

  const deleteBtn = document.createElement("button");
  deleteBtn.innerHTML = `<i class="fa-solid fa-trash" style="color: #FF33CFFF;"></i>`;
  deleteBtn.className = "icon delete";
  deleteBtn.title = "Delete";
  deleteBtn.style.border = "none";
  deleteBtn.style.fontSize = "15px";
  deleteBtn.style.background = "transparent";
  deleteBtn.style.cursor = "pointer";
  deleteBtn.dataset.time = bookmark.time;

  const editBtn = document.createElement("button");
  editBtn.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color: #FF33CFFF;"></i>`;
  editBtn.className = "icon edit";
  editBtn.title = "Edit title";
  editBtn.style.border = "none";
  editBtn.style.fontSize = "15px";
  editBtn.style.background = "transparent";
  editBtn.style.cursor = "pointer";
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
    container.innerHTML = `<div class="row">No bookmarks to show</div>`;
  }
};

// NEW: Function to refresh bookmarks from storage
const refreshBookmarks = () => {
  if (!currentVideo) return;
  
  chrome.storage.sync.get([currentVideo], (data) => {
    const videoBookmarks = data[currentVideo]
      ? JSON.parse(data[currentVideo])
      : [];
    viewBookmarks(videoBookmarks);
  });
};

// Listens the chrome storage
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes[currentVideo]) {
    // Update bookmarks when current video's bookmarks change
    refreshBookmarks();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const currentTab = await getCurrentTab();
  if (!currentTab || !currentTab.url) return;

  const url = new URL(currentTab.url);
  currentVideo = url.searchParams.get("v");

  if (currentTab.url.includes("youtube.com/watch") && currentVideo) {
    refreshBookmarks();
  } else {
    window.location.href = "not-youtube.html";
  }
});