let tabid = 0;
let taburl = "";

const saveObjects = {
  filename: "",
  video: "",
  subtitle: "",
  videotext: "",
  subtitle_addon: "",
  subtitle_addon_lang: "",
};

const saveObjectsReq = {
  video: true,
  subtitle: true,
  videotext: true,
  subtitle_addon: true,
  subtitle_addon_lang: "en",
};

const fileConfig = {
  host_url: "coursera.org",
  module_prefix: "module-",
  title_delimeter: "_",
  space_delimeter: "_",
  ext_video: ".mp4",
  ext_sub: ".vtt",
  ext_text: ".txt",
};

//Functions....
function init() {
  localization();
  Initialize();
  addListeners();
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // console.log(
  //   sender.tab
  //     ? "from a content script:" + sender.tab.url
  //     : "from the extension"
  // );
  if (taburl != sender.tab.url) {
    console.log("message not for me, skip");
    return;
  }
  switch (request.greeting) {
    case "csa":
      //sendResponse({ ret: "OK" });
      if (request.message.error) {
        debuglog(chrome.i18n.getMessage("NOVIDEO"));
        return;
      }
      videoAction.style.display = "block";
      debuglog("");
      let module = request.message.module;
      let topic = request.message.topic;
      topic = topic.replace(/([,. ]+)/gi, fileConfig.space_delimeter);
      topic = topic.replace(/([\\\/*&:<>$#@^?!\[\]]+)/gi, "");
      saveObjects.video = request.message.video;
      if (request.message.subtitle)
        saveObjects.subtitle = request.message.subtitle;
      if (request.message.videotext)
        saveObjects.videotext = request.message.videotext;
      saveObjects.filename =
        fileConfig.module_prefix + module + fileConfig.title_delimeter + topic;
      //debuglog("READY to SAVE: " + subtitle);
      if (request.message.subtitle_addon)
        saveObjects.subtitle_addon = request.message.subtitle_addon;
      if (request.message.subtitle_addon_lang)
        saveObjects.subtitle_addon_lang = request.message.subtitle_addon_lang;
      console.log("module: ", request.message.result);
      break;
    case "csa-save":
      debuglog("");
      if (request.message.state === "saving") {
        debuglog(
          chrome.i18n.getMessage("SAVINGFILES") + " " + request.message.items
        );
        setTimeout(() => {
          window.close();
        }, 3500);
      }
      break;
  }
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

  if (videoAction) {
    let cnt = 0;
    videoAction.innerHTML = chrome.i18n.getMessage("videoAction");
    if (saveObjectsReq.video) {
      videoAction.innerHTML +=
        (cnt++ ? ", " : " ") + chrome.i18n.getMessage("VIDEO");
    }
    if (saveObjectsReq.subtitle) {
      videoAction.innerHTML +=
        (cnt++ ? ", " : " ") + chrome.i18n.getMessage("SUBTILE");
    }
    if (saveObjectsReq.videotext) {
      videoAction.innerHTML +=
        (cnt++ ? ", " : " ") + chrome.i18n.getMessage("VIDEOTEXT");
    }
    if (saveObjectsReq.subtitle_addon) {
      videoAction.innerHTML +=
        (cnt++ ? ", " : " ") +
        chrome.i18n.getMessage("SUBTILE") +
        ":" +
        saveObjectsReq.subtitle_addon_lang;
    }

    videoAction.style.display = "none";
  }
  if (subtitleAction)
    subtitleAction.innerHTML = chrome.i18n.getMessage("subtitleAction");
  if (textAction) textAction.innerHTML = chrome.i18n.getMessage("textAction");

  if (options) {
    options.setAttribute("title", chrome.i18n.getMessage("OPTIONS"));
    options.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
      //window.open("options.html", "options");
    });
  }

  if (bImg)
    bImg.src =
      "chrome-extension://" +
      chrome.i18n.getMessage("@@extension_id") +
      "/images/button-ico-128.png";
}

function debuglog(text) {
  const pdebug = document.getElementById("pdebug");
  if (pdebug) {
    pdebug.innerHTML = text;
    pdebug.style.display = text ? "block" : "none";
  }
}

async function Initialize() {
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
    search_module();
  } else {
    debuglog(chrome.i18n.getMessage("WRONGSITE") + " " + fileConfig.host_url);
  }
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
    result.subtitle = document.querySelector(
      'video.vjs-tech track[srclang="' + lang + '"]'
    )?.src;

    // console.log("result.module", result.module);
    // console.log("result.topic", result.topic);
    // console.log("result.video", result.video);
    // console.log("result.subtitle lang:", lang, result.subtitle);
    return result;
  }

  function searchInMenu(saveObjectsReq) {
    let result = {};
    result.module = document
      .querySelector("a.breadcrumb-title > span")
      .innerHTML.split(" ")[1];
    result.topic = document
      .querySelector("span.breadcrumb-title")
      ?.innerHTML.trim();
    if (saveObjectsReq.video) {
      result.video = document
        .querySelector(
          "div.rc-DownloadsDropdown.bt3-dropdown.bt3-open > ul > li:nth-last-child(3) > a"
        )
        ?.getAttribute("data-track-href");
    }
    if (saveObjectsReq.subtitle) {
      result.subtitle = document
        .querySelector(
          "div.rc-DownloadsDropdown.bt3-dropdown.bt3-open > ul > li:nth-last-child(2) > a"
        )
        ?.getAttribute("data-track-href");
    }
    if (saveObjectsReq.videotext) {
      result.videotext = document
        .querySelector(
          "div.rc-DownloadsDropdown.bt3-dropdown.bt3-open > ul > li:nth-last-child(1) > a"
        )
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

  let opened = document.querySelector(
    "div.rc-DownloadsDropdown.bt3-dropdown.bt3-open"
  );

  let maxtry = 10;
  if (!opened) {
    pressButton();
    const interval = setInterval(() => {
      let opened = document.querySelector(
        "div.rc-DownloadsDropdown.bt3-dropdown.bt3-open"
      );
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

function implode_save(saveparam, fileConfig) {
  //console.log("implode_save: ", saveparam);

  function sendMessage(m) {
    chrome.runtime.sendMessage({ greeting: "csa-save", message: m });
  }

  function saveAsFile(url, filename) {
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
  if (saveparam.video) {
    savingItems++;
    saveAsFile(saveparam.video, saveparam.filename + fileConfig.ext_video);
  }
  if (saveparam.subtitle) {
    savingItems++;
    saveAsFile(saveparam.subtitle, saveparam.filename + fileConfig.ext_sub);
  }
  if (saveparam.videotext) {
    savingItems++;
    saveAsFile(saveparam.videotext, saveparam.filename + fileConfig.ext_text);
  }
  if (saveparam.subtitle_addon) {
    savingItems++;
    saveAsFile(
      saveparam.subtitle_addon,
      saveparam.filename +
        fileConfig.title_delimeter +
        saveparam.subtitle_addon_lang +
        fileConfig.ext_sub
    );
  }

  setTimeout(() => {
    sendMessage({ state: "saving", items: savingItems });
  }, 1500);
}

function save_module() {
  chrome.scripting.executeScript({
    target: {
      tabId: tabid,
    },
    args: [saveObjects, fileConfig],
    func: implode_save,
  });
}

function addListeners() {
  // When the button is clicked, inject startAction into current page
  videoAction?.addEventListener("click", () => {
    //console.log("addEventListener by videoAction tabid:" + tabid);
    save_module();
    videoAction.style.display = "none";
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
  chrome.storage.sync.get(
    {
      module: "module-",
      modulesep: "_",
      spacesep: "_",
      subtitle_lang: "en",
      savevideo: true,
      savevideotxt: true,
      savesubtitle: true,
      savesubtitleadd: true,
    },
    (items) => {
      fileConfig.module_prefix = items?.module;
      if (items?.modulesep !== undefined)
        fileConfig.title_delimeter = escapeRegExp(items.modulesep);
      if (items?.spacesep !== undefined)
        fileConfig.space_delimeter = escapeRegExp(items.spacesep);
      saveObjectsReq.video = items?.savevideo;
      saveObjectsReq.subtitle = items?.savesubtitle;
      saveObjectsReq.videotext = items?.savevideotxt;
      saveObjectsReq.subtitle_addon = items?.savesubtitleadd;
      saveObjectsReq.subtitle_addon_lang = items?.subtitle_lang;
      console.log("RESTORE_OPT", saveObjectsReq, fileConfig);
      init();
    }
  );
}

document.addEventListener("DOMContentLoaded", restore_options);
