document.addEventListener("DOMContentLoaded", () => {
  loadSnippets();
  document.getElementById("search").addEventListener("input", filterSnippets);

  chrome.runtime.sendMessage({ action: "getPendingSnippet" }, (response) => {
    if (response && response.text) {
      document.getElementById("snippetText").value = response.text;
      document.getElementById("title").focus();
      document.getElementById("saveSnippet").innerHTML = '<i class="fas fa-save"></i> Add Snippet';
    }
  });
});

let isEditing = false;
let editIndex = null;

document.getElementById("saveSnippet").addEventListener("click", () => {
  let snippet = document.getElementById("snippetText").value;
  let title = document.getElementById("title").value;
  if (snippet.trim()) {
    if (isEditing) {
      chrome.runtime.sendMessage({ action: "updateSnippet", index: editIndex, text: snippet, title }, () => {
        resetForm();
        loadSnippets();
        showPopupMessage("Snippet updated!");
      });
    } else {
      chrome.runtime.sendMessage({ action: "saveSnippet", text: snippet, title }, () => {
        resetForm();
        loadSnippets();
        showPopupMessage("Snippet saved!");
        chrome.runtime.sendMessage({ action: "clearPendingSnippet" });
      });
    }
  }
});

document.getElementById("downloadSnippets").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "downloadSnippets" });
  loadSnippets();
  showPopupMessage("All snippets downloaded!");
});

function loadSnippets() {
  chrome.runtime.sendMessage({ action: "getSnippets" }, (response) => {
    let snippetsDiv = document.getElementById("snippets");
    if (response.snippets.length > 0) {
      snippetsDiv.innerHTML = response.snippets.map((s, index) => {
        let parts = s.split("\n");
        let timestamp = parts[0];
        let title = parts[1].startsWith("[Title:") ? parts[1].slice(7, -1) : "";
        let offset = title ? 1 : 0;
        let text = parts.slice(1 + offset).join("\n");
        return `<div class="snippet-item" data-index="${index}">
                    <div class="snippet-actions-top">
                        <button class="edit" data-index="${index}"><i class="fas fa-edit"></i></button>
                        <button class="delete" data-index="${index}"><i class="fas fa-trash"></i></button>
                        <button class="download" data-index="${index}"><i class="fas fa-download"></i></button>
                    </div>
                     ${title ? `<div class="category">Title: ${title}</div>` : ""}
                    <div class="timestamp">${timestamp}</div>
                    <div>${text}</div>
                </div>`;
      }).join("");
      attachSnippetActions();
    } else {
      snippetsDiv.innerHTML = "No snippets yet.";
    }
  });
}

function attachSnippetActions() {
  document.querySelectorAll(".edit").forEach(btn => {
    btn.addEventListener("click", (e) => {
      let index = e.target.closest("button").dataset.index;
      chrome.runtime.sendMessage({ action: "getSnippet", index }, (response) => {
        let parts = response.snippet.split("\n");
        let title = parts[1].startsWith("[Title:") ? parts[1].slice(7, -1) : "";
        let offset = title ? 1 : 0;
        let text = parts.slice(1 + offset).join("\n");
        document.getElementById("snippetText").value = text;
        document.getElementById("title").value = title;
        document.getElementById("saveSnippet").innerHTML = '<i class="fas fa-edit"></i> Edit Snippet';
        isEditing = true;
        editIndex = index;
        chrome.runtime.sendMessage({ action: "deleteSnippet", index });
      });
    });
  });
  document.querySelectorAll(".delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      let index = e.target.closest("button").dataset.index;
      chrome.runtime.sendMessage({ action: "deleteSnippet", index }, () => {
        loadSnippets();
        showPopupMessage("Snippet deleted!");
      });
    });
  });
  document.querySelectorAll(".download").forEach(btn => {
    btn.addEventListener("click", (e) => {
      let index = e.target.closest("button").dataset.index;
      chrome.runtime.sendMessage({ action: "downloadSingleSnippet", index }, () => {
        showPopupMessage("Snippet downloaded!");
      });
    });
  });
}

function filterSnippets() {
  let query = document.getElementById("search").value.toLowerCase();
  chrome.runtime.sendMessage({ action: "getSnippets" }, (response) => {
    let snippetsDiv = document.getElementById("snippets");
    let filtered = response.snippets.filter(s => s.toLowerCase().includes(query));
    snippetsDiv.innerHTML = filtered.length > 0
      ? filtered.map((s, index) => {
          let parts = s.split("\n");
          let timestamp = parts[0];
          let title = parts[1].startsWith("[Title:") ? parts[1].slice(7, -1) : "";
          let offset = title ? 1 : 0;
          let text = parts.slice(1 + offset).join("\n");
          return `<div class="snippet-item" data-index="${index}">
                      <div class="snippet-actions-top">
                          <button class="edit" data-index="${index}"><i class="fas fa-edit"></i></button>
                          <button class="delete" data-index="${index}"><i class="fas fa-trash"></i></button>
                          <button class="download" data-index="${index}"><i class="fas fa-download"></i></button>
                      </div>
                       ${title ? `<div class="category">Title: ${title}</div>` : ""}
                      <div class="timestamp">${timestamp}</div>
                      <div>${text}</div>
                  </div>`;
        }).join("")
      : "No matching snippets.";
    attachSnippetActions();
  });
}

function showPopupMessage(message, duration = 2000) {
  const popup = document.getElementById("popup-msg");
  popup.textContent = message;
  popup.classList.add("show");
  setTimeout(() => {
    popup.classList.remove("show");
  }, duration);
}

function resetForm() {
  document.getElementById("snippetText").value = "";
  document.getElementById("title").value = "";
  document.getElementById("saveSnippet").innerHTML = '<i class="fas fa-save"></i> Add Snippet';
  isEditing = false;
  editIndex = null;
}