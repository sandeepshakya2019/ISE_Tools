document.addEventListener("DOMContentLoaded", async () => {
  const allBookmarksElement = document.getElementById("all-bookmarks");
  const deleteAllButton = document.getElementById("delete-all");
  const storageText = document.getElementById("storage-text");
  const storageProgress = document.getElementById("storage-progress");
  const exportButton = document.getElementById("export-button");
  const importButton = document.getElementById("import-button");
  const importFileInput = document.getElementById("import-file");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-options");

  const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString();

  const updateTotalStorageUsage = () => {
    chrome.storage.sync.getBytesInUse(null, (bytesInUse) => {
      const maxStorage = 102400;
      const percentageUsed = ((bytesInUse / maxStorage) * 100).toFixed(2);
      storageText.textContent = `Total Storage Used: ${percentageUsed}% (${bytesInUse} bytes)`;
      storageProgress.style.width = `${percentageUsed}%`;
      storageProgress.style.backgroundColor =
        percentageUsed > 80 ? "#ff5733" : "#007bff";
    });
  };

  const renderBookmarks = () => {
    chrome.storage.sync.get(null, (data) => {
      allBookmarksElement.innerHTML = "";
      const searchQuery = searchInput?.value.toLowerCase() || "";
      const sortBy = sortSelect?.value || "date";

      let videoIds = Object.keys(data).filter((id) => !id.endsWith("_title"));

      if (sortBy === "title") {
        videoIds.sort((a, b) => {
          const titleA = (data[`${a}_title`] || "").toLowerCase();
          const titleB = (data[`${b}_title`] || "").toLowerCase();
          return titleA.localeCompare(titleB);
        });
      }

      if (videoIds.length === 0) {
        allBookmarksElement.innerHTML = "<i>No bookmarks saved yet.</i>";
        deleteAllButton.style.display = "none";
        return;
      }

      deleteAllButton.style.display = "block";

      videoIds.forEach((videoId) => {
        let videoBookmarks = JSON.parse(data[videoId] || "[]");
        if (!videoBookmarks.length) return;

        videoBookmarks.sort((a, b) => b.timestamp - a.timestamp);

        const filteredBookmarks = videoBookmarks.filter(
          (b) =>
            b.desc.toLowerCase().includes(searchQuery) ||
            b.shortDesc.toLowerCase().includes(searchQuery)
        );

        if (filteredBookmarks.length === 0) return;

        const videoTitle = data[`${videoId}_title`] || "Unknown Video";
        const videoSection = document.createElement("div");
        videoSection.className = "video-bookmark-section";

        const videoTitleElement = document.createElement("h3");
        videoTitleElement.innerHTML = `🎥 <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">${videoTitle}</a>`;

        const shareButton = document.createElement("button");
        shareButton.textContent = "➥";
        shareButton.className = "share-button";
        shareButton.addEventListener("click", () => {
          let shareText = `📌 *Bookmarks for ${videoTitle}:*\n\n`;
          videoBookmarks.forEach((bookmark, i) => {
            const url = `https://www.youtube.com/watch?v=${videoId}&t=${bookmark.time}s`;
            shareText += `${i + 1}. *${bookmark.shortDesc}*\n🔗 ${url}\n\n`;
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
          videoBookmarks.forEach((bookmark, i) => {
            const url = `https://www.youtube.com/watch?v=${videoId}&t=${bookmark.time}s`;
            copyText += `${i + 1}. *${bookmark.shortDesc}*\n🔗 ${url}\n\n`;
          });
          navigator.clipboard.writeText(copyText).then(() => {
            copyButton.textContent = "✔";
            setTimeout(() => (copyButton.textContent = "🗐"), 1500);
          });
        });

        const videoHeader = document.createElement("div");
        videoHeader.className = "video-header";
        videoHeader.appendChild(videoTitleElement);
        videoHeader.appendChild(shareButton);
        videoHeader.appendChild(copyButton);
        videoSection.appendChild(videoHeader);

        const bookmarkList = document.createElement("ul");
        filteredBookmarks.forEach((bookmark, i) => {
          const bookmarkItem = document.createElement("li");
          bookmarkItem.className = "bookmark-item";

          const bookmarkText = document.createElement("span");
          bookmarkText.innerHTML = `<strong>${i + 1}. ${
            bookmark.desc
          }</strong> - ${bookmark.shortDesc}<br><small>🕒 Added at: ${
            bookmark.addedAt
          }</small>`;

          const buttonContainer = document.createElement("div");
          buttonContainer.className = "button-container";

          const playButton = document.createElement("a");
          playButton.href = `https://www.youtube.com/watch?v=${videoId}&t=${bookmark.time}s`;
          playButton.target = "_blank";
          playButton.textContent = "▶";
          playButton.className = "play-button";

          const editButton = document.createElement("button");
          editButton.textContent = "✎";
          editButton.className = "edit-button";
          editButton.addEventListener("click", () => {
            const newDesc = prompt("Edit description:", bookmark.desc);
            const newShortDesc = prompt(
              "Edit short description:",
              bookmark.shortDesc
            );
            if (newDesc !== null && newShortDesc !== null) {
              bookmark.desc = newDesc;
              bookmark.shortDesc = newShortDesc;
              chrome.storage.sync.get([videoId], (data) => {
                let bookmarks = JSON.parse(data[videoId]);
                const idx = bookmarks.findIndex(
                  (b) => b.time === bookmark.time
                );
                if (idx !== -1) {
                  bookmarks[idx] = bookmark;
                  chrome.storage.sync.set(
                    { [videoId]: JSON.stringify(bookmarks) },
                    renderBookmarks
                  );
                }
              });
            }
          });

          const deleteButton = document.createElement("button");
          deleteButton.textContent = "✖";
          deleteButton.className = "delete-button";
          deleteButton.addEventListener("click", () =>
            deleteBookmark(videoId, bookmark.time, bookmarkItem, videoSection)
          );

          buttonContainer.appendChild(playButton);
          buttonContainer.appendChild(editButton);
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

  const deleteBookmark = (videoId, time, bookmarkElement, videoSection) => {
    chrome.storage.sync.get([videoId], (data) => {
      let bookmarks = data[videoId] ? JSON.parse(data[videoId]) : [];
      bookmarks = bookmarks.filter((b) => b.time !== time);
      if (bookmarks.length > 0) {
        chrome.storage.sync.set(
          { [videoId]: JSON.stringify(bookmarks) },
          () => {
            bookmarkElement.remove();
            updateTotalStorageUsage();
          }
        );
      } else {
        chrome.storage.sync.remove(videoId, () => {
          videoSection.remove();
          updateTotalStorageUsage();
        });
      }
    });
  };

  deleteAllButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all bookmarks?")) {
      chrome.storage.sync.clear(() => {
        alert("All bookmarks deleted!");
        allBookmarksElement.innerHTML = "<i>No bookmarks saved yet.</i>";
        deleteAllButton.style.display = "none";
        updateTotalStorageUsage();
      });
    }
  });

  function exportBookmarks() {
    chrome.storage.sync.get(null, (data) => {
      if (!Object.keys(data).length) {
        alert("No bookmarks to export!");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
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

  async function importBookmarks(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        chrome.storage.sync.get(null, async (existingData) => {
          const mergedData = { ...existingData, ...importedData };
          for (const [key, value] of Object.entries(mergedData)) {
            await new Promise((resolve) =>
              chrome.storage.sync.set({ [key]: value }, resolve)
            );
          }
          alert("Bookmarks imported successfully!");
          setTimeout(() => location.reload(), 500);
        });
      } catch {
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
  }

  exportButton.addEventListener("click", exportBookmarks);
  importButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", importBookmarks);
  searchInput.addEventListener("input", renderBookmarks);
  sortSelect.addEventListener("change", renderBookmarks);

  renderBookmarks();
});
