let tabid = 0;
let taburl = "";
let waitCourseInfoID = 0;
let waitSavingStartID = 0;

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
  course: "",
};

const saveObjectsReq = {
  video: true,
  video_res: true,
  videoduration: false,
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
  lastcourse: "",
  savemode: 1,
  useautocourse: false,
  useshortcourse: false,
};

const otherConfig = {
  scrolltotitle: false,
  automatic: false,
  automatic_mode: "a_mark",
};

//Functions....

window.browser = (function () {
  return typeof window.browser === "undefined" ? window.chrome : window.browser;
})();

function init() {
  localization();
  Initialize();
  addListeners();
}

function sendMessageBackground(command, message) {
  let port = browser.runtime.connect({ name: "csa-background" });
  port.postMessage({ command: command, message: message });
  // port.onMessage.addListener(function (msg) {
  //   console.log("port.onMessage", msg);
  // });
}

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // console.log(
  //   sender.tab
  //     ? "from a content script:" + sender.tab.url
  //     : "from the extension"
  // );
  //console.log("POP MESSAGE:", request, sender);
  if (sender.tab && taburl != sender.tab?.url) {
    console.log("message not for me, skip");
    return true;
  }
  switch (request?.greeting) {
    case "csa":
      //sendResponse({ ret: "OK" });
      clearWait(waitCourseInfoID);
      console.log("getCourseInfo recieved");
      if (request.message.error) {
        debuglog(browser.i18n.getMessage("NOVIDEO"));
        return true;
      }
      videoAction.removeAttribute("hidden");
      debuglog("");
      const htitle = document.getElementById("htitle");
      if (htitle) {
        const avl = browser.i18n.getMessage("AVLANGUAGES");
        const title = htitle.getAttribute("title");
        htitle.setAttribute("title", (title ? title : "") + avl + " " + request.message.languages);
      }

      let module = request.message.module;
      let topic = request.message.topic;
      let course = request.message.course;

      if (fileConfig.lastcourse != course) {
        saveObjects.course = course;
      } else {
        saveObjects.course = fileConfig.lastcourse;
      }

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

      if (fileConfig.useautocourse && fileConfig.useshortcourse) {
        let course_ar = course.split(" ");
        course = "";
        for (const word of course_ar) {
          //course += course.length ? fileConfig.title_delimeter : "";
          course += word.charAt(0).toUpperCase() + word.substring(1, 5);
        }
      }

      if (fileConfig.useautocourse) {
        course = course.replace(/([,. ]+)/gi, fileConfig.space_delimeter);
        course = course.replace(/([\\\/"'*&:<>$#@^?!\[\]]+)/gi, "");
      }

      saveObjects.video = request.message.video;
      if (request.message.subtitle) saveObjects.subtitle = request.message.subtitle;
      if (request.message.videotext) saveObjects.videotext = request.message.videotext;

      saveObjects.filename = fileConfig.course_prefix;

      if (fileConfig.useautocourse && course?.length) saveObjects.filename += course;

      saveObjects.filename +=
        (saveObjects.filename.length ? fileConfig.title_delimeter : "") +
        fileConfig.module_prefix +
        String(module).padStart(2, "0");

      if (saveObjectsReq.usesaveid)
        saveObjects.filename += fileConfig.title_delimeter + String(saveObjects.fileid).padStart(2, "0");
      saveObjects.filename += fileConfig.title_delimeter + topic;
      if (saveObjectsReq.videoduration && request.message?.videoduration)
        saveObjects.filename +=
          fileConfig.title_delimeter + String(request.message?.videoduration).padStart(2, "0") + "min";
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
      if (request?.message.state === "saving") {
        if (request?.message == 0) {
          debuglog("SAVING ERROR: Zero files have been downloaded");
          setTimeout(() => {
            window.close();
          }, 20000);
          break;
        }
        debuglog("");
        console.log("saving messaga", request?.message);
        if (request?.message.confirm) {
          // withconfirmation
          fileConfig.lastmodule = saveObjects.module;
          fileConfig.lasttopic = saveObjects.topic;
          fileConfig.lastfileid = saveObjects.fileid;
          fileConfig.lastcourse = saveObjects.course;
          save_options();
          debuglog(browser.i18n.getMessage("SAVINGFILES") + " " + request.message.items);
          if (waitSavingStartID) {
            clearTimeout(waitSavingStartID);
            waitSavingStartID = 0;
          }
          setTimeout(() => {
            window.close();
          }, 750);
        } else {
          // without confirmation still
          debuglog(browser.i18n.getMessage("SAVINGFILES") + " " + request.message.items);
          waitSavingStartID = setTimeout(() => {
            debuglog("SAVING TIMEOUT ERROR");
            setTimeout(() => {
              window.close();
            }, 30000);
          }, 10000);
        }
      }
      break;
  }
  return false;
});

function localization() {
  const hname = document.getElementById("hname");
  if (hname) hname.innerHTML = browser.i18n.getMessage("plug_name");

  // Initialize button with user's preferred color
  const videoAction = document.getElementById("videoAction");
  const subtitleAction = document.getElementById("subtitleAction");
  const textAction = document.getElementById("textAction");
  const options = document.getElementById("options");
  // const htitle = document.getElementById("htitle");

  document.getElementsByTagName("body")[0]?.setAttribute("data-darkmode", isDarkTheme());

  if (videoAction) {
    let cnt = 0;
    videoAction.innerHTML = browser.i18n.getMessage("videoAction");
    if (saveObjectsReq.video) {
      videoAction.innerHTML += (cnt++ ? ", " : " ") + browser.i18n.getMessage("VIDEO");
    }
    if (saveObjectsReq.subtitle) {
      videoAction.innerHTML += (cnt++ ? ", " : " ") + browser.i18n.getMessage("SUBTILE");
    }
    if (saveObjectsReq.videotext) {
      videoAction.innerHTML += (cnt++ ? ", " : " ") + browser.i18n.getMessage("VIDEOTEXT");
    }
    if (saveObjectsReq.subtitle_addon) {
      videoAction.innerHTML +=
        (cnt++ ? ", " : " ") + browser.i18n.getMessage("SUBTILE") + ":" + saveObjectsReq.subtitle_addon_lang;
    }
    if (saveObjectsReq.videotext_addon) {
      videoAction.innerHTML +=
        (cnt++ ? ", " : " ") + browser.i18n.getMessage("VIDEOTEXT") + ":" + saveObjectsReq.videotext_addon_lang;
    }

    videoAction.setAttribute("hidden", "");
  }
  if (subtitleAction) subtitleAction.innerHTML = browser.i18n.getMessage("subtitleAction");
  if (textAction) textAction.innerHTML = browser.i18n.getMessage("textAction");

  if (options) {
    options.setAttribute("title", browser.i18n.getMessage("OPTIONS"));
    options.addEventListener("click", () => {
      browser.runtime.openOptionsPage();
      //window.open("options.html", "options");
    });
  }
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
  // console.log("tabid: ", tabid);
  console.log("tab title: ", tab.title);
  if (htitle && tabid && tab.title != undefined) {
    htitle.innerHTML = tab.title.split("|")[0]?.trim();
    if (fileConfig.lastmodule != "" || fileConfig.lasttopic != "" || fileConfig.lastfileid != 0) {
      // String(tab.title).indexOf(fileConfig.lasttopic) === -1)
      if (htitle.innerHTML.trim().normalize("NFC") != fileConfig.lasttopic.trim().normalize("NFC")) {
        htitle.classList.add("ht-new");
        htitle.setAttribute("title", browser.i18n.getMessage("TITLE_NEW") + ". ");
      } else {
        htitle.classList.add("ht-same");
        htitle.setAttribute("title", browser.i18n.getMessage("TITLE_SAME") + ". ");
      }
    }
  }
  console.log("tab taburl: ", taburl);
  let ownersite = "";
  try {
    ownersite = new URL(taburl).hostname;
  } catch (e) {}
  if (ownersite.indexOf(fileConfig.host_url) !== -1) {
    debuglog(browser.i18n.getMessage("SEARCHVIDEO"));
    getCourseInfo();
    //search_module();
  } else {
    debuglog(browser.i18n.getMessage("WRONGSITE") + " " + fileConfig.host_url);
  }
  const scrolltotitle = otherConfig.scrolltotitle;
  sendMessageBackground("tabid", { tabid: tabid, scrolltotitle: scrolltotitle });
}

function implode_search(saveObjectsReq) {
  function pressButton() {
    let butt = document.querySelector("#downloads-dropdown-btn");
    if (butt) butt.click();
  }

  function sendMessage(m) {
    browser.runtime.sendMessage({ greeting: "csa", message: m });
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
  browser.scripting.executeScript({
    target: {
      tabId: tabid,
    },
    args: [saveObjectsReq],
    func: implode_search,
  });
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
  browser.scripting.executeScript({
    target: {
      tabId: tabid,
    },
    args: [saveObjects, fileConfig, tabid],
    func: implode_save,
  });
}

function show_status_on_tile(item, state) {
  if (item) {
    const delimter = " - ";
    item.title =
      item.title.split(delimter)[0] +
      delimter +
      (state ? browser.i18n.getMessage("AUTOMATIC_TEXT_ON") : browser.i18n.getMessage("AUTOMATIC_TEXT_OFF"));
  }
}

async function onClickAutomaticMode(e) {
  e.preventDefault();
  //console.log("onClickAutomaticMode", e);
  let item = e?.target;
  //let state = await getVariable("automatic", "");
  if (item) {
    let state = !item?.classList.toggle("off");
    show_status_on_tile(item, state);
    // let state = !item?.classList.contains("off");
    await saveVariable("automatic", Boolean(state));
    // state = await getVariable("automatic", "");
    console.log("onClickAutomaticMode read state", state);
  }
}

async function checkAutomaticMode(item) {
  let result = false;
  if (item) {
    let state = await getVariable("automatic", "");
    item?.classList.toggle("off", !state);
    result = state;
    // let state = !item?.classList.contains("off");
    // await saveVariable("automatic", Boolean(state));
    console.log("checkAutomaticMode read state", state);
  }
  return result;
}

async function addListeners() {
  // When the button is clicked, inject startAction into current page
  videoAction?.addEventListener("click", () => {
    //console.log("addEventListener otherConfig:", otherConfig);
    save_module();
    videoAction.setAttribute("hidden", "");
    debuglog(browser.i18n.getMessage("SAVING"));
  });
  const automatic = document.getElementById("automatic");
  if (automatic && otherConfig.automatic) {
    const mode_enabled = await checkAutomaticMode(automatic);
    //automatic.setAttribute("hidden", "");
    automatic.removeAttribute("hidden");
    automatic?.addEventListener(
      "click",
      (e) => {
        onClickAutomaticMode(e);
      },
      false
    );

    let mode_text = browser.i18n.getMessage("AUTOMATIC_TEXT");
    switch (otherConfig.automatic_mode) {
      case "a_mark":
        mode_text = mode_text + " " + browser.i18n.getMessage("AUTOMATIC_MODE_MARK");
        break;
      case "a_save":
        mode_text = mode_text + " " + browser.i18n.getMessage("AUTOMATIC_MODE_SAVE");
        break;
    }
    automatic.title = mode_text;
    show_status_on_tile(automatic, mode_enabled);
    //console.log("addEventListener mode_text:", otherConfig.automatic_mode, automatic.classList, mode_enabled);
  }
}

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await browser.tabs.query(queryOptions);
  return tab;
}

function escapeRegExp(string) {
  return string.replace(/([\\\/*&:<>$#@^?!\[\]]+)/gi, "_");
}

function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  browser.storage.sync
    .get({
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
      init();
    });
}

async function save_options() {
  await browser.storage.sync
    .set({
      lastmodule: fileConfig.lastmodule,
      lasttopic: fileConfig.lasttopic,
      lastfileid: fileConfig.lastfileid,
      lastcourse: fileConfig.lastcourse,
    })
    .then(() => {});
}

function implode_getCourseInfo(saveObjectsReq) {
  const browser = chrome;
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
  //console.log("coureinfo", courseinfo, URL, result);
}

function getCourseInfo() {
  console.log("getCourseInfo start");
  waitCourseInfoID = setTimeout(() => {
    console.log("Timeout of get Course Info");
    debuglog(browser.i18n.getMessage("NOVIDEO"));
  }, 8000);
  browser.scripting.executeScript({
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
  if (fileConfig.lastmodule == "" && fileConfig.lasttopic == "" && fileConfig.lastfileid == 0) {
    return;
  }
  let course = fileConfig.lastcourse;
  if (fileConfig.useautocourse && fileConfig.useshortcourse) {
    let course_ar = course.split(" ");
    course = "";
    for (const word of course_ar) {
      //course += course.length ? fileConfig.title_delimeter : "";
      course += word.charAt(0).toUpperCase() + word.substring(1, 5);
    }
  }

  if (fileConfig.useautocourse) {
    course = course.replace(/([,. ]+)/gi, fileConfig.space_delimeter);
    course = course.replace(/([\\\/"'*&:<>$#@^?!\[\]]+)/gi, "");
  }

  let last_saved_file = fileConfig.course_prefix;

  if (fileConfig.useautocourse && course?.length) last_saved_file += course;

  last_saved_file += (last_saved_file.length ? fileConfig.title_delimeter : "") + fileConfig.module_prefix;

  last_saved_file += String(fileConfig.lastmodule).padStart(2, "0");

  if (saveObjectsReq.usesaveid) {
    last_saved_file += fileConfig.title_delimeter;
    last_saved_file += String(fileConfig.lastfileid).padStart(2, "0");
  }
  last_saved_file += fileConfig.title_delimeter;
  let last_topic = fileConfig.lasttopic.replace(/([,. ]+)/gi, fileConfig.space_delimeter);
  last_topic = last_topic.replace(/([\\\/"'*&:<>$#@^?!\[\]]+)/gi, "");
  last_saved_file += last_topic;
  if (last_saved_file) {
    last_saved_file = browser.i18n.getMessage("PREVIOSFILE") + ": " + last_saved_file;
    document.getElementById("hname")?.setAttribute("title", last_saved_file);
  }
}

async function saveVariable(key, value) {
  let item = {};
  item[key] = value;
  return browser.storage.local.set(item).then(() => {
    console.log("saveSession: saved item", key, value, item);
  });
}

async function getVariable(key, defaultval = "") {
  let item = {};
  item[key] = defaultval;
  return browser.storage.local.get(item).then((item) => {
    console.log("getVariable: item", key, item[key]);
    return item[key];
  });
}

async function getOptions(key) {
  let item = {};
  item[key] = "";
  return browser.storage.sync.get(item).then((item) => {
    console.log("getOptions: item", key, item[key]);
    return item[key];
  });
}

// functions end

document.addEventListener("DOMContentLoaded", restore_options);
