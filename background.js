// browser = (function () {
//   return typeof browser === "undefined" ? chrome : browser;
// })();

browserf = function () {
  let b = undefined;
  try {
    if (typeof browser !== "undefined") b = browser;
    else if (typeof chrome !== "undefined") b = chrome;
    else if (typeof edje !== "undefined") b = edje;
  } catch (error) {
    error.log("browserf", error);
  }
  return b;
};

let waitTimerSytate1 = 0;
let waitTimerSytateOK = 0;

const downloadQueue = [];
const downloadingList = [];
let isWriteInProgress = false;
let tabid = 0; //browserf().tabs.TAB_ID_NONE;
let scrolltotitle = false;

const saveObjects = {
  init: false,
  filename: "",
  video: "",
  subtitle: "",
  videotext: "",
  videotext_addon: "",
  videotext_addon_lang: "",
  subtitle_addon: "",
  subtitle_addon_lang: "",
  module: "",
  topic: "",
};

//const saveObjects = {};
const saveObjectsReq = {
  init: false,
  // video: true,
  // video_res: true,
  // videoduration: false,
  // subtitle: true,
  // videotext: true,
  // videotext_addon: true,
  // videotext_addon_lang: "en",
  // subtitle_addon: true,
  // subtitle_addon_lang: "en",
  // usesaveid: true,
};

const fileConfig = {
  init: false,
  // host_url: "coursera.org",
  // course_prefix: "",
  // module_prefix: "M",
  // title_delimeter: "_",
  // space_delimeter: "_",
  // ext_video: ".mp4",
  // ext_sub: ".vtt",
  // ext_text: ".txt",
  // lastfileid: 0,
  // lastmodule: "",
  // lasttopic: "",
  // savemode: 1,
};

const otherConfig = {
  init: false,
  // scrolltotitle: false,
  // automatic: false,
  // automatic_mode: "a_mark",
};

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

  // if (port.name !== "csa-background") {
  //   console.log("PORT MESSAGE ", port.name);
  //   return false;
  // }

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

        tabid = request?.message?.tabid;
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
      case "dosavevieo":
        console.log("dosavevieo background port from content", request.message);
        save_module();
        break;
      case "dotranslate":
        console.log("dotranslate background port from content", request.message);
        if (!tabid) {
          let tab = await getCurrentTab();
          tabid = tab.id;
        }
        browserf()
          .tabs.sendMessage(tabid, { command: "translate" })
          .then((response) => {
            if (response?.command && response.command == "translated") {
              console.log("Translated by CST");
              //ok_state(checkButton);
              //close_page();
            } else {
              console.log("Answer not from target page CST?");
              //some_error(checkButton);
            }
          })
          .catch(() => {
            console.log("Not connected target page CST");
            //some_error(checkButton);
          });
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

