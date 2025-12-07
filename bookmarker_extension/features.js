// feature.js
let currentSortMode = 'time'; // 'time' or 'name'

// Update the "Bookmarks" and "Notes" counters in the Current Video section
export function updateCurrentVideoCounters(videoId) {
  if (!videoId) return;

  chrome.storage.sync.get([videoId], (data) => {
    let bookmarks = [];

    try {
      bookmarks = data[videoId] ? JSON.parse(data[videoId]) : [];
    } catch {
      bookmarks = [];
    }

    // Count bookmarks
    const bookmarkCount = bookmarks.length;

    // Count notes (bookmarks where note exists + not empty)
    const noteCount = bookmarks.filter(
      (b) => b.note && b.note.trim().length > 0
    ).length;

    // Update on-page UI
    document.getElementById("bookmark-count").textContent = bookmarkCount;
    document.getElementById("note-count").textContent = noteCount;

    // Show/hide empty state
    const emptyState = document.getElementById("empty-state");
    const bookmarksGrid = document.getElementById("bookmarks");
    
    if (bookmarkCount === 0) {
      emptyState?.classList.add('show');
      bookmarksGrid?.classList.add('hidden');
    } else {
      emptyState?.classList.remove('show');
      bookmarksGrid?.classList.remove('hidden');
    }
  });
}

// Update the total videos + total bookmarks in sidebar
export function updateSidebarCounters(allVideosObj) {
  const videoIds = Object.keys(allVideosObj);

  // Total number of videos
  const totalVideos = videoIds.length;

  // Total number of bookmarks across all videos
  const totalBookmarks = videoIds.reduce(
    (sum, id) => sum + (allVideosObj[id]?.length || 0),
    0
  );

  const totalVideosEl = document.getElementById("total-videos");
  const totalBookmarksEl = document.getElementById("total-bookmarks");
  
  if (totalVideosEl) totalVideosEl.textContent = totalVideos;
  if (totalBookmarksEl) totalBookmarksEl.textContent = totalBookmarks;
}

// Sort bookmarks by time (ascending/descending)
export function sortBookmarksByTime(bookmarks, ascending = true) {
  return [...bookmarks].sort((a, b) => {
    const timeA = parseFloat(a.time);
    const timeB = parseFloat(b.time);
    return ascending ? timeA - timeB : timeB - timeA;
  });
}

// Sort bookmarks alphabetically by title
export function sortBookmarksByName(bookmarks, ascending = true) {
  return [...bookmarks].sort((a, b) => {
    const nameA = (a.desc || '').toLowerCase();
    const nameB = (b.desc || '').toLowerCase();
    
    if (ascending) {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });
}

// Apply current sort to bookmarks
export function applySortToBookmarks(bookmarks) {
  if (currentSortMode === 'time') {
    return sortBookmarksByTime(bookmarks, true);
  } else if (currentSortMode === 'name') {
    return sortBookmarksByName(bookmarks, true);
  }
  return bookmarks;
}

// Initialize sorting buttons
export function initSortingButtons(refreshCallback) {
  const sortTimeBtn = document.getElementById('sort-time');
  const sortNameBtn = document.getElementById('sort-name');

  if (!sortTimeBtn || !sortNameBtn) return;

  // Set initial active state
  sortTimeBtn.classList.add('active');

  sortTimeBtn.addEventListener('click', () => {
    currentSortMode = 'time';
    sortTimeBtn.classList.add('active');
    sortNameBtn.classList.remove('active');
    refreshCallback();
  });

  sortNameBtn.addEventListener('click', () => {
    currentSortMode = 'name';
    sortNameBtn.classList.add('active');
    sortTimeBtn.classList.remove('active');
    refreshCallback();
  });
}

// Get current sort mode
export function getCurrentSortMode() {
  return currentSortMode;
}

// Initialize listener for storage changes
export function initCounterListeners(currentVideoGetter, allVideosGetter) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;

    const currentVideo = currentVideoGetter();
    if (!currentVideo) return;

    // If the current video's bookmarks changed → update counters
    if (changes[currentVideo]) {
      updateCurrentVideoCounters(currentVideo);
    }

    // Always update sidebar counters when storage changes
    updateSidebarCounters(allVideosGetter());
  });
}