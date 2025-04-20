document.addEventListener("DOMContentLoaded", async () => {
  const allBookmarksElement = document.getElementById("all-bookmarks");
  const deleteAllButton = document.getElementById("delete-all");
  const storageText = document.getElementById("storage-text");
  const storageProgress = document.getElementById("storage-progress");
  const exportButton = document.getElementById("export-button");
  const importButton = document.getElementById("import-button");
  const importFileInput = document.getElementById("import-file");

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
      storageProgress.style.backgroundColor =
        percentageUsed > 80 ? "#ff5733" : "#007bff";
    });
  };

  const renderBookmarks = () => {
    chrome.storage.sync.get(null, (data) => {
      allBookmarksElement.innerHTML = "";
      const videoIds = Object.keys(data).filter((id) => !id.endsWith("_title"));
      if (videoIds.length === 0) {
        allBookmarksElement.innerHTML = "<i>No bookmarks saved yet.</i>";
        deleteAllButton.style.display = "none";
        return;
      }
      deleteAllButton.style.display = "block";

      videoIds.forEach((videoId) => {
        let videoBookmarks = JSON.parse(data[videoId]);
        if (videoBookmarks.length === 0) return;
        videoBookmarks.sort((a, b) => b.timestamp - a.timestamp);
        const videoTitle = data[`${videoId}_title`] || "Unknown Video";
        const videoSection = document.createElement("div");
        videoSection.className = "video-bookmark-section";
        const videoTitleElement = document.createElement("h3");
        videoTitleElement.innerHTML = `🎥 <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">${videoTitle}</a>`;
        videoSection.appendChild(videoTitleElement);
        const shareButton = document.createElement("button");
        shareButton.textContent = "➥";
        shareButton.className = "share-button";
        shareButton.addEventListener("click", () => {
          let shareText = `📌 *Bookmarks for ${videoTitle}:*\n\n`;
          videoBookmarks.forEach((bookmark, index) => {
            const url = `https://www.youtube.com/watch?v=${videoId}&t=${bookmark.time}s`;
            shareText += `${index + 1}. *${bookmark.shortDesc}*\n🔗 ${url}\n\n`;
          });
          const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(
            shareText
          )}`;
          window.open(whatsappUrl, "_blank");
        });

        const copyButton = document.createElement("button");
        copyButton.textContent = "🗐";
        copyButton.className = "copy-button";
        copyButton.addEventListener("click", () => {
          let copyText = `📌 *Bookmarks for ${videoTitle}:*\n\n`;
          videoBookmarks.forEach((bookmark, index) => {
            const url = `https://www.youtube.com/watch?v=${videoId}&t=${bookmark.time}s`;
            copyText += `${index + 1}. *${bookmark.shortDesc}*\n🔗 ${url}\n\n`;
          });
          navigator.clipboard.writeText(copyText).then(() => {
            copyButton.textContent = "✔";
            setTimeout(() => (copyButton.textContent = "🗐"), 1500);
          });
        });

        // ✅ New flex container for title + share + copy
        const videoHeader = document.createElement("div");
        videoHeader.className = "video-header";
        videoHeader.appendChild(videoTitleElement);
        videoHeader.appendChild(shareButton);
        videoHeader.appendChild(copyButton);
        videoSection.appendChild(videoHeader);

        const bookmarkList = document.createElement("ul");
        videoBookmarks.forEach((bookmark, index) => {
          const bookmarkItem = document.createElement("li");
          bookmarkItem.className = "bookmark-item";
          const bookmarkText = document.createElement("span");
          bookmarkText.innerHTML = `<strong>${index + 1}. ${
            bookmark.desc
          }</strong> - ${bookmark.shortDesc} <br> <small>🕒 Added at: ${
            bookmark.addedAt
          }</small>`;
          const buttonContainer = document.createElement("div");
          buttonContainer.className = "button-container";
          const playButton = document.createElement("a");
          playButton.href = `https://www.youtube.com/watch?v=${videoId}&t=${bookmark.time}s`;
          playButton.target = "_blank";
          playButton.textContent = "▶";
          playButton.className = "play-button";
          const deleteButton = document.createElement("button");
          deleteButton.textContent = "✖ ";
          deleteButton.className = "delete-button";
          deleteButton.addEventListener("click", () => {
            deleteBookmark(videoId, bookmark.time, bookmarkItem, videoSection);
          });
          buttonContainer.appendChild(playButton);
          buttonContainer.appendChild(deleteButton);
          bookmarkItem.appendChild(bookmarkText);
          bookmarkItem.appendChild(buttonContainer);
          bookmarkList.appendChild(bookmarkItem);
        });
        videoSection.appendChild(bookmarkList);
        allBookmarksElement.appendChild(videoSection);
      });
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
    if (confirm("Are you sure you want to delete all bookmarks?")) {
      chrome.storage.sync.clear(() => {
        alert("All bookmarks deleted successfully!");
        allBookmarksElement.innerHTML = "<i>No bookmarks saved yet.</i>";
        deleteAllButton.style.display = "none";
        updateTotalStorageUsage();
      });
    }
  });

  // Function to export bookmarks as JSON
  function exportBookmarks() {
    chrome.storage.sync.get(null, (data) => {
      if (Object.keys(data).length === 0) {
        alert("No bookmarks to export!");
        return;
      }

      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "bookmarks_export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    });
  }

  // Function to import bookmarks from a JSON file
  async function importBookmarks(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const importedData = JSON.parse(e.target.result);

        chrome.storage.sync.get(null, async (existingData) => {
          // Merge data in chunks to prevent freezing
          const mergedData = { ...existingData, ...importedData };

          for (const [key, value] of Object.entries(mergedData)) {
            await new Promise((resolve) => {
              chrome.storage.sync.set({ [key]: value }, resolve);
            });
          }

          alert("Bookmarks imported successfully!");

          // Delay reload to avoid performance issues
          setTimeout(() => {
            location.reload();
          }, 500);
        });
      } catch (error) {
        alert("Invalid file format! Please upload a valid JSON file.");
      }
    };

    reader.readAsText(file);
  }

  // Attach event listeners
  exportButton.addEventListener("click", exportBookmarks);
  importButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", importBookmarks);

  renderBookmarks();
});
