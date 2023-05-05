let tabid = 0;

chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled background");
  clearState();
});

chrome.runtime.onConnect.addListener(function (port) {
  console.assert(port.name === "csa-background");
  port.onMessage.addListener(function (request) {
    switch (request.command) {
      case "tabid":
        //clearState();
        tabid = request.message;
        console.log("mgs background tabid:", tabid);
        break;
      case "setFilesCount":
        let count = request.message;
        console.log("mgs background setFilesCount:", count);
        //setState(count);
        break;
      case "saving":
        //console.log("saving background port", request.message);
        saving(request.message);
        break;
      case "start":
        console.log("startAction background port");
        chrome.storage.sync.get({}, (items) => {
          console.log("msg background start");
        });
        // port.postMessage({
        //   replybtn: "OK",
        //   state: "on",
        // });
        return true;
        break;
    }
  });
});

chrome.downloads.onCreated.addListener((s) => {
  console.log("New Download created. Id:" + s.id + ", fileSize:" + s.fileSize);
  increaseState();
});

chrome.downloads.onChanged.addListener((e) => {
  //console.log("Download state", e);
  if (typeof e.state !== "undefined") {
    if (e.state.current === "complete") {
      console.log("Download id" + e.id + " has completed.");
      decreaseState();
    }
    if (e.state.current === "interrupted" && e.error.current === "USER_CANCELED") {
      console.log("Download id" + e.id + " has USER_CANCELED.");
      decreaseState();
    }
  }
});

function saving(obj) {
  tabid = obj.tabid;
  let url = String(obj.url).startsWith("http") ? obj.url : obj.baseurl + obj.url;
  //console.log("saving :", url, obj);
  chrome.downloads.download(
    {
      url: url,
      filename: obj.filename,
      saveAs: false,
      conflictAction: "overwrite",
    },
    function (downloadId) {
      // If 'downloadId' is undefined, then there is an error
      // so making sure it is not so before proceeding.
      if (typeof downloadId !== "undefined") {
        console.log("Download initiated, ID is: " + downloadId);
        //sendMessage("downloading", downloadId);
      }
    }
  );
}

function setState(c, tabid = 0) {
  tabid = tabid ? tabid : getCurrentTab()?.id;
  chrome.action.setBadgeText({ text: String(c).trim(), tabId: tabid });
  setStateColor(1);
  setTimeout(() => {
    setStateColor(2);
  }, 500);
}

function setStateColor(color = 0, tabid = 0) {
  tabid = tabid ? tabid : getCurrentTab()?.id;
  const colormodes = ["white", "red", "blue"];
  chrome.action.setBadgeBackgroundColor({
    color: colormodes[color],
    tabId: tabid,
  });
}

function decreaseState() {
  chrome.action.getBadgeText({}, (c) => {
    c = Number(isNaN(c) ? 0 : c) - 1;
    if (c <= 0) {
      setState("OK");
      setTimeout(() => {
        setState("");
      }, 5000);
    } else {
      setState(c);
    }
  });
}
function increaseState() {
  chrome.action.getBadgeText({}, (c) => {
    c = Number(isNaN(c) ? 0 : c) + 1;
    if (c > 30) c = "";
    setState(c);
  });
}

function clearState(tabid = 0) {
  tabid = tabid ? tabid : getCurrentTab()?.id;
  chrome.action.setBadgeText({ text: "", tabId: tabid });
  chrome.action.setBadgeBackgroundColor({
    color: "white",
    tabId: tabid,
  });
}

function sentMsg(cmd, tabid = 0) {
  tabid = tabid ? tabid : getCurrentTab()?.id;
  chrome.runtime.sendMessage({ greeting: "csa-bg", command: cmd, tabid: tabid }, function (response) {
    console.log("runtime.sentMsg response", response);
  });
}

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}
