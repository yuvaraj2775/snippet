let pendingSnippet = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveSnippet",
    title: "Save Selected Text",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveSnippet" && info.selectionText) {
    pendingSnippet = info.selectionText;
    chrome.action.openPopup();
  }
});

function addSnippet(text, title = "", category = "", url = "") {
  let timestamp = new Date().toLocaleString();
  let snippetEntry = `[${timestamp}]\n${title ? `[Title:${title}]` : ""}${category ? `\n[Category:${category}]` : ""}\n${text}${url ? `\n[URL:${url}]` : ""}`;

  chrome.storage.local.get(["snippets"], (data) => {
    let snippets = data.snippets || [];
    snippets.push(snippetEntry);
    chrome.storage.local.set({ snippets });
  });
}

function saveToFile(content, filename) {
  let blob = new Blob([content], { type: "text/plain" });
  let reader = new FileReader();
  reader.onloadend = function () {
    let dataUrl = reader.result;
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });
  };
  reader.readAsDataURL(blob);
}

function downloadAllSnippets() {
  chrome.storage.local.get(["snippets"], (data) => {
    let snippets = data.snippets || [];
    if (snippets.length === 0) return;
    let content = snippets.join("\n\n");
    saveToFile(content, "snippets.txt");
  });
}

function downloadSingleSnippet(index) {
  chrome.storage.local.get(["snippets"], (data) => {
    let snippets = data.snippets || [];
    if (snippets.length === 0 || !snippets[index]) return;
    let snippet = snippets[index];
    let titleMatch = snippet.match(/\[Title:(.*?)\]/);
    let filename = titleMatch ? `${titleMatch[1]}.txt` : `snippet_${index + 1}.txt`;
    saveToFile(snippet, filename);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveSnippet") {
    addSnippet(message.text, message.title, message.category);
  } else if (message.action === "getSnippets") {
    chrome.storage.local.get(["snippets"], (data) => {
      sendResponse({ snippets: data.snippets || [] });
    });
    return true;
  } else if (message.action === "downloadSnippets") {
    downloadAllSnippets();
  } else if (message.action === "captureText") {
    addSnippet(message.text, "", "", message.url);
  } else if (message.action === "deleteSnippet") {
    chrome.storage.local.get(["snippets"], (data) => {
      let snippets = data.snippets || [];
      snippets.splice(message.index, 1);
      chrome.storage.local.set({ snippets }, sendResponse);
    });
    return true;
  } else if (message.action === "getSnippet") {
    chrome.storage.local.get(["snippets"], (data) => {
      sendResponse({ snippet: data.snippets[message.index] });
    });
    return true;
  } else if (message.action === "getPendingSnippet") {
    sendResponse({ text: pendingSnippet });
    return true;
  } else if (message.action === "clearPendingSnippet") {
    pendingSnippet = null;
  } else if (message.action === "updateSnippet") {
    chrome.storage.local.get(["snippets"], (data) => {
      let snippets = data.snippets || [];
      let timestamp = new Date().toLocaleString();
      let snippetEntry = `[${timestamp}]\n${message.title ? `[Title:${message.title}]` : ""}${message.category ? `\n[Category:${message.category}]` : ""}\n${message.text}`;
      snippets[message.index] = snippetEntry;
      chrome.storage.local.set({ snippets }, sendResponse);
    });
    return true;
  } else if (message.action === "downloadSingleSnippet") {
    downloadSingleSnippet(message.index);
  }
});