let waitTimerSytate1 = 0;
let waitTimerSytateOK = 0;
let tabid = 0;
const downloadQueue = [];
const downloadingList = [];
let isWriteInProgress = false;

chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled background");
  downloadId_initialze();
});

/**
 * Messages long-live port
 */
chrome.runtime.onConnect.addListener((port) => {
  console.assert(port.name === "csa-background");

  // port.onDisconnect.addListener((port) => {
  //   console.assert(port.name === "csa-background");
  //   console.log("onDisconnect", port.name);
  //   console.log("onDisconnect downloadingList", downloadingList);
  // });

  port.onMessage.addListener((request) => {
    switch (request.command) {
      case "counterClear":
        downloadId_initialze();
        break;
      case "tabid":
        //stateClear();
        tabid = request.message;
        //console.log("mgs background tabid:", tabid);
        break;
      case "saveFile":
        console.log("saveFile background port", downloadQueue.length);
        //add message to Download Queue
        downloadQueue.push(request.message);
        break;
      case "dosave":
        console.log("dosave background ", downloadQueue.length);
        sendMessage({ state: "saving", items: downloadQueue.length, confirm: true });
        // setTimeout(() => {
        downloadQueueSave(request.message).then((msg) => {
          console.log("dosave background after downloadQueueSave", downloadQueue.length, msg);
          // });
        }, 0);
        break;
    }
    return false;
  });
});

/**
 * Event operations with browser download list
 */
chrome.downloads.onCreated.addListener((s) => {
  console.log("New Download created. Id:" + s.id + ", fileSize:" + s.fileSize);
});

chrome.downloads.onChanged.addListener((e) => {
  //console.log("Download state", e);
  if (typeof e.state !== "undefined") {
    if (e.state.current === "complete") {
      console.log("Download id" + e.id + " has completed.");
      downloadId_check(e.id);
    }
    if (e.state.current === "interrupted" && e.error.current === "USER_CANCELED") {
      console.log("Download id" + e.id + " has USER_CANCELED.");
      downloadId_check(e.id);
    }
  }
});

/**
 * Save all files thta prepared for save on array of Download Queue
 * @param {*} items
 * @returns items
 */
async function downloadQueueSave(items) {
  if (downloadQueue?.length != items) console.log("ALARM downloadQueueSave not have all of elements", items);
  while (downloadQueue?.length) {
    console.log("downloadQueueSave  total:", downloadQueue?.length);
    let item = downloadQueue.pop();
    await saveFile(item);
  }
  return items;
}

async function downloadId_check(id) {
  await acquireWriteLock();
  if (downloadingList.length) {
    if (downloadingList.includes(id)) {
      console.log("Download id" + id + " was mine, clearing...");
      await downloadId_clear_downloaded(id);
      stateSetValue(downloadingList.length);
    }
  }
  isWriteInProgress = false;
}

// function xdownloadId_check(id) {
//   chrome.storage.session.get({ downloadingnow: [] }, (items) => {
//     if (items.downloadingnow.length) {
//       if (items.downloadingnow.includes(id)) {
//         console.log("Download id" + id + " was mine, clearing...");
//         downloadId_clear_downloaded(id).then((m) => {
//           console.log("afetr downloadId_clear_downloaded", m);
//           stateSetValue(m);
//         });
//         //stateSetValue();
//       }
//     }
//   });
// }

async function saveFile(obj) {
  tabid = obj.tabid;
  let url = String(obj.url).startsWith("http") ? obj.url : obj.baseurl + obj.url;
  //console.log("saveFile :", url, obj);
  await chrome.downloads
    .download({
      url: url,
      filename: obj.filename,
      saveAs: false,
      conflictAction: "overwrite",
    })
    .then((downloadId) => {
      // If 'downloadId' is undefined, then there is an error
      // so making sure it is not so before proceeding.
      if (typeof downloadId !== "undefined") {
        console.log("Download initiated, ID is: " + downloadId);
        //increaseState();
        downloadId_add_download(downloadId);
        //sendMessage("downloading", downloadId);
      }
    });
}

function stateSet(c, tabid = 0) {
  if (waitTimerSytateOK) {
    clearTimeout(waitTimerSytateOK);
    waitTimerSytateOK = 0;
  }
  //tabid = tabid ? tabid : getCurrentTab()?.id;  , tabId: tabid
  chrome.action.setBadgeText({ text: String(c).trim() });
  stateSetColor(1);
  if (waitTimerSytate1) clearTimeout(waitTimerSytate1);
  waitTimerSytate1 = setTimeout(() => {
    waitTimerSytate1 = 0;
    stateSetColor(2);
  }, 500);
}