async function getVariable(key, defaultValue = "") {
  let item = {};
  item[key] = defaultValue;
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
  //console.log(" downloadQueueSave run  tab_onSaveDone preparing_mode:");
  tab_onSaveDone(true);
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

//stitle = "", ssavedTitle = "", isupdated = false, preparing_mode = false)
//  params = {
//    title: title,
//    savedTitle: savedTitle,
//    isupdated: isupdated,
//    preparing_mode: preparing_mode,
//    automatic: automatic,
//  };
function tab_select_current_video_implode(params) {
  let stitle = "",
    ssavedTitle = "",
    // isupdated = false,
    preparing_mode = false,
    automatic = false,
    automatic_mode = "a_cst";

  if (params) {
    console.log("tab_select_current_video_implode", params);
    stitle = params.title;
    ssavedTitle = params.savedTitle;
    // isupdated = Boolean(params.isupdated);
    preparing_mode = params.preparing_mode ? params.preparing_mode : preparing_mode;
    automatic = params.automatic ? params.automatic : automatic;
    automatic_mode = params.automatic_mode ? params.automatic_mode : automatic_mode;
  } else {
    console.log("tab_select_current_video_implode empty", params);
    return;
  }

  if (stitle == "") return;
  let title = stitle.trim();
  let savedTitle = typeof ssavedTitle == "string" ? ssavedTitle.trim() : "";
  // console.log(
  //   "tab_select_current_video_implode. stitle:",
  //   stitle,
  //   "title:",
  //   title,
  //   "savedTitle:",
  //   savedTitle,
  //   "isupdated:",
  //   isupdated,
  //   "preparing_mode",
  //   preparing_mode
  // );

  window.browser = (function () {
    return typeof window.browser === "undefined" ? window.chrome : window.browser;
  })();

  function sendMessage(command, message) {
    let port = browser.runtime.connect({ name: "csa-background" });
    port.postMessage({ command: command, message: message });
  }

  function sendMessageToCST(command, message = "") {
    // chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    //   chrome.tabs
    //     .sendMessage(tabs[0].id, { command: command, message: message })
    //     .then((response) => {
    //       if (response?.command && response.command == "translated") {
    //         console.log("translated");
    //         //ok_state(checkButton);
    //         //close_page();
    //       } else {
    //         console.log("TRanslated Answer not from target page?");
    //         //some_error(checkButton);
    //       }
    //     })
    //     .catch(() => {
    //       console.log("Not connected target page");
    //       some_error(checkButton);
    //     });
    // });
    sendMessage("dotranslate", "");

    // let port = browser.runtime.connect({ name: "cst" });
    // port.postMessage({ command: command, message: message });

    //browser.runtime.sendMessage({ command: command, message: message });
  }

  // function sendMessage(command,message) {
  //   browser.runtime.sendMessage({
  //     id: "from_content",
  //     message: message,
  //   });
  // }

  function analyseURL(type = "video") {
    const loc = new URL(window.location);
    let finding = "";
    switch (type) {
      case "video":
        finding = "/lecture/";
        break;
      case "read":
        finding = "/supplement/";
        break;
      case "quiz":
        finding = "/quiz/";
        break;
      case "test":
        finding = "/exam/";
        break;
      case "ungradedWidget":
        finding = "/ungradedWidget/";
        break;
      case "ungradedLti":
        finding = "/ungradedLti/";
        break;
      case "discussion":
        finding = "/discussionPrompt/";
        break;
      case "gradedLti":
        finding = "/gradedLti/";
        break;
    }
    //console.log(`It page analyseURL - ${finding} ${loc.pathname} : ${loc.pathname.includes(finding)}`);
    return finding ? loc.pathname.includes(finding) : false;
  }

  function isPageMarked(item) {
    let obj = item?.closest(".rc-NavSingleItemDisplay");
    let btn = obj.querySelector("div.rc-NavItemIcon > span.rc-TooltipWrapper");
    result = btn === null;
    console.log("isPageMarked", result);
    return result;
  }

  async function isReadySkipPage() {
    let cont = 15;
    while (cont > 0) {
      let btn = document.querySelectorAll("a.cds-button-disableElevation")[1];
      if (btn) {
        setTimeout(() => {
          console.log("It ready to skip this page click to ", btn);
          btn.click();
          //btn.onclick.call(btn);
        }, 2000);
        break;
      } else {
        console.log("It page a href not found :", btn, cont);
        await dcelay(1000, 1);
      }
      cont--;
    }
  }
  async function isReadySaveVideo() {
    if (!analyseURL("video")) {
      console.log("It page without of video content, skip");
      isReadySkipPage();
    } else {
      let cont = 15;
      while (cont > 0) {
        let video = document.getElementById("video_player_html5_api");
        if (video && video.readyState > 0) {
          console.log("Can save your video", video);
          sendMessage("dosavevieo", document.title);
          setTimeout(() => {
            isReadySkipPage();
          }, 5000);
          break;
        } else {
          await dcelay(1000, 1);
        }
        cont--;
      }
    }
  }

  async function isReadyVideoTranslate() {
    if (!analyseURL("video")) {
      console.log("It page without of video content");
      return;
    }
    let cont = 15;
    while (cont > 0) {
      let video = document.getElementById("video_player_html5_api");
      if (video && video.readyState > 0) {
        translateVideo();
        break;
      } else {
        await dcelay(1000, 1);
      }
      cont--;
    }
  }

  async function isReadyVideo() {
    if (!analyseURL("video")) {
      console.log("It page without of video content");
      return;
    }
    let cont = 15;
    while (cont > 0) {
      let video = document.getElementById("video_player_html5_api");
      if (video && video.readyState > 0) {
        setVideoPos(video);
        break;
      } else {
        await dcelay(1000, 1);
      }
      cont--;
    }
  }
  async function isReadyRead() {
    if (!analyseURL("read")) {
      console.log("It page without of read content");
      return;
    }
    let cont = 15;
    while (cont > 0) {
      let btn = document.querySelector('button.cds-button-disableElevation[type="submit"]');
      if (btn) {
        setTimeout(() => {
          console.log("It page click to ", btn);
          btn.click();
          setTimeout(() => {
            let btn = document.querySelector('button.cds-button-disableElevation[type="submit"]');
            console.log("It page click to next", btn);
            btn.click();
          }, 6000);
        }, 2000);
        break;
      } else {
        console.log("It page button not found :", btn, cont);
        await dcelay(1000, 1);
      }
      cont--;
    }
  }
  async function isReadyUWidget() {
    if (!analyseURL("ungradedWidget")) {
      console.log("It page without of ungradedWidget content");
      return;
    }
    let cont = 15;
    while (cont > 0) {
      // rc - WidgetCompleteButton;
      let btn = document.querySelector('button.mark-complete[type="button"]');
      if (btn) {
        setTimeout(() => {
          console.log("It page click to ", btn);
          btn.click();
          setTimeout(() => {
            let btn = document.querySelector('button.next-item[type="submit"]');
            console.log("It page click to next", btn);
            btn.click();
          }, 6000);
        }, 2000);
        break;
      } else {
        console.log("It page ungradedWidget button not found :", btn, cont);
        await dcelay(1000, 1);
      }
      cont--;
    }
  }
  async function isReadyDiscussion() {
    if (!analyseURL("discussion")) {
      console.log("It page without of discussion content");
      return;
    }
    isReadySkipPage();
  }
  async function isReadyQuiz() {
    if (!analyseURL("quiz")) {
      console.log("It page without of quiz content");
      return;
    }
    isReadySkipPage();
  }

  async function isReadyTest() {
    if (!analyseURL("test")) {
      console.log("It page without of test content");
      return;
    }
    isReadySkipPage();
  }
  async function isReadyULti() {
    if (!(analyseURL("ungradedLti") || analyseURL("gradedLti"))) {
      console.log("It page without of ULti content");
      return;
    }
    isReadySkipPage();
  }

  function translateVideo() {
    console.log("translateVideo...");
    sendMessageToCST("translate");
  }

  function setVideoPos(video, pos = 0.95) {
    if (video && video.readyState > 0) {
      let duration = video.duration;
      let position = Math.ceil(duration * pos);
      video.currentTime = position;
    }
  }

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
    searchSavedTitle(savedTitle, items);
    let searchResult = searchtitle(title, items);
    if (automatic) {
      console.log("automatic_mode", automatic_mode);
      if (automatic_mode == "a_cst") {
        isReadyVideoTranslate();
      } else if (automatic_mode == "a_save") {
        console.log("automatic_mode save");
        isReadySaveVideo();
      } else {
        if (searchResult && searchResult.pagemarked) {
          console.log("Page already marked, skip it");
          isReadySkipPage();
        } else {
          isReadyVideo();
          isReadyRead();
          isReadyQuiz();
          isReadyUWidget();
          isReadyTest();
          isReadyULti();
          isReadyDiscussion();
        }
      }
    }
  }

  function markItemSaved(item, mode = 0) {
    const colorsmodes = ["#ff00005c", "lightgreen", "#f7ff005c"];
    let obj = item?.closest(".rc-NavSingleItemDisplay")?.getElementsByClassName("rc-NavItemIcon");
    //console.log("markItemSaved", item, mode);
    if (obj.length) {
      let o = obj[0];
      let w = o.width;
      o.style.backgroundColor = colorsmodes[mode];
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

  function searchSavedTitle(stitle, items) {
    let title = stitle;
    let pagemarked = undefined;
    //const items = document.querySelectorAll("div.rc-NavItemName");
    // console.log("searchtitle, items:", title, items.length);
    if (title) {
      for (const item of items) {
        // items.forEach((item) => {
        let titles = item.innerText.split("\n");
        if (titles.length < 2) {
          titles = item.innerHTML.split("</strong>");
        }
        titles = titles.pop().trim();
        if (title && titles) {
          //console.log("item titles", title, titles);
          if (title.normalize("NFC") == titles.normalize("NFC")) {
            //console.log("item - found. title:", title, "savedTitle:", savedTitle, "preparing_mode:", preparing_mode);
            //item.scrollIntoView({ behavior: "smooth", block: "center" });
            //pagemarked = isPageMarked(item);
            if (stitle) {
              let colormode = 0;
              //if (preparing_mode) colormode = 2;
              markItemSaved(item, colormode);
              return { result: true, pagemarked: pagemarked };
            }
          }
        }
      }
    }
    return { result: false, pagemarked: pagemarked };
  }

  function searchtitle(stitle, items) {
    let title = getModouleInfo()?.topic;
    let pagemarked = undefined;
    if (title === undefined) title = stitle.trim();
    //const items = document.querySelectorAll("div.rc-NavItemName");
    // console.log("searchtitle, items:", title, items.length);
    if (title) {
      for (const item of items) {
        // items.forEach((item) => {
        let titles = item.innerText.split("\n");
        if (titles.length < 2) {
          titles = item.innerHTML.split("</strong>");
        }
        titles = titles.pop().trim();
        if (title && titles) {
          //console.log("item titles", title, titles);
          if (title.normalize("NFC") == titles.normalize("NFC")) {
            //console.log("item - found. title:", title, "savedTitle:", savedTitle, "preparing_mode:", preparing_mode);
            item.scrollIntoView({ behavior: "smooth", block: "center" });
            pagemarked = isPageMarked(item);
            if (analyseURL("video") && savedTitle) {
              let colormode = savedTitle.normalize("NFC") != title.normalize("NFC") ? 1 : 0;
              if (preparing_mode) colormode = 2;
              markItemSaved(item, colormode);
              return { result: true, pagemarked: pagemarked };
            }
          }
        }
      }
    }
    return { result: false, pagemarked: pagemarked };
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

async function tab_select_current_video(id, title, isupdated = false, preparing_mode = false) {
  if (title == "") return;
  title = String(title).split("|")[0].trim();
  let savedTitle = await getOptions("lasttopic");
  if (savedTitle) savedTitle = String(savedTitle)?.split("|")[0].trim();
  const automatic = await getVariable("automatic");
  const automatic_mode = await getOptions("automatic_mode");
  //console.log("tab_select_current_video", id, title, "preparing_mode:", preparing_mode);
  const params = {
    title: title,
    savedTitle: savedTitle,
    isupdated: isupdated,
    preparing_mode: preparing_mode,
    automatic: automatic,
    automatic_mode: automatic_mode,
  };

  browserf().scripting.executeScript({
    target: { tabId: id },
    args: [params],
    func: tab_select_current_video_implode,
  });
}

async function tab_check(tabid, preparing_mode = false) {
  if (tabid) {
    let scrolltotitle = await getOptions("scrolltotitle");
    if (scrolltotitle) {
      browserf().tabs.get(tabid, (tab) => {
        if (tab.id == tabid && tab?.status == "complete") {
          let title = tab?.title;
          //console.log("tab_checked", tabid, title, "preparing_mode:", preparing_mode);
          tab_select_current_video(tabid, title, false, preparing_mode);
        }
      });
    }
  }
}

async function tab_onSaveDone(preparing_mode = false) {
  if (!tabid) {
    tabid = await getVariable("tabid");
  }
  if (tabid) {
    //sconsole.log("tab_onSaveDone preparing_mode:", preparing_mode);
    tab_check(tabid, preparing_mode);
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

// MOVE SAVING ACTIPON  from POPUP *******************************************************************************
// TODO

function escapeRegExp(string) {
  return string.replace(/([\\\/*&:<>$#@^?!\[\]]+)/gi, "_");
}

/**
 *
 * @returns
 */
async function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  return browserf()
    .storage.sync.get({
      course: "",
      useautocourse: false,
      useshortcourse: false,
      module: "M",
      modulesep: "_",
      spacesep: "_",
      subtitle_lang: "en",
      savevideo: true,
      videores: true,
      videoduration: false,
      savevideotxt: true,
      savevideotxtadd: false,
      savesubtitle: true,
      savesubtitleadd: false,
      lastmodule: "",
      lasttopic: "",
      lastcourse: "",
      lastfileid: 0,
      usesaveid: true,
      savemode: 0,
      scrolltotitle: false,
      automatic: false,
      automatic_mode: "a_mark",
    })
    .then((items) => {
      fileConfig.course_prefix = items?.course;
      fileConfig.useautocourse = items?.useautocourse;
      fileConfig.useshortcourse = items?.useshortcourse;
      fileConfig.module_prefix = items?.module;
      if (items?.modulesep !== undefined) fileConfig.title_delimeter = escapeRegExp(items.modulesep);
      if (items?.spacesep !== undefined) fileConfig.space_delimeter = escapeRegExp(items.spacesep);
      saveObjectsReq.video = items?.savevideo;
      saveObjectsReq.videores = items?.videores;
      saveObjectsReq.videoduration = items?.videoduration;
      saveObjectsReq.subtitle = items?.savesubtitle;
      saveObjectsReq.videotext = items?.savevideotxt;
      saveObjectsReq.videotext_addon = items?.savevideotxtadd;
      saveObjectsReq.videotext_addon_lang = items?.subtitle_lang;
      saveObjectsReq.subtitle_addon = items?.savesubtitleadd;
      saveObjectsReq.subtitle_addon_lang = items?.subtitle_lang;
      saveObjectsReq.usesaveid = items?.usesaveid;
      fileConfig.lastmodule = items?.lastmodule;
      fileConfig.lasttopic = items?.lasttopic;
      fileConfig.lastfileid = items?.lastfileid;
      fileConfig.lastcourse = items?.lastcourse;
      fileConfig.savemode = items?.savemode;
      otherConfig.automatic = items?.automatic;
      otherConfig.automatic_mode = items?.automatic_mode;
      otherConfig.scrolltotitle = items?.scrolltotitle;
      console.log("RESTORED_OPT");
      fileConfig.init = true;
      otherConfig.init = true;
      saveObjectsReq.init = true;
      //init();
    });
}

async function check_Options_state() {
  if (!tabid) {
    tabid = await getVariable("tabid");
  }
  console.log("check_Options_state", tabid, saveObjects);
  if (tabid) {
    if (fileConfig == undefined || !fileConfig["init"]) {
      console.log("check_Options_state before restore_options", saveObjects, fileConfig, saveObjectsReq);
      await restore_options();
    }
  }
}

function implode_save(saveparam, fileConfig, tabid = 0) {
  //console.log("implode_save: ", saveparam);
  window.browser = (function () {
    return typeof window.browser === "undefined" ? window.chrome : window.browser;
  })();
  let port;
  function sendMessageBackground(command, message) {
    if (!(port && port.name)) port = browser.runtime.connect({ name: "csa-background" });
    port.postMessage({ command: command, message: message });
  }

  function sendMessage(m) {
    browser.runtime.sendMessage({ greeting: "csa-save", message: m });
  }
  /**
   * @param {*} saveMode: 0 - default API method , 1 - compatible BLOB method
   */
  function saveAsFile(url, filename, saveMode = 0) {
    if (saveMode == 0) {
      saveAsFileByAPIonBackground(url, filename);
    } else {
      saveAsFileByBLOBAtHere(url, filename);
    }
  }

  function saveAsFileByAPIonBackground(url, filename) {
    let loc = new URL(window.location);
    let baseurl = loc.protocol + "//" + loc.hostname;

    let obj = {
      tabid: tabid,
      url: url,
      filename: filename,
      baseurl: baseurl,
    };
    sendMessageBackground("saveFile", obj);
  }

  function saveAsFileByBLOBAtHere(url, filename) {
    console.log("implode_save :: saveAsFile", url, filename);
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 0);
      });
  }

  let savingItems = 0;
  let saveMode = fileConfig.savemode;
  if (saveparam.video) {
    savingItems++;
    saveAsFile(saveparam.video, saveparam.filename + fileConfig.ext_video, saveMode);
  }
  if (saveparam.subtitle) {
    savingItems++;
    saveAsFile(saveparam.subtitle, saveparam.filename + fileConfig.ext_sub, saveMode);
  }
  if (saveparam.videotext) {
    savingItems++;
    saveAsFile(saveparam.videotext, saveparam.filename + fileConfig.ext_text, saveMode);
  }
  if (saveparam.videotext_addon) {
    Object.keys(saveparam.videotext_addon).forEach((lang) => {
      savingItems++;
      saveAsFile(
        saveparam.videotext_addon[lang],
        saveparam.filename + fileConfig.title_delimeter + lang + fileConfig.ext_text,
        saveMode
      );
    });
  }
  if (saveparam.subtitle_addon) {
    Object.keys(saveparam.subtitle_addon).forEach((lang) => {
      savingItems++;
      saveAsFile(
        saveparam.subtitle_addon[lang],
        saveparam.filename + fileConfig.title_delimeter + lang + fileConfig.ext_sub,
        saveMode
      );
    });
  }

  if (saveMode == 0) {
    sendMessage({ state: "saving", items: savingItems, confirm: false });
    if (savingItems) {
      sendMessageBackground("dosave", savingItems);
    }
  } else {
    sendMessage({ state: "saving", items: savingItems, confirm: true });
  }
}

function save_module() {
  check_Options_state();
  if (tabid && saveObjects != undefined && saveObjects["init"]) {
    browserf().scripting.executeScript({
      target: {
        tabId: tabid,
      },
      args: [saveObjects, fileConfig, tabid],
      func: implode_save,
    });
  } else {
    console.log("for save_module not ready incoming data yet ", tabid, saveObjects);
  }
}
/**
 *
 * @param {*} saveObjectsReq
 */
function implode_getCourseInfo(saveObjectsReq) {
  window.browser = (function () {
    return typeof window.browser === "undefined" ? window.chrome : window.browser;
  })();

  function sendMessage(m) {
    browser.runtime.sendMessage({ greeting: "csa", message: m });
  }

  function searchCourseLanguage() {
    return document.querySelector("#select-language")?.selectedOptions[0]?.value;
  }

  function searchVideoDuratiom() {
    let duration;
    let video = document.getElementById("video_player_html5_api");
    if (video && video.readyState > 0) {
      duration = Math.round(video.duration / 60);
    }
    return duration;
  }

  function searchCourseID() {
    let result = { success: false };
    let ci = document.querySelector("div.m-a-0.body > a")?.getAttribute("data-click-value");
    if (ci) {
      ci = JSON.parse(ci);
      //console.log("coureinfo cs", ci, ci?.course_id);
      result.course_id = ci?.course_id;
      result.item_id = ci?.item_id;
      if (result.course_id && result.item_id) result.success = true;
    }
    return result;
  }

  function getModouleInfo() {
    let result = {};
    result.course = document
      .querySelector("div.rc-ItemNavBreadcrumbs > div > ol.breadcrumb-list  > li:nth-child(1) > a")
      ?.innerHTML.trim();
    result.module = document.querySelector("a.breadcrumb-title > span")?.innerHTML.split(" ")[1];
    result.topic = document.querySelector("span.breadcrumb-title")?.innerHTML.trim();
    result.videoduration = searchVideoDuratiom();
    return result;
  }

  function genAPIrequest(i) {
    return (
      "/api/onDemandLectureVideos.v1/" +
      i.course_id +
      "~" +
      i.item_id +
      "?includes=video&fields=onDemandVideos.v1(sources,subtitles,subtitlesVtt,subtitlesTxt)"
    );
  }

  function getLanguageCodes(sub) {
    const keys = [];
    if (sub) {
      Object.keys(sub).forEach((key) => {
        if (keys.indexOf(key) == -1) {
          keys.push(key);
        }
      });
    }
    return keys;
  }

  function parseCourseMedia(j, result) {
    let video_res = saveObjectsReq.videores ? "720p" : "540p";
    let obj = j.linked["onDemandVideos.v1"][0];
    let sub = obj.subtitlesVtt;
    let video = obj.sources.byResolution[video_res].mp4VideoUrl;
    let text = obj.subtitlesTxt;
    // console.log("parseCourseMedia video", video);
    // console.log("parseCourseMedia subtitle", lang, sub[lang]);
    // console.log("parseCourseMedia subtitle", lang_add, sub[lang_add]);
    // console.log("parseCourseMedia text", lang, text[lang]);
    // console.log("parseCourseMedia text", lang_add, text[lang_add]);
    if (saveObjectsReq.video) result.video = video;
    if (saveObjectsReq.subtitle) result.subtitle = sub[lang];
    if (saveObjectsReq.videotext) result.videotext = text[lang];

    const languages = getLanguageCodes(sub);
    if (lang_add && languages && languages.length) {
      result.languages = languages;
      result.subtitle_addon = {};
      result.videotext_addon = {};
      const languages_req = lang_add.split(",", 20);
      for (let i = 0; i < languages_req.length; i++) {
        let langi = languages_req[i].trim();
        //console.log("langi", langi);
        if (languages.includes(langi)) {
          if (saveObjectsReq.subtitle_addon) {
            result.subtitle_addon[langi] = sub[langi];
            result.subtitle_addon_lang = result.subtitle_addon_lang ? result.subtitle_addon_lang + "," + langi : langi;
          }
          if (saveObjectsReq.videotext_addon) {
            result.videotext_addon[langi] = text[langi];
            result.videotext_addon_lang = result.videotext_addon_lang
              ? result.videotext_addon_lang + "," + langi
              : langi;
          }
        }
      }
    }
    result.error = "";
    //console.log("RETURN MESSAGE", result);
    sendMessage(result);
  }

  // main code of implode
  let result = { error: "404" };
  let lang = searchCourseLanguage();
  let lang_add = saveObjectsReq.subtitle_addon_lang;
  result = getModouleInfo();
  let courseinfo = searchCourseID();
  if (courseinfo.success) {
    let URL = genAPIrequest(courseinfo);
    if (URL) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      fetch(URL, { signal: controller.signal })
        .then((response) => response.json())
        .then((json) => {
          parseCourseMedia(json, result);
        })
        .catch(() => {
          sendMessage({ error: "404" });
        });
    } else {
      sendMessage({ error: "404" });
    }
  } else {
    sendMessage({ error: "404" });
  }
  //console.log("coureinfo", courseinfo, URL);
}

/**
 *
 */
function getCourseInfo() {
  console.log("getCourseInfo start");
  waitCourseInfoID = setTimeout(() => {
    console.log("Timeout of get Course Info");
    debuglog(browser.i18n.getMessage("NOVIDEO"));
  }, 8000);
  browserf().scripting.executeScript({
    target: {
      tabId: tabid,
    },
    args: [saveObjectsReq],
    func: implode_getCourseInfo,
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
