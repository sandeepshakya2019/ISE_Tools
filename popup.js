import { getActiveTabURL } from "./utils.js";

// Function to add a new bookmark
const addNewBookmark = (bookmarks, bookmark) => {
  const bookmarkTitleElement = document.createElement("div");
  const controlsElement = document.createElement("div");
  const newBookmarkElement = document.createElement("div");
  const addedAtElement = document.createElement("div"); // Element for "Added at"
  const shortDescElement = document.createElement("div"); // Element for "Short Description"

  // Create the full bookmark description
  bookmarkTitleElement.textContent = bookmark.desc;
  bookmarkTitleElement.className = "bookmark-title";

  // Create the short description
  shortDescElement.textContent =
    bookmark.shortDesc || "No short description available."; // Default text if no shortDesc
  shortDescElement.className = "bookmark-short-desc"; // Optional: class for styling

  // Create the "Added at" text
  addedAtElement.textContent = bookmark.addedAt; // Add formatted date and time
  addedAtElement.className = "bookmark-added-at"; // Optional: add a class for styling

  // Create controls for play, delete, and edit
  controlsElement.className = "bookmark-controls";
  setBookmarkAttributes("play", onPlay, controlsElement);
  setBookmarkAttributes("delete", onDelete, controlsElement);

  // Create the Edit button
  const editButton = document.createElement("img");
  editButton.src = "assets/edit.png";
  editButton.className = "edit-button";
  editButton.title = "Edit Bookmark";
  editButton.addEventListener("click", () =>
    editBookmark(bookmark, newBookmarkElement, editButton)
  );

  // Add the Edit button to controls
  controlsElement.appendChild(editButton);

  // Set up the new bookmark element
  newBookmarkElement.id = "bookmark-" + bookmark.time;
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.setAttribute("timestamp", bookmark.time);

  // Append elements: title, short description, "Added at", and controls
  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(shortDescElement); // Append the short description
  newBookmarkElement.appendChild(addedAtElement); // Append the "Added at" text
  newBookmarkElement.appendChild(controlsElement);

  // Append the new bookmark to the parent container
  bookmarks.appendChild(newBookmarkElement);
};

// Function to handle editing the bookmark description
const editBookmark = (bookmark, bookmarkElement, editButton) => {
  const bookmarkDescElement = bookmarkElement.querySelector(
    ".bookmark-short-desc"
  );
  const currentDesc = bookmarkDescElement.textContent;

  // Hide the Edit button as soon as editing starts
  editButton.style.display = "none";

  // Create a textarea for editing the description (allow for multiline input)
  const editInput = document.createElement("textarea");
  editInput.value = currentDesc;
  editInput.className = "edit-input"; // Optional: for styling
  editInput.rows = 4; // Set initial rows, can be adjusted as needed
  editInput.style.width = "100%"; // Make the width 100% of the container
  editInput.style.resize = "none"; // Prevent resizing of the textarea

  // Replace the short description text with the textarea
  bookmarkDescElement.textContent = ""; // Remove the old description
  bookmarkDescElement.appendChild(editInput);

  // Add Save and Cancel buttons with images
  const saveButton = document.createElement("img");
  saveButton.src = "assets/save.png";
  saveButton.className = "save-button";
  saveButton.title = "Save Bookmark";
  saveButton.addEventListener("click", () =>
    saveBookmark(bookmark, editInput, bookmarkElement, editButton)
  );

  const cancelButton = document.createElement("img");
  cancelButton.src = "assets/cancel.png";
  cancelButton.className = "cancel-button";
  cancelButton.title = "Cancel Edit";
  cancelButton.addEventListener("click", () =>
    cancelEdit(bookmarkDescElement, currentDesc, editButton)
  );

  // Append Save and Cancel buttons to the controls
  const controls = bookmarkElement.querySelector(".bookmark-controls");
  controls.appendChild(saveButton);
  controls.appendChild(cancelButton);
};

