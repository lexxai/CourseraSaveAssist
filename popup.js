let tabid = 0;
let taburl = "";
let waitCourseInfoID = 0;

const saveObjects = {
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

const saveObjectsReq = {
  video: true,
  video_res: true,
  subtitle: true,
  videotext: true,
  videotext_addon: true,
  videotext_addon_lang: "en",
  subtitle_addon: true,
  subtitle_addon_lang: "en",
  usesaveid: true,
};

const fileConfig = {
  host_url: "coursera.org",
  course_prefix: "",
  module_prefix: "M",
  title_delimeter: "_",
  space_delimeter: "_",
  ext_video: ".mp4",
  ext_sub: ".vtt",
  ext_text: ".txt",
  lastfileid: 0,
  lastmodule: "",
  lasttopic: "",
};

//Functions....
function init() {
  localization();
  Initialize();
  addListeners();
}

function sendMessageBackground(command, message) {
  let port = chrome.runtime.connect({ name: "csa-background" });
  port.postMessage({ command: command, message: message });
  // port.onMessage.addListener(function (msg) {
  //   console.log("port.onMessage", msg);
  // });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // console.log(
  //   sender.tab
  //     ? "from a content script:" + sender.tab.url
  //     : "from the extension"
  // );
  //console.log("POP MESSAGE:", request, sender);
  if (taburl != sender.tab.url) {
    console.log("message not for me, skip");
    return true;
  }
  switch (request.greeting) {
    case "csa":
      //sendResponse({ ret: "OK" });
      clearWait(waitCourseInfoID);
      console.log("getCourseInfo recieved");
      if (request.message.error) {
        debuglog(chrome.i18n.getMessage("NOVIDEO"));
        return true;
      }
      videoAction.removeAttribute("hidden");
      debuglog("");
      const htitle = document.getElementById("htitle");
      if (htitle) {
        const avl = chrome.i18n.getMessage("AVLANGUAGES");
        htitle.setAttribute("title", avl + " " + request.message.languages);
      }

      let module = request.message.module;
      let topic = request.message.topic;

      if (fileConfig.lasttopic != topic) {
        saveObjects.topic = topic;
        saveObjects.fileid = Number(fileConfig.lastfileid) + 1;
      } else {
        saveObjects.topic = fileConfig.lasttopic;
        saveObjects.fileid = fileConfig.lastfileid;
      }
      if (fileConfig.lastmodule != module) {
        saveObjects.module = module;
        saveObjects.fileid = 1;
      } else {
        saveObjects.module = fileConfig.lastmodule;
      }

      topic = topic.replace(/([,. ]+)/gi, fileConfig.space_delimeter);
      topic = topic.replace(/([\\\/"'*&:<>$#@^?!\[\]]+)/gi, "");
      saveObjects.video = request.message.video;
      if (request.message.subtitle) saveObjects.subtitle = request.message.subtitle;
      if (request.message.videotext) saveObjects.videotext = request.message.videotext;
      saveObjects.filename = fileConfig.course_prefix + fileConfig.module_prefix + String(module).padStart(2, "0");
      if (saveObjectsReq.usesaveid)
        saveObjects.filename += fileConfig.title_delimeter + String(saveObjects.fileid).padStart(2, "0");
      saveObjects.filename += fileConfig.title_delimeter + topic;
      //debuglog("READY to SAVE: " + subtitle);
      if (request.message.videotext_addon) saveObjects.videotext_addon = request.message.videotext_addon;
      if (request.message.videotext_addon_lang) saveObjects.videotext_addon_lang = request.message.videotext_addon_lang;
      if (request.message.subtitle_addon) saveObjects.subtitle_addon = request.message.subtitle_addon;
      if (request.message.subtitle_addon_lang) saveObjects.subtitle_addon_lang = request.message.subtitle_addon_lang;
      console.log("module: ", saveObjects.filename);
      setTimeout(() => {
        const videoAction = document.getElementById("videoAction");
        if (videoAction) {
          videoAction.setAttribute("title", "File: " + saveObjects.filename);
        }
      }, 100);
      break;
    case "csa-save":
      debuglog("");
      if (request.message.state === "saving") {
        fileConfig.lastmodule = saveObjects.module;
        fileConfig.lasttopic = saveObjects.topic;
        fileConfig.lastfileid = saveObjects.fileid;
        save_options();
        sendMessageBackground("setFilesCount", request.message.items);
        debuglog(chrome.i18n.getMessage("SAVINGFILES") + " " + request.message.items);
        setTimeout(() => {
          window.close();
        }, 750);
      }
      break;
  }
  return true;
});

function localization() {
  const hname = document.getElementById("hname");
  if (hname) hname.innerHTML = chrome.i18n.getMessage("plug_name");

  // Initialize button with user's preferred color
  const videoAction = document.getElementById("videoAction");
  const subtitleAction = document.getElementById("subtitleAction");
  const textAction = document.getElementById("textAction");
  const options = document.getElementById("options");
  const htitle = document.getElementById("htitle");

  const bImg = document.getElementById("bImg");

  document.getElementsByTagName("body")[0]?.setAttribute("data-darkmode", isDarkTheme());

  if (videoAction) {
    let cnt = 0;
    videoAction.innerHTML = chrome.i18n.getMessage("videoAction");
    if (saveObjectsReq.video) {
      videoAction.innerHTML += (cnt++ ? ", " : " ") + chrome.i18n.getMessage("VIDEO");
    }
    if (saveObjectsReq.subtitle) {
      videoAction.innerHTML += (cnt++ ? ", " : " ") + chrome.i18n.getMessage("SUBTILE");
    }
    if (saveObjectsReq.videotext) {
      videoAction.innerHTML += (cnt++ ? ", " : " ") + chrome.i18n.getMessage("VIDEOTEXT");
    }
    if (saveObjectsReq.subtitle_addon) {
      videoAction.innerHTML +=
        (cnt++ ? ", " : " ") + chrome.i18n.getMessage("SUBTILE") + ":" + saveObjectsReq.subtitle_addon_lang;
    }
    if (saveObjectsReq.videotext_addon) {
      videoAction.innerHTML +=
        (cnt++ ? ", " : " ") + chrome.i18n.getMessage("VIDEOTEXT") + ":" + saveObjectsReq.videotext_addon_lang;
    }

    videoAction.setAttribute("hidden", "");
  }
  if (subtitleAction) subtitleAction.innerHTML = chrome.i18n.getMessage("subtitleAction");
  if (textAction) textAction.innerHTML = chrome.i18n.getMessage("textAction");

  if (options) {
    options.setAttribute("title", chrome.i18n.getMessage("OPTIONS"));
    options.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
      //window.open("options.html", "options");
    });
  }

  if (bImg) bImg.src = "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/images/button-ico-128.png";
}

function debuglog(text) {
  const pdebug = document.getElementById("pdebug");
  if (pdebug) {
    pdebug.innerHTML = text;
    if (text) pdebug.removeAttribute("hidden");
    else pdebug.setAttribute("hidden", "");

    // pdebug.style.display = text ? "block" : "none";
  }
}

async function Initialize() {
  render_previos_item_name();
  let tab = await getCurrentTab();
  tabid = tab.id;
  taburl = tab.url;
  console.log("tabid: ", tabid);
  console.log("tab title: ", tab.title);
  if (htitle && tabid && tab.title != undefined) htitle.innerHTML = tab.title;
  console.log("tab taburl: ", taburl);
  let ownersite = "";
  try {
    ownersite = new URL(taburl).hostname;
  } catch (e) {}
  if (ownersite.indexOf(fileConfig.host_url) !== -1) {
    debuglog(chrome.i18n.getMessage("SEARCHVIDEO"));
    getCourseInfo();
    //search_module();
  } else {
    debuglog(chrome.i18n.getMessage("WRONGSITE") + " " + fileConfig.host_url);
  }
  sendMessageBackground("tabid", tabid);
}

function implode_search(saveObjectsReq) {
  function pressButton() {
    let butt = document.querySelector("#downloads-dropdown-btn");
    if (butt) butt.click();
  }

  function sendMessage(m) {
    chrome.runtime.sendMessage({ greeting: "csa", message: m });
  }

  function searchInVideo(langreq) {
    let result = {};
    // result.module = document
    //   .querySelector("a.breadcrumb-title > span")
    //   .innerHTML.split(" ")[1];
    // result.topic = document
    //   .querySelector("span.breadcrumb-title")
    //   .innerHTML.trim();
    // result.video = document.querySelector(
    //   'video.vjs-tech source[type="video/mp4"]'
    // ).src;
    // let lang = document.querySelector("div.vjs-react").getAttribute("lang");
    let lang = "en";
    if (langreq) lang = langreq;
    result.lang = lang;
    result.subtitle = document.querySelector('video.vjs-tech track[srclang="' + lang + '"]')?.src;

    // console.log("result.module", result.module);
    // console.log("result.topic", result.topic);
    // console.log("result.video", result.video);
    // console.log("result.subtitle lang:", lang, result.subtitle);
    return result;
  }

  function searchInMenu(saveObjectsReq) {
    let result = {};
    result.module = document.querySelector("a.breadcrumb-title > span").innerHTML.split(" ")[1];
    result.topic = document.querySelector("span.breadcrumb-title")?.innerHTML.trim();
    if (saveObjectsReq.video) {
      result.video = document
        .querySelector("div.rc-DownloadsDropdown.bt3-dropdown.bt3-open > ul > li:nth-last-child(3) > a")
        ?.getAttribute("data-track-href");
    }
    if (saveObjectsReq.subtitle) {
      result.subtitle = document
        .querySelector("div.rc-DownloadsDropdown.bt3-dropdown.bt3-open > ul > li:nth-last-child(2) > a")
        ?.getAttribute("data-track-href");
    }
    if (saveObjectsReq.videotext) {
      result.videotext = document
        .querySelector("div.rc-DownloadsDropdown.bt3-dropdown.bt3-open > ul > li:nth-last-child(1) > a")
        ?.getAttribute("data-track-href");
    }
    if (saveObjectsReq.subtitle_addon) {
      let inVideo = searchInVideo(saveObjectsReq.subtitle_addon_lang);
      result.subtitle_addon = inVideo?.subtitle;
      result.subtitle_addon_lang = inVideo?.lang;
    }
    //console.log("search result:", result);
    sendMessage(result);
  }

  let opened = document.querySelector("div.rc-DownloadsDropdown.bt3-dropdown.bt3-open");

  let maxtry = 10;
  if (!opened) {
    pressButton();
    const interval = setInterval(() => {
      let opened = document.querySelector("div.rc-DownloadsDropdown.bt3-dropdown.bt3-open");
      if (opened) {
        clearInterval(interval);
        console.log("opened menu");
        searchInMenu(saveObjectsReq);
      }
      if (maxtry-- < 0) {
        clearInterval(interval);
        sendMessage({ error: "404" });
        console.log("error: 404");
      }
    }, 100);
  } else {
    console.log("already opened menu");
    searchInMenu(saveObjectsReq);
  }
}

function search_module() {
  chrome.scripting.executeScript({
    target: {
      tabId: tabid,
    },
    args: [saveObjectsReq],
    func: implode_search,
  });
}

function implode_save(saveparam, fileConfig, tabid = 0) {
  //console.log("implode_save: ", saveparam);
  const browser = chrome;
  let port;
  function sendMessageBackground(command, message) {
    if (!(port && port.name)) port = chrome.runtime.connect({ name: "csa-background" });
    port.postMessage({ command: command, message: message });
  }

  function sendMessage(m) {
    chrome.runtime.sendMessage({ greeting: "csa-save", message: m });
  }

  function saveAsFile(url, filename, savingItems = 1) {
    let loc = new URL(window.location);
    let baseurl = loc.protocol + "//" + loc.hostname;

    let obj = {
      tabid: tabid,
      url: url,
      filename: filename,
      baseurl: baseurl,
    };
    sendMessageBackground("saving", obj);
  }

  // function xsaveAsFile(url, filename) {
  //   console.log("implode_save :: saveAsFile", url, filename);
  //   fetch(url)
  //     .then((response) => response.blob())
  //     .then((blob) => {
  //       const url = window.URL.createObjectURL(blob);
  //       const a = document.createElement("a");
  //       a.href = url;
  //       a.download = filename;
  //       document.body.appendChild(a);
  //       a.click();
  //       setTimeout(() => {
  //         document.body.removeChild(a);
  //         window.URL.revokeObjectURL(url);
  //       }, 0);
  //     });
  // }

  let savingItems = 0;
  if (saveparam.video) {
    savingItems++;
    saveAsFile(saveparam.video, saveparam.filename + fileConfig.ext_video, savingItems);
  }
  if (saveparam.subtitle) {
    savingItems++;
    saveAsFile(saveparam.subtitle, saveparam.filename + fileConfig.ext_sub, savingItems);
  }
  if (saveparam.videotext) {
    savingItems++;
    saveAsFile(saveparam.videotext, saveparam.filename + fileConfig.ext_text, savingItems);
  }
  if (saveparam.videotext_addon) {
    Object.keys(saveparam.videotext_addon).forEach((lang) => {
      savingItems++;
      saveAsFile(
        saveparam.videotext_addon[lang],
        saveparam.filename + fileConfig.title_delimeter + lang + fileConfig.ext_text,
        savingItems
      );
    });
  }
  if (saveparam.subtitle_addon) {
    Object.keys(saveparam.subtitle_addon).forEach((lang) => {
      savingItems++;
      saveAsFile(
        saveparam.subtitle_addon[lang],
        saveparam.filename + fileConfig.title_delimeter + lang + fileConfig.ext_sub,
        savingItems
      );
    });
  }
  if (savingItems) sendMessageBackground("dosave", savingItems);
  sendMessage({ state: "saving", items: savingItems });
}

function save_module() {
  chrome.scripting.executeScript({
    target: {
      tabId: tabid,
    },
    args: [saveObjects, fileConfig, tabid],
    func: implode_save,
  });
}

function addListeners() {
  // When the button is clicked, inject startAction into current page
  videoAction?.addEventListener("click", () => {
    //console.log("addEventListener by videoAction tabid:" + tabid);
    save_module();
    videoAction.setAttribute("hidden", "");
    debuglog(chrome.i18n.getMessage("SAVING"));
  });
}

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function escapeRegExp(string) {
  return string.replace(/([\\\/*&:<>$#@^?!\[\]]+)/gi, "_");
}

function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync
    .get({
      course: "",
      module: "module-",
      modulesep: "_",
      spacesep: "_",
      subtitle_lang: "en",
      savevideo: true,
      videores: true,
      savevideotxt: true,
      savevideotxtadd: true,
      savesubtitle: true,
      savesubtitleadd: true,
      lastmodule: "",
      lasttopic: "",
      lastfileid: 0,
      usesaveid: true,
    })
    .then((items) => {
      fileConfig.course_prefix = items?.course;
      fileConfig.module_prefix = items?.module;
      if (items?.modulesep !== undefined) fileConfig.title_delimeter = escapeRegExp(items.modulesep);
      if (items?.spacesep !== undefined) fileConfig.space_delimeter = escapeRegExp(items.spacesep);
      saveObjectsReq.video = items?.savevideo;
      saveObjectsReq.videores = items?.videores;
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
      console.log("RESTORE_OPT", saveObjectsReq, fileConfig);
      init();
    });
}

async function save_options() {
  await chrome.storage.sync
    .set({
      lastmodule: fileConfig.lastmodule,
      lasttopic: fileConfig.lasttopic,
      lastfileid: fileConfig.lastfileid,
    })
    .then(() => {});
}

function implode_getCourseInfo(saveObjectsReq) {
  const browser = chrome;
  function sendMessage(m) {
    chrome.runtime.sendMessage({ greeting: "csa", message: m });
  }

  function searchCourseLanguage() {
    return document.querySelector("#select-language")?.selectedOptions[0]?.value;
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
    result.module = document.querySelector("a.breadcrumb-title > span")?.innerHTML.split(" ")[1];
    result.topic = document.querySelector("span.breadcrumb-title")?.innerHTML.trim();
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

  function parseCourseMedia(j) {
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
          parseCourseMedia(json);
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

function getCourseInfo() {
  console.log("getCourseInfo start");
  waitCourseInfoID = setTimeout(() => {
    console.log("Timeout of get Course Info");
    debuglog(chrome.i18n.getMessage("NOVIDEO"));
  }, 8000);
  chrome.scripting.executeScript({
    target: {
      tabId: tabid,
    },
    args: [saveObjectsReq],
    func: implode_getCourseInfo,
  });
}

function isDarkTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")?.matches;
}

function clearWait(e) {
  if (e) clearTimeout(e);
}

function render_previos_item_name() {
  //console.log("render_previos_item_name");
  let last_saved_file = fileConfig.course_prefix;
  last_saved_file += fileConfig.module_prefix;
  last_saved_file += String(fileConfig.lastmodule).padStart(2, "0");
  if (saveObjectsReq.usesaveid) {
    last_saved_file += fileConfig.title_delimeter;
    last_saved_file += String(fileConfig.lastfileid).padStart(2, "0");
  }
  last_saved_file += fileConfig.title_delimeter;
  last_saved_file += fileConfig.lasttopic;
  if (last_saved_file) {
    last_saved_file = browser.i18n.getMessage("PREVIOSFILE") + ": " + last_saved_file;
    document.getElementById("hname")?.setAttribute("title", last_saved_file);
  }
}

// functions end

const browser = chrome;
document.addEventListener("DOMContentLoaded", restore_options);
