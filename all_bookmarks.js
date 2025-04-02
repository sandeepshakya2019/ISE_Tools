document.addEventListener("DOMContentLoaded", async () => {
  const allBookmarksElement = document.getElementById("all-bookmarks");

  chrome.storage.sync.get(null, async (data) => {
    allBookmarksElement.innerHTML = ""; // Clear previous list

    if (Object.keys(data).length === 0) {
      allBookmarksElement.innerHTML = "<i>No bookmarks saved yet.</i>";
      return;
    }

    for (const videoId of Object.keys(data)) {
      const videoBookmarks = JSON.parse(data[videoId]);
      if (videoBookmarks.length === 0) continue;

      // Fetch the video title
      const videoTitle = await getVideoTitle(videoId);

      // Create video section
      const videoSection = document.createElement("div");
      videoSection.className = "video-bookmark-section";

      const videoTitleElement = document.createElement("h3");
      videoTitleElement.innerHTML = `🎥 <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">${videoTitle}</a>`;
      videoSection.appendChild(videoTitleElement);

      const bookmarkList = document.createElement("ul");
      videoBookmarks.forEach((bookmark) => {
        const bookmarkItem = document.createElement("li");
        bookmarkItem.className = "bookmark-item"; // Added class for styling

        // Description
        const bookmarkText = document.createElement("span");
        bookmarkText.innerHTML = `<strong>${bookmark.desc}</strong> - ${bookmark.shortDesc}`;

        // Flex container for buttons
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "button-container"; // Flex container

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
    }
  });
});

// Function to get YouTube video title
const getVideoTitle = async (videoId) => {
  const YOUTUBE_API_KEY = "YOUR_YOUTUBE_API_KEY"; // Replace with your API key

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`
    );
    const data = await response.json();

    if (data.items.length > 0) {
      return data.items[0].snippet.title; // Extract and return the video title
    } else {
      return "Unknown Video";
    }
  } catch (error) {
    console.error("Error fetching video title:", error);
    return "Unknown Video";
  }
};

// Function to delete a bookmark
const deleteBookmark = (videoId, time, bookmarkElement, videoSection) => {
  chrome.storage.sync.get([videoId], (data) => {
    let bookmarks = data[videoId] ? JSON.parse(data[videoId]) : [];

    // Filter out the bookmark to delete
    bookmarks = bookmarks.filter((b) => b.time !== time);

    // Update Chrome storage
    chrome.storage.sync.set({ [videoId]: JSON.stringify(bookmarks) }, () => {
      console.log("Bookmark deleted!");

      // Remove bookmark from UI
      bookmarkElement.remove();

      // If no bookmarks left, remove the entire section
      if (bookmarks.length === 0) {
        videoSection.remove();
      }
    });
  });
};
