let tabid = 0;
let taburl = "";

let filename = "";
let video = "";
let subtitle = "";
let videotext = "";
const fileconfig = {
  modulePrefix: "module-",
  titleDelimeter: "_",
};

localization();
Initialize();
addListeners();

//Functions....
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(
    sender.tab
      ? "from a content script:" + sender.tab.url
      : "from the extension"
  );
  if (taburl != sender.tab.url) {
    console.log("message not for me, skip");
    return;
  }
  if (request.greeting === "csa") {
    //sendResponse({ ret: "OK" });
    if (request.message.error) {
      debuglog(chrome.i18n.getMessage("NOVIDEO"));
      return;
    }
    videoAction.style.display = "block";
    debuglog("");
    let module = request.message.module;
    let topic = request.message.topic;
    topic = topic.replace(/([,. ]+)/gi, "_");
    topic = topic.replace(/([\\\/*&:<>$#@^?!\[\]]+)/gi, "");
    video = request.message.video;
    // const ownersite = new URL(sender.tab.url);
    // const baseURL = ownersite.protocol + "//" + ownersite.hostname;
    subtitle = request.message.subtitle;
    // if (!subtitle.startsWith("http")) subtitle = baseURL + subtitle;
    videotext = request.message.videotext;
    // if (!videotext.startsWith("http")) videotext = baseURL + videotext;
    filename =
      fileconfig.modulePrefix + module + fileconfig.titleDelimeter + topic;
    //debuglog("READY to SAVE: " + subtitle);
    console.log("module: ", request.message.result);
  } else if (request.greeting === "csa-save") {
    debuglog("");
    if (request.message === "saving") {
      window.close();
    }
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
    videoAction.innerHTML = chrome.i18n.getMessage("videoAction");
    videoAction.style.display = "none";
  }
  if (subtitleAction)
    subtitleAction.innerHTML = chrome.i18n.getMessage("subtitleAction");
  if (textAction) textAction.innerHTML = chrome.i18n.getMessage("textAction");

  if (options) {
    options.setAttribute("title", chrome.i18n.getMessage("OPTIONS"));
    options.addEventListener("click", () => {
      window.open("options.html", "options");
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
  debuglog(chrome.i18n.getMessage("SEARCHVIDEO"));
  let tab = await getCurrentTab();
  tabid = tab.id;
  taburl = tab.url;
  console.log("tabid: ", tabid);
  console.log("tab title: ", tab.title);
  if (htitle && tabid) htitle.innerHTML = tab.title;
  search_module();
}

function implode_search() {
  function pressButton() {
    let butt = document.querySelector("#downloads-dropdown-btn");
    if (butt) butt.click();
  }

  function sendMessage(m) {
    chrome.runtime.sendMessage({ greeting: "csa", message: m });
  }

  function searchInVideo() {
    let result = {};
    result.module = document
      .querySelector("a.breadcrumb-title > span")
      .innerHTML.split(" ")[1];
    result.topic = document
      .querySelector("span.breadcrumb-title")
      .innerHTML.trim();
    result.video = document.querySelector(
      'video.vjs-tech source[type="video/mp4"]'
    ).src;
    let lang = document.querySelector("div.vjs-react").getAttribute("lang");
    result.subtitle = document.querySelector(
      'video.vjs-tech track[srclang="' + lang + '"]'
    ).src;

    console.log("result.module", result.module);
    console.log("result.topic", result.topic);
    console.log("result.video", result.video);
    console.log("result.subtitle lang:", lang, result.subtitle);
    return result;
  }

  function searchInMenu() {
    let result = {};
    result.module = document
      .querySelector("a.breadcrumb-title > span")
      .innerHTML.split(" ")[1];
    result.topic = document
      .querySelector("span.breadcrumb-title")
      .innerHTML.trim();
    result.video = document
      .querySelector(
        "div.rc-DownloadsDropdown.bt3-dropdown.bt3-open > ul > li:nth-last-child(3) > a"
      )
      .getAttribute("data-track-href");
    let lang = document.querySelector("div.vjs-react").getAttribute("lang");
    result.subtitle = document
      .querySelector(
        "div.rc-DownloadsDropdown.bt3-dropdown.bt3-open > ul > li:nth-last-child(2) > a"
      )
      .getAttribute("data-track-href");
    result.videotext = document
      .querySelector(
        "div.rc-DownloadsDropdown.bt3-dropdown.bt3-open > ul > li:nth-last-child(1) > a"
      )
      .getAttribute("data-track-href");

    // console.log("result.module", result.module);
    // console.log("result.topic", result.topic);
    // console.log("result.video", result.video);
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
        searchInMenu();
      }
      if (maxtry-- <= 0) {
        clearInterval(interval);
        sendMessage({ error: "404" });
        console.log("error: 404");
      }
    }, 100);
  } else {
    console.log("already opened menu");
    searchInMenu();
  }
}

function search_module() {
  chrome.scripting.executeScript({
    target: {
      tabId: tabid,
    },
    args: [""],
    func: implode_search,
  });
}

function implode_save(saveparam) {
  //console.log("implode_save: ", saveparam);

  function sendMessage(m) {
    chrome.runtime.sendMessage({ greeting: "csa-save", message: m });
  }

  function saveAsFile(url, filename) {
    //console.log("implode_save :: saveAsFile", url, filename);
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

  if (saveparam.video) saveAsFile(saveparam.video, saveparam.filename + ".mp4");
  if (saveparam.subtitle)
    saveAsFile(saveparam.subtitle, saveparam.filename + ".vtt");
  if (saveparam.videotext)
    saveAsFile(saveparam.videotext, saveparam.filename + ".txt");

  setTimeout(() => {
    sendMessage("saving");
  }, 2500);
}

function save_module() {
  let saveparam = {
    video: video,
    subtitle: subtitle,
    videotext: videotext,
    filename: filename,
  };

  console.log("save_module: ", saveparam);

  chrome.scripting.executeScript({
    target: {
      tabId: tabid,
    },
    args: [saveparam],
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
