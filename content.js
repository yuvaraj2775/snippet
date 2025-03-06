chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "saveSnippet",
      title: "Save Selected Text",
      contexts: ["selection"]
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "saveSnippet" && info.selectionText) {
      addSnippet(info.selectionText, "", tab.url);
    }
  });
  
  function addSnippet(text, category = "", url = "") {
    let timestamp = new Date().toLocaleString();
    let snippetEntry = `[${timestamp}]\n${category ? `[Category:${category}]` : ""}\n${text}${url ? `\n[URL:${url}]` : ""}`;
  
    chrome.storage.local.get(["snippets"], (data) => {
      let snippets = data.snippets || [];
      snippets.push(snippetEntry);
      chrome.storage.local.set({ snippets });
    });
  }
  
  function saveToFile() {
    chrome.storage.local.get(["snippets"], (data) => {
      let snippets = data.snippets || [];
      if (snippets.length === 0) return;
  
      let content = snippets.join("\n\n");
      let blob = new Blob([content], { type: "text/plain" });
  
      let reader = new FileReader();
      reader.onloadend = function () {
        let dataUrl = reader.result;
        chrome.downloads.download({
          url: dataUrl,
          filename: "snippets.txt",
          saveAs: false
        });
        chrome.storage.local.set({ snippets: [] });
      };
      reader.readAsDataURL(blob);
    });
  }
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "saveSnippet") {
      addSnippet(message.text, message.category);
    } else if (message.action === "getSnippets") {
      chrome.storage.local.get(["snippets"], (data) => {
        sendResponse({ snippets: data.snippets || [] });
      });
      return true;
    } else if (message.action === "downloadSnippets") {
      saveToFile();
    } else if (message.action === "captureText") {
      addSnippet(message.text, "", message.url);
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
    }
  });