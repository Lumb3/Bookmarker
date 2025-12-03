import { getCurrentTab } from "./utils.js";

let currentVideo = "";
let allVideos = {};

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
        loadAllVideos(); // Refresh video list
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

    chrome.storage.sync.set(
      { [currentVideo]: JSON.stringify(bookmarks) },
      () => {
        viewBookmarks(bookmarks);
      }
    );
  });
};

const addNewBookmark = (container, bookmark) => {
  // Creating the main bookmark element
  const newBookmark = document.createElement("div");
  newBookmark.className = "bookmark";
  newBookmark.id = `bookmark-${bookmark.time}`;
  newBookmark.setAttribute("timestamp", bookmark.time);

  // Title section
  const title = document.createElement("div");
  title.textContent = bookmark.desc;
  title.className = "bookmark-title";

  // Controls section
  const controls = document.createElement("div");
  controls.className = "bookmark-controls";

  // Check Font Awesome
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement("link");
    faLink.rel = "stylesheet";
    faLink.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css";
    document.head.appendChild(faLink);
  }

  // Play button
  const playBtn = document.createElement("button");
  playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
  playBtn.className = "icon-btn play-btn";
  playBtn.title = "Play";
  playBtn.dataset.time = bookmark.time;

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i>`;
  deleteBtn.className = "icon-btn delete-btn";
  deleteBtn.title = "Delete";
  deleteBtn.dataset.time = bookmark.time;

  // Edit button
  const editBtn = document.createElement("button");
  editBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i>`;
  editBtn.className = "icon-btn edit-btn";
  editBtn.title = "Edit title";
  editBtn.dataset.time = bookmark.time;

  // Note button
  const noteBtn = document.createElement("button");
  const hasNote = bookmark.note && bookmark.note.trim().length > 0;
  noteBtn.innerHTML = hasNote 
    ? `<i class="fa-solid fa-comment"></i>` 
    : `<i class="fa-regular fa-comment"></i>`;
  noteBtn.className = `icon-btn note-btn ${hasNote ? 'has-note' : ''}`;
  noteBtn.title = hasNote ? "View/Edit note" : "Add note";
  noteBtn.dataset.time = bookmark.time;

  // Note container (hidden by default)
  const noteContainer = document.createElement("div");
  noteContainer.className = "note-container";
  noteContainer.style.display = "none";

  const noteTextarea = document.createElement("textarea");
  noteTextarea.className = "note-textarea";
  noteTextarea.placeholder = "Add your notes here...";
  noteTextarea.value = bookmark.note || "";
  noteTextarea.rows = 3;

  const noteActions = document.createElement("div");
  noteActions.className = "note-actions";

  const saveNoteBtn = document.createElement("button");
  saveNoteBtn.textContent = "Save";
  saveNoteBtn.className = "note-save-btn";

  const cancelNoteBtn = document.createElement("button");
  cancelNoteBtn.textContent = "Cancel";
  cancelNoteBtn.className = "note-cancel-btn";

  noteActions.appendChild(saveNoteBtn);
  noteActions.appendChild(cancelNoteBtn);
  noteContainer.appendChild(noteTextarea);
  noteContainer.appendChild(noteActions);

  // Event listeners
  playBtn.addEventListener("click", onPlay);
  deleteBtn.addEventListener("click", onDelete);
  editBtn.addEventListener("click", onEdit);

  noteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = noteContainer.style.display === "block";
    noteContainer.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      noteTextarea.focus();
    }
  });

  saveNoteBtn.addEventListener("click", () => {
    chrome.storage.sync.get([currentVideo], (data) => {
      let bookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
      const index = bookmarks.findIndex((b) => b.time == bookmark.time);
      if (index !== -1) {
        bookmarks[index].note = noteTextarea.value.trim();
        chrome.storage.sync.set(
          { [currentVideo]: JSON.stringify(bookmarks) },
          () => {
            // Update the button appearance
            const hasNote = bookmarks[index].note.length > 0;
            noteBtn.innerHTML = hasNote 
              ? `<i class="fa-solid fa-comment"></i>` 
              : `<i class="fa-regular fa-comment"></i>`;
            noteBtn.className = `icon-btn note-btn ${hasNote ? 'has-note' : ''}`;
            noteBtn.title = hasNote ? "View/Edit note" : "Add note";
            
            noteContainer.style.display = "none";
          }
        );
      }
    });
  });

  cancelNoteBtn.addEventListener("click", () => {
    noteTextarea.value = bookmark.note || "";
    noteContainer.style.display = "none";
  });

  // Assemble the bookmark
  controls.appendChild(playBtn);
  controls.appendChild(noteBtn);
  controls.appendChild(editBtn);
  controls.appendChild(deleteBtn);

  newBookmark.appendChild(title);
  newBookmark.appendChild(controls);
  newBookmark.appendChild(noteContainer);
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