const saveBookmark = (bookmark, editInput, bookmarkElement, editButton) => {
  // Get the new description from the input field
  const newDesc = editInput.value;
  bookmark.shortDesc = newDesc; // Update bookmark data

  // Update the bookmark UI
  const bookmarkDescElement = bookmarkElement.querySelector(
    ".bookmark-short-desc"
  );
  bookmarkDescElement.textContent = newDesc; // Update description in the UI

  // Remove the input field, Save and Cancel buttons from controls
  const controls = bookmarkElement.querySelector(".bookmark-controls");

  // Find and remove the Save and Cancel buttons
  const saveButton = controls.querySelector(".save-button");
  const cancelButton = controls.querySelector(".cancel-button");

  if (saveButton) controls.removeChild(saveButton);
  if (cancelButton) controls.removeChild(cancelButton);

  // Re-show the Edit button
  if (editButton) editButton.style.display = "inline-block"; // Show Edit button again
};

// Cancel editing and revert to the original description
const cancelEdit = (bookmarkDescElement, currentDesc, editButton) => {
  // Revert the description to the original text (before editing)
  bookmarkDescElement.textContent = currentDesc;

  // Find the controls element. If it's not a direct parent, we might need to traverse differently.
  const controls =
    bookmarkDescElement.parentNode.querySelector(".bookmark-controls");

  if (controls) {
    console.log("Controls found:", controls);

    // Find and remove the Save and Cancel buttons
    const saveButton = controls.querySelector(".save-button");
    const cancelButton = controls.querySelector(".cancel-button");

    console.log("Save button:", saveButton);
    console.log("Cancel button:", cancelButton);

    if (saveButton) {
      controls.removeChild(saveButton); // Remove Save button
    }

    if (cancelButton) {
      controls.removeChild(cancelButton); // Remove Cancel button
    }
  } else {
    console.log("No controls element found");
  }

  // Re-show the Edit button (Make sure it's visible again)
  if (editButton) {
    editButton.style.display = "inline-block"; // Show Edit button again
  }
};

// Function to view all bookmarks
const viewBookmarks = (currentBookmarks = []) => {
  const bookmarksElement = document.getElementById("bookmarks");
  bookmarksElement.innerHTML = "";

  if (currentBookmarks.length > 0) {
    for (let i = 0; i < currentBookmarks.length; i++) {
      const bookmark = currentBookmarks[i];
      addNewBookmark(bookmarksElement, bookmark);
    }
  } else {
    bookmarksElement.innerHTML = '<i class="row">No bookmarks to show</i>';
  }

  return;
};

// Function to play bookmark (simulated)
const onPlay = async (e) => {
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const activeTab = await getActiveTabURL();

  chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: bookmarkTime,
  });
};

// Function to delete a bookmark
const onDelete = async (e) => {
  const activeTab = await getActiveTabURL();
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const bookmarkElementToDelete = document.getElementById(
    "bookmark-" + bookmarkTime
  );

  bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete);

  chrome.tabs.sendMessage(
    activeTab.id,
    {
      type: "DELETE",
      value: bookmarkTime,
    },
    viewBookmarks
  );
};

// Function to set bookmark attributes for controls (play, delete)
const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
  const controlElement = document.createElement("img");

  controlElement.src = "assets/" + src + ".png";
  controlElement.title = src;
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();
  const queryParameters = activeTab.url.split("?")[1];
  const urlParameters = new URLSearchParams(queryParameters);

  const currentVideo = urlParameters.get("v");

  if (activeTab.url.includes("youtube.com/watch") && currentVideo) {
    chrome.storage.sync.get([currentVideo], (data) => {
      const currentVideoBookmarks = data[currentVideo]
        ? JSON.parse(data[currentVideo])
        : [];

      viewBookmarks(currentVideoBookmarks);
    });
  } else {
    const container = document.getElementsByClassName("container")[0];

    container.innerHTML =
      '<div class="title">This is not a YouTube video page.</div>';
  }
});