function stateSetColor(color = 0, tabid = 0) {
  //tabid = tabid ? tabid : getCurrentTab()?.id;
  const colormodes = ["white", "red", "blue"];
  chrome.action.setBadgeBackgroundColor({
    color: colormodes[color],
  });
}

function stateSetValue(c) {
  console.log("stateSetValue", c);
  c = Number(isNaN(c) ? 0 : c);
  if (c <= 0) {
    downloadId_initialze();
  } else {
    stateSet(c);
  }
}
// function increaseState() {
//   chrome.action.getBadgeText({}, (c) => {
//     c = Number(isNaN(c) ? 0 : c) + 1;
//     if (c > 30) {
//       c = "";
//       downloadId_initialze();
//     }
//     stateSet(c);
//   });
// }

function stateCalc(c) {
  console.log("stateCalc", c);
  c = Number(isNaN(c) ? 0 : c);
  if (c > 30 || c <= 0) {
    c = "";
  }
  stateSet(c);
}

function stateClear(tabid = 0) {
  //tabid = tabid ? tabid : getCurrentTab()?.id;
  chrome.action.setBadgeText({ text: "", tabId: tabid });
  chrome.action.setBadgeBackgroundColor({
    color: "white",
  });
}

function sendMessage(m) {
  chrome.runtime.sendMessage({ greeting: "csa-save", message: m });
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

// Asynchronous function to acquire the write lock
async function acquireWriteLock() {
  return new Promise((resolve) => {
    const checkLock = () => {
      if (!isWriteInProgress) {
        isWriteInProgress = true;
        resolve();
      } else {
        console.log("acquireWriteLock - locked, wait");
        setTimeout(checkLock, 10);
      }
    };
    checkLock();
  });
}

async function downloadId_add_download(downloadId) {
  console.log("downloadId_add_download begin", downloadId, downloadingList);
  await acquireWriteLock();
  //console.log("downloadId_add_download after lock", downloadId, downloadingList);
  if (downloadingList) {
    if (!downloadingList.includes(downloadId)) {
      downloadingList.push(downloadId);
      //console.log("downloadId_add_download added", downloadId, downloadingList);
      stateCalc(downloadingList.length);
    }
  }
  isWriteInProgress = false;
}

// async function downloadId_add_download(downloadId) {
//   //console.log("downloadId_add_download begin", downloadId);
//   await chrome.storage.session
//     .get({
//       downloadingnow: [downloadId],
//     })
//     .then(async (items) => {
//       //console.log("downloadId_add_download then", items);
//       //console.log("downloadId_add_download get", downloadId, items?.downloadingnow);
//       if (items?.downloadingnow) {
//         if (!items.downloadingnow.includes(downloadId)) {
//           items.downloadingnow.push(downloadId);
//         }
//         //console.log("downloadId_add_download set", downloadId, items?.downloadingnow);
//         await chrome.storage.session
//           .set({
//             downloadingnow: items.downloadingnow,
//           })
//           .then(() => {
//             console.log("downloadId_add_download: ssaved items", items.downloadingnow);
//             stateCalc(items.downloadingnow.length);
//           });
//       }
//     });
// }

async function downloadId_initialze() {
  stateSet("OK");
  waitTimerSytateOK = setTimeout(() => {
    waitTimerSytateOK = 0;
    stateSet("");
  }, 5000);
  //await acquireWriteLock();
  //downloadingList.splice(0, downloadingList.length);
  //isWriteInProgress = false;
  // chrome.storage.session.set({
  //   downloadingnow: [],
  // });
}

async function downloadId_clear_downloaded(downloadId) {
  console.log("downloadId_clear_downloaded get", downloadId, downloadingList);
  return new Promise((resolve) => {
    if (downloadingList.length) {
      let index = downloadingList.indexOf(downloadId);
      if (index != -1) {
        downloadingList.splice(index, 1);
        console.log("downloadId_clear_downloaded set", downloadId, index, downloadingList);
      }
    }
    resolve();
  });
}

// async function downloadId_clear_downloaded(downloadId) {
//   return chrome.storage.session
//     .get({
//       downloadingnow: [],
//     })
//     .then((items) => {
//       console.log("downloadId_clear_downloaded get", downloadId, items?.downloadingnow);
//       if (items?.downloadingnow.length) {
//         let index = items.downloadingnow.indexOf(downloadId);
//         if (index != -1) {
//           items.downloadingnow.splice(index, 1);
//           console.log("downloadId_clear_downloaded set", downloadId, index, items.downloadingnow);
//           return chrome.storage.session
//             .set({
//               downloadingnow: items.downloadingnow,
//             })
//             .then(() => {
//               return items?.downloadingnow.length;
//             });
//         }
//       }
//     });
// }