// Function to refresh bookmarks from storage
const refreshBookmarks = () => {
  if (!currentVideo) return;

  chrome.storage.sync.get([currentVideo], (data) => {
    const videoBookmarks = data[currentVideo]
      ? JSON.parse(data[currentVideo])
      : [];
    viewBookmarks(videoBookmarks);
  });
};

// Load all videos with bookmarks
const loadAllVideos = () => {
  chrome.storage.sync.get(null, (data) => {
    allVideos = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Only process video IDs (11 characters for YouTube video IDs)
      if (key.length === 11) {
        try {
          const bookmarks = JSON.parse(value);
          if (bookmarks.length > 0) {
            allVideos[key] = bookmarks;
          }
        } catch (e) {
          // Skip invalid entries
        }
      }
    }
    
    displayVideoList();
  });
};

// Display video list in sidebar
const displayVideoList = () => {
  const videoListContainer = document.getElementById("video-list");
  videoListContainer.innerHTML = "";
  
  const videoIds = Object.keys(allVideos);
  
  if (videoIds.length === 0) {
    videoListContainer.innerHTML = `
      <div class="video-list-empty">
        <i class="fa-solid fa-bookmark"></i>
        <p>No bookmarked videos yet</p>
      </div>
    `;
    return;
  }
  
  videoIds.forEach(videoId => {
    const bookmarks = allVideos[videoId];
    const isCurrentVideo = videoId === currentVideo;
    
    const videoItem = document.createElement("div");
    videoItem.className = `video-item ${isCurrentVideo ? 'active' : ''}`;
    
    const videoThumb = document.createElement("img");
    videoThumb.className = "video-thumb";
    videoThumb.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    videoThumb.alt = "Video thumbnail";
    
    const videoInfo = document.createElement("div");
    videoInfo.className = "video-info";
    
    const bookmarkCount = document.createElement("div");
    bookmarkCount.className = "bookmark-count";
    bookmarkCount.innerHTML = `<i class="fa-solid fa-bookmark"></i> ${bookmarks.length}`;
    
    const videoLink = document.createElement("a");
    videoLink.href = `https://www.youtube.com/watch?v=${videoId}`;
    videoLink.target = "_blank";
    videoLink.className = "video-link";
    videoLink.title = "Open in YouTube";
    videoLink.innerHTML = `<i class="fa-solid fa-external-link-alt"></i>`;
    
    videoInfo.appendChild(bookmarkCount);
    videoInfo.appendChild(videoLink);
    
    videoItem.appendChild(videoThumb);
    videoItem.appendChild(videoInfo);
    
    videoListContainer.appendChild(videoItem);
  });
};

// Toggle sidebar
const toggleSidebar = () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");
  const isOpen = sidebar.classList.contains("open");
  
  if (isOpen) {
    sidebar.classList.remove("open");
    toggleBtn.innerHTML = `<i class="fa-solid fa-chevron-left"></i>`;
    toggleBtn.title = "Show bookmarked videos";
  } else {
    sidebar.classList.add("open");
    toggleBtn.innerHTML = `<i class="fa-solid fa-chevron-right"></i>`;
    toggleBtn.title = "Hide bookmarked videos";
    loadAllVideos(); // Refresh list when opening
  }
};

// Listen for chrome storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync") {
    if (changes[currentVideo]) {
      refreshBookmarks();
    }
    // Refresh video list if sidebar is open
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebar.classList.contains("open")) {
      loadAllVideos();
    }
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const currentTab = await getCurrentTab();
  if (!currentTab || !currentTab.url) return;

  const url = new URL(currentTab.url);
  currentVideo = url.searchParams.get("v");

  if (currentTab.url.includes("youtube.com/watch") && currentVideo) {
    refreshBookmarks();
    
    // Setup sidebar toggle
    const toggleBtn = document.getElementById("sidebar-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", toggleSidebar);
    }
  } else {
    window.location.href = "not-youtube.html";
  }
});

document.addEventListener("click", (e) => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");

  // If sidebar is open
  if (sidebar.classList.contains("open")) {
    // And the click is NOT inside the sidebar or the toggle button:
    if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
      toggleSidebar();
    }
  }
});
