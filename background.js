let tabid = 0;
const busymgs = [];
let waitTimerSytate1 = 0;
let waitTimerSytate2 = 0;

chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled background");
  clear_download_store();
});

chrome.runtime.onConnect.addListener(async (port) => {
  console.assert(port.name === "csa-background");
  port.onMessage.addListener(async (request) => {
    switch (request.command) {
      case "counterClear":
        clear_download_store();
        break;
      case "tabid":
        //clearState();
        tabid = request.message;
        //console.log("mgs background tabid:", tabid);
        break;
      case "setFilesCount":
        let count = request.message;
        //console.log("mgs background setFilesCount:", count);
        //setState(count);
        break;
      case "saving":
        console.log("saving background port", busymgs.length);
        busymgs.push(request.message);
        break;
      case "dosave":
        console.log("dosave background ", busymgs);
        doSaveIt(request.message);
        break;
    }
    return true;
  });
});

chrome.downloads.onCreated.addListener((s) => {
  console.log("New Download created. Id:" + s.id + ", fileSize:" + s.fileSize);
});

chrome.downloads.onChanged.addListener((e) => {
  //console.log("Download state", e);
  if (typeof e.state !== "undefined") {
    if (e.state.current === "complete") {
      console.log("Download id" + e.id + " has completed.");
      checkSavedState(e.id);
    }
    if (e.state.current === "interrupted" && e.error.current === "USER_CANCELED") {
      console.log("Download id" + e.id + " has USER_CANCELED.");
      checkSavedState(e.id);
    }
  }
});

async function doSaveIt(items) {
  // busymgs.forEach(async (item) => {
  //   console.log("doSaveIt  ", item);
  //   await saving(item);
  // });
  //let i = 0;
  while (busymgs?.length) {
    let item = busymgs.pop();
    console.log("doSaveIt  ", item);
    await saving(item);
    //i++;
  }
}

function checkSavedState(id) {
  chrome.storage.session.get({ downloadingnow: [] }, (items) => {
    if (items.downloadingnow.length) {
      if (items.downloadingnow.includes(id)) {
        console.log("Download id" + id + " was mine, clearing...");
        clear_downloadId(id);
        decreaseState();
      }
    }
  });
}

async function saving(obj) {
  tabid = obj.tabid;
  let url = String(obj.url).startsWith("http") ? obj.url : obj.baseurl + obj.url;
  console.log("saving :", url, obj);
  await chrome.downloads
    .download({
      url: url,
      filename: obj.filename,
      saveAs: false,
      conflictAction: "overwrite",
    })
    .then(async (downloadId) => {
      // If 'downloadId' is undefined, then there is an error
      // so making sure it is not so before proceeding.
      if (typeof downloadId !== "undefined") {
        console.log("Download initiated, ID is: " + downloadId);
        //increaseState();
        await save_downloadId(downloadId);
        //sendMessage("downloading", downloadId);
      }
    });
}

function setState(c, tabid = 0) {
  //tabid = tabid ? tabid : getCurrentTab()?.id;  , tabId: tabid
  chrome.action.setBadgeText({ text: String(c).trim() });
  setStateColor(1);
  if (waitTimerSytate1) clearTimeout(waitTimerSytate1);
  if (waitTimerSytate2) clearTimeout(waitTimerSytate2);
  waitTimerSytate1 = setTimeout(() => {
    waitTimerSytate2 = setStateColor(2);
  }, 500);
}

function setStateColor(color = 0, tabid = 0) {
  //tabid = tabid ? tabid : getCurrentTab()?.id;
  const colormodes = ["white", "red", "blue"];
  chrome.action.setBadgeBackgroundColor({
    color: colormodes[color],
  });
}

function decreaseState() {
  chrome.action.getBadgeText({}, (c) => {
    c = Number(isNaN(c) ? 0 : c) - 1;
    if (c <= 0) {
      clear_download_store();
    } else {
      setState(c);
    }
  });
}
function increaseState() {
  chrome.action.getBadgeText({}, (c) => {
    c = Number(isNaN(c) ? 0 : c) + 1;
    if (c > 30) {
      c = "";
      clear_download_store();
    }
    setState(c);
  });
}

function calcState(c) {
  c = Number(isNaN(c) ? 0 : c);
  if (c > 30 || c <= 0) {
    c = "";
  }
  setState(c);
}

function clearState(tabid = 0) {
  //tabid = tabid ? tabid : getCurrentTab()?.id;
  chrome.action.setBadgeText({ text: "", tabId: tabid });
  chrome.action.setBadgeBackgroundColor({
    color: "white",
  });
}

function sentMsg(cmd, tabid = 0) {
  tabid = tabid ? tabid : getCurrentTab()?.id;
  chrome.runtime.sendMessage({ greeting: "csa-bg", command: cmd, tabid: tabid }, function (response) {
    console.log("runtime.sentMsg response", response);
  });
}

async function getCurrentTab() {
  let queryOptions = {
    active: true,
    lastFocusedWindow: true,
  };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function save_downloadId(downloadId) {
  console.log("save_downloadId begin", downloadId);
  await chrome.storage.session
    .get({
      downloadingnow: [downloadId],
    })
    .then(async (items) => {
      console.log("save_downloadId then", items);
      //console.log("save_downloadId get", downloadId, items?.downloadingnow);
      if (items?.downloadingnow) {
        if (!items.downloadingnow.includes(downloadId)) {
          items.downloadingnow.push(downloadId);
        }
        //console.log("save_downloadId set", downloadId, items?.downloadingnow);
        await chrome.storage.session
          .set({
            downloadingnow: items.downloadingnow,
          })
          .then(() => {
            console.log("save_downloadId: ssaved items", items.downloadingnow);
            calcState(items.downloadingnow.length);
          });
      }
    });
}

function clear_download_store() {
  setState("OK");
  setTimeout(() => {
    setState("");
  }, 5000);
  chrome.storage.session.set({
    downloadingnow: [],
  });
}
function clear_downloadId(downloadId) {
  chrome.storage.session.get(
    {
      downloadingnow: [],
    },
    (items) => {
      //console.log("clear_downloadId get", downloadId, items?.downloadingnow);
      if (items?.downloadingnow.length) {
        let index = items.downloadingnow.indexOf(downloadId);
        if (index != -1) {
          items.downloadingnow.splice(index, 1);
          //console.log("clear_downloadId set", downloadId, index, items.downloadingnow);
          chrome.storage.session.set({
            downloadingnow: items.downloadingnow,
          });
        }
      }
    }
  );
}
