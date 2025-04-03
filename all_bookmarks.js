document.addEventListener("DOMContentLoaded", async () => {
  const allBookmarksElement = document.getElementById("all-bookmarks");
  const deleteAllButton = document.getElementById("delete-all");
  const storageText = document.getElementById("storage-text");
  const storageProgress = document.getElementById("storage-progress");

  // Function to format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString(); // Converts to readable format
  };

  // Function to update total storage usage display
  const updateTotalStorageUsage = () => {
    chrome.storage.sync.getBytesInUse(null, (bytesInUse) => {
      const maxStorage = 102400; // Chrome sync storage limit (100 KB)
      const percentageUsed = ((bytesInUse / maxStorage) * 100).toFixed(2);

      // Update text and progress bar
      storageText.textContent = `Total Storage Used: ${percentageUsed}% (${bytesInUse} bytes)`;
      storageProgress.style.width = `${percentageUsed}%`;

      // Change color if storage is almost full
      if (percentageUsed > 80) {
        storageProgress.style.backgroundColor = "#ff5733"; // Red (warning)
      } else {
        storageProgress.style.backgroundColor = "#007bff"; // Blue (normal)
      }
    });
  };

  // Function to render all bookmarks
  const renderBookmarks = () => {
    chrome.storage.sync.get(null, (data) => {
      allBookmarksElement.innerHTML = ""; // Clear previous list

      // Check if storage is empty
      const videoIds = Object.keys(data).filter((id) => !id.endsWith("_title"));
      if (videoIds.length === 0) {
        allBookmarksElement.innerHTML = "<i>No bookmarks saved yet.</i>";
        deleteAllButton.style.display = "none"; // Hide delete button
        return;
      }

      deleteAllButton.style.display = "block"; // Show delete button

      videoIds.forEach((videoId) => {
        let videoBookmarks = JSON.parse(data[videoId]);
        if (videoBookmarks.length === 0) return; // Skip empty entries

        // Sort bookmarks by timestamp (latest first)
        videoBookmarks.sort((a, b) => b.timestamp - a.timestamp);

        // Fetch stored video title
        const videoTitle = data[`${videoId}_title`] || "Unknown Video";

        // Create video section
        const videoSection = document.createElement("div");
        videoSection.className = "video-bookmark-section";

        const videoTitleElement = document.createElement("h3");
        videoTitleElement.innerHTML = `🎥 <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">${videoTitle}</a>`;
        videoSection.appendChild(videoTitleElement);

        const bookmarkList = document.createElement("ul");
        videoBookmarks.forEach((bookmark) => {
          const bookmarkItem = document.createElement("li");
          bookmarkItem.className = "bookmark-item";

          // Description
          const bookmarkText = document.createElement("span");
          bookmarkText.innerHTML = `<strong>${bookmark.desc}</strong> - ${bookmark.shortDesc} <br> <small>🕒 Added at: ${bookmark.addedAt}</small>`;

          // Flex container for buttons
          const buttonContainer = document.createElement("div");
          buttonContainer.className = "button-container";

          // Play Button
          const playButton = document.createElement("a");
          playButton.href = `https://www.youtube.com/watch?v=${videoId}&t=${bookmark.time}s`;
          playButton.target = "_blank";
          playButton.textContent = "▶";
          playButton.className = "play-button";

          // Delete Button
          const deleteButton = document.createElement("button");
          deleteButton.textContent = "⚔️";
          deleteButton.className = "delete-button";
          deleteButton.addEventListener("click", () => {
            deleteBookmark(videoId, bookmark.time, bookmarkItem, videoSection);
          });

          // Append buttons to container
          buttonContainer.appendChild(playButton);
          buttonContainer.appendChild(deleteButton);

          // Append elements to list item
          bookmarkItem.appendChild(bookmarkText);
          bookmarkItem.appendChild(buttonContainer);
          bookmarkList.appendChild(bookmarkItem);
        });

        videoSection.appendChild(bookmarkList);
        allBookmarksElement.appendChild(videoSection);
      });

      // Update storage usage after rendering
      updateTotalStorageUsage();
    });
  };

  // Function to delete a single bookmark
  const deleteBookmark = (videoId, time, bookmarkElement, videoSection) => {
    chrome.storage.sync.get([videoId], (data) => {
      let bookmarks = data[videoId] ? JSON.parse(data[videoId]) : [];

      // Remove the specific bookmark
      bookmarks = bookmarks.filter((b) => b.time !== time);

      // Update Chrome storage
      if (bookmarks.length > 0) {
        chrome.storage.sync.set(
          { [videoId]: JSON.stringify(bookmarks) },
          () => {
            console.log("Bookmark deleted!");
            bookmarkElement.remove();
            updateTotalStorageUsage(); // Update storage after deletion
          }
        );
      } else {
        // If no bookmarks left for this video, remove the entry
        chrome.storage.sync.remove(videoId, () => {
          console.log("No bookmarks left for this video. Removing...");
          videoSection.remove();
          updateTotalStorageUsage(); // Update storage after removal
        });
      }
    });
  };

  // Function to delete ALL bookmarks
  deleteAllButton.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to delete all bookmarks? This action cannot be undone."
      )
    ) {
      chrome.storage.sync.clear(() => {
        alert("All bookmarks deleted successfully!");
        allBookmarksElement.innerHTML = "<i>No bookmarks saved yet.</i>";
        deleteAllButton.style.display = "none"; // Hide delete button after deletion
        updateTotalStorageUsage(); // Update storage after clearing
      });
    }
  });

  // Function to remove empty bookmark entries
  const cleanUpEmptyBookmarks = () => {
    chrome.storage.sync.get(null, (data) => {
      const videoIds = Object.keys(data).filter((id) => !id.endsWith("_title"));

      videoIds.forEach((videoId) => {
        const bookmarks = JSON.parse(data[videoId] || "[]");
        if (bookmarks.length === 0) {
          chrome.storage.sync.remove(videoId, () => {
            console.log(`Removed empty bookmark entry: ${videoId}`);
            updateTotalStorageUsage(); // Update storage after cleanup
          });
        }
      });
    });
  };

  cleanUpEmptyBookmarks();
  renderBookmarks();
});
