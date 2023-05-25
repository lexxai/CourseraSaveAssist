// browser = (function () {
//   return typeof browser === "undefined" ? chrome : browser;
// })();

browserf = function () {
  return typeof browser === "undefined" ? chrome : browser;
};

let waitTimerSytate1 = 0;
let waitTimerSytateOK = 0;

const downloadQueue = [];
const downloadingList = [];
let isWriteInProgress = false;
let tabid = 0; //browserf().tabs.TAB_ID_NONE;
let scrolltotitle = false;

browserf().runtime.onInstalled.addListener(() => {
  console.log("onInstalled background");
  saveVariable("tabid", tabid);
  downloadId_initialze();
});

browserf().tabs.onUpdated.addListener(tab_onUpdated);

/**
 * Messages long-live port
 */
browserf().runtime.onConnect.addListener((port) => {
  console.assert(port.name === "csa-background");

  // port.onDisconnect.addListener((port) => {
  //   console.assert(port.name === "csa-background");
  //   console.log("onDisconnect", port.name);
  //   console.log("onDisconnect downloadingList", downloadingList);
  // });

  port.onMessage.addListener(async (request) => {
    switch (request.command) {
      case "counterClear":
        downloadId_initialze();
        break;
      case "tabid":
        //stateClear();

        tabid = request.message?.tabid;
        //scrolltotitle = request.message?.scrolltotitle;
        console.log("tabid message  :", request.message, tabid);
        tab_check(tabid);
        saveVariable("tabid", tabid);
        // saveVariable("scrolltotitle", scrolltotitle);
        console.log("after saveVariable tabid:");
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
browserf().downloads.onCreated.addListener((s) => {
  console.log("New Download created. Id:" + s.id + ", fileSize:" + s.fileSize);
});

browserf().downloads.onChanged.addListener((e) => {
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

async function saveVariable(key, value) {
  let item = {};
  item[key] = value;
  return browserf()
    .storage.local.set(item)
    .then(() => {
      console.log("saveSession: saved item", key, value, item);
    });
}

async function getOptions(key) {
  let item = {};
  item[key] = "";
  return browserf()
    .storage.sync.get(item)
    .then((item) => {
      console.log("getOptions: item", key, item[key]);
      return item[key];
    });
}

async function getVariable(key) {
  let item = {};
  item[key] = "";
  return browserf()
    .storage.local.get(item)
    .then((item) => {
      console.log("getVariable: item", key, item[key]);
      return item[key];
    });
}

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
//   browserf().storage.session.get({ downloadingnow: [] }, (items) => {
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
  await browserf()
    .downloads.download({
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
  stateSetText(c);
  stateSetColor(1);
  if (waitTimerSytate1) clearTimeout(waitTimerSytate1);
  waitTimerSytate1 = setTimeout(() => {
    waitTimerSytate1 = 0;
    stateSetColor(2);
  }, 500);
}

function stateSetText(c) {
  browserf().action.setBadgeText({ text: String(c).trim() });
}

function stateSetColor(color = 0, tabid = 0) {
  //tabid = tabid ? tabid : getCurrentTab()?.id;
  const colormodes = ["white", "red", "blue"];
  browserf().action.setBadgeBackgroundColor({
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
//   browserf().action.getBadgeText({}, (c) => {
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
  browserf().action.setBadgeText({ text: "", tabId: tabid });
  browserf().action.setBadgeBackgroundColor({
    color: "white",
  });
}

function sendMessage(m) {
  browserf().runtime.sendMessage({ greeting: "csa-save", message: m });
}

async function getCurrentTab() {
  let queryOptions = {
    active: true,
    lastFocusedWindow: true,
  };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await browserf().tabs.query(queryOptions);
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
//   await browserf().storage.session
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
//         await browserf().storage.session
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

function tab_select_current_video_implode(stitle = "", ssavedTitle = "", isupdated = false) {
  if (stitle == "") return;
  let title = stitle.trim();
  let savedTitle = typeof ssavedTitle == "string" ? ssavedTitle.trim() : "";
  console.log(
    "tab_select_current_video_implode. stitle:",
    stitle,
    "title:",
    title,
    "savedTitle:",
    savedTitle,
    "isupdated:",
    isupdated
  );

  function getModouleInfo() {
    let result = {};
    //result.module = document.querySelector("a.breadcrumb-title > span")?.innerHTML.split(" ")[1];
    result.topic = document.querySelector("span.breadcrumb-title")?.innerHTML.trim();
    if (result.topic === undefined) {
      result.topic = document.title.split("|")[0].trim();
    }
    return result;
  }

  function dcelay(t, val) {
    return new Promise((resolve) => setTimeout(resolve, t, val));
  }

  async function isReady(title) {
    let cont = 25;
    while (cont > 0) {
      const items = document.querySelectorAll("div.rc-NavItemName");
      if (items && items.length) {
        break;
      } else {
        console.log("not found,sleep", cont);
        await dcelay(1000, 1);
        //console.log("not found,after sleep", cont);
      }
      cont--;
    }
    const items = document.querySelectorAll("div.rc-NavItemName");
    searchtitle(title, items);
  }

  function markItemSaved(item, mode = 0) {
    let obj = item?.closest(".rc-NavSingleItemDisplay")?.getElementsByClassName("rc-NavItemIcon");
    //console.log("markItemSaved", item, mode);
    if (obj.length) {
      let o = obj[0];
      let w = o.width;
      o.style.backgroundColor = mode ? "lightgreen" : "#ff00005c";
      o.style.borderRadius = "30px";
      o.style.paddingLeft = "4px";
      o.style.margin = "0";
      o.style.marginRight = "4px";
      o.style.paddingTop = "4px";
      if (w) {
        o.style.width = w - 4 + "px";
      } else {
        o.style.width = "28px";
      }
      //console.log("markItemSaved style", item, o.style);
    }
  }

  function searchtitle(stitle, items) {
    let title = getModouleInfo()?.topic;
    if (title === undefined) title = stitle.trim();
    //const items = document.querySelectorAll("div.rc-NavItemName");
    // console.log("searchtitle, items:", title, items.length);
    if (title) {
      items.forEach((item) => {
        let titles = item.innerText.split("\n");
        if (titles.length < 2) {
          titles = item.innerHTML.split("</strong>");
        }
        titles = titles.pop().trim();
        if (title && titles) {
          //console.log("item titles", title, titles);
          if (title.normalize("NFC") == titles.normalize("NFC")) {
            console.log("item - found. title:", title, "savedTitle:", savedTitle);
            item.scrollIntoView({ behavior: "smooth", block: "center" });
            if (true && savedTitle) {
              let isNew = savedTitle.normalize("NFC") != title.normalize("NFC");
              markItemSaved(item, isNew);
            }
            return true;
          }
        }
      });
    }
  }

  if (document.readyState === "loading") {
    console.log("Loading hasn't finished yet");
    document.addEventListener("DOMContentLoaded", (event) => {
      console.log("DOMContentLoaded run searchtitle");
      isReady(title);
    });
  } else {
    console.log("DOMContentLoaded has already fired,run searchtitle");
    isReady(title);
  }

  // if (isupdated) {
  //   document.addEventListener("DOMContentLoaded", searchtitle);
  // } else {
  //   searchtitle();
  // }
}

async function tab_select_current_video(id, title, isupdated = false) {
  if (title == "") return;
  title = String(title).split("|")[0].trim();
  let savedTitle = await getOptions("lasttopic");
  if (savedTitle) savedTitle = String(savedTitle)?.split("|")[0].trim();
  console.log("tab_select_current_video", id, title);

  browserf().scripting.executeScript({
    target: { tabId: id },
    args: [title, savedTitle, isupdated],
    func: tab_select_current_video_implode,
  });
}

async function tab_check(tabid) {
  if (tabid) {
    let scrolltotitle = await getOptions("scrolltotitle");
    if (scrolltotitle) {
      browserf().tabs.get(tabid, (tab) => {
        if (tab.id == tabid && tab?.status == "complete") {
          let title = tab?.title;
          console.log("tab_checked", tabid, title);
          tab_select_current_video(tabid, title);
        }
      });
    }
  }
}

async function tab_onSaveDone() {
  if (!tabid) {
    tabid = await getVariable("tabid");
  }
  if (tabid) {
    tab_check(tabid);
  }
}

async function tab_onUpdated(id, changeInfo, tab) {
  //console.log("tab_onUpdated init", id, tabid, tab?.title, changeInfo?.status);

  //console.log("tab_onUpdated init get memory", id, tabid, tab?.title, changeInfo?.status);
  if (changeInfo?.status == "complete") {
    if (!tabid) {
      tabid = await getVariable("tabid");
    }
    if (id == tabid) {
      // console.log("tab_onUpdated", id, tab?.title, scrolltotitle);
      scrolltotitle = await getOptions("scrolltotitle");
      console.log("tab_onUpdated afrer read scrolltotitle", scrolltotitle);
      if (scrolltotitle) {
        tab_select_current_video(id, tab?.title, true);
      } else {
        console.log("tab_onUpdated but scrolltotitle:", scrolltotitle);
      }
    }
  }
}

function downloadId_initialze() {
  waitTimerSytateOK = setTimeout(() => {
    stateSet("OK");
    waitTimerSytateOK = setTimeout(() => {
      waitTimerSytateOK = 0;
      stateSet("");
      tab_onSaveDone();
    }, 5000);
  }, 1000);

  stateSetText("");

  //await acquireWriteLock();
  //downloadingList.splice(0, downloadingList.length);
  //isWriteInProgress = false;
  // browserf().storage.session.set({
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
//   return browserf().storage.session
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
//           return browserf().storage.session
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
