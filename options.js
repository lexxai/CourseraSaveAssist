const SAVED_TXT = chrome.i18n.getMessage("SAVED_TXT");
const RESTORED_DEFAULT_TXT = chrome.i18n.getMessage("RESTORED_DEFAULT_TXT");

function isDarkTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Saves options to chrome.storage
function save_options(e) {
  console.log("save_options");
  e.preventDefault();
  let module = document.getElementById("module")?.value.trim();
  let modulesep = document.getElementById("modulesep")?.value;
  let spacesep = document.getElementById("spacesep")?.value;
  let subtitle_lang = document.getElementById("subtitle_lang")?.value.trim();
  subtitle_lang = subtitle_lang.replace(/\s+/gi, "").replace(/[^a-z0-9A-Z,-]+/gi, "");
  let savevideo = document.getElementById("savevideo")?.checked;
  let videores = document.getElementById("videores")?.checked;
  let savevideotxt = document.getElementById("savevideotxt")?.checked;
  let savevideotxtadd = document.getElementById("savevideotxtadd")?.checked;
  let savesubtitle = document.getElementById("savesubtitle")?.checked;
  let savesubtitleadd = document.getElementById("savesubtitleadd")?.checked;
  let lastmodule = document.getElementById("lastmodule")?.value;
  let lasttopic = document.getElementById("lasttopic")?.value;
  let lastfileid = document.getElementById("lastfileid")?.value;
  let usesaveid = document.getElementById("usesaveid")?.checked;
  let isSave = savevideo || savevideotxt || savesubtitle || savesubtitleadd || savevideotxtadd;
  if (!isSave) {
    const status = document.getElementById("status");
    const SAVESOME = chrome.i18n.getMessage("SAVESOME");
    status.innerHTML = SAVESOME;
    status.classList.add("warning");
    setTimeout(() => {
      status.innerHTML = "";
      status.classList.remove("warning");
    }, 1750);
    return;
  }
  chrome.storage.sync.set(
    {
      module: module,
      modulesep: modulesep,
      spacesep: spacesep,
      subtitle_lang: subtitle_lang,
      savevideo: savevideo,
      videores: videores,
      savevideotxt: savevideotxt,
      savevideotxtadd: savevideotxtadd,
      savesubtitle: savesubtitle,
      savesubtitleadd: savesubtitleadd,
      lastmodule: lastmodule,
      lasttopic: lasttopic,
      lastfileid: lastfileid,
      usesaveid: usesaveid,
    },
    () => {
      // Update status to let user know options were saved.
      document.getElementById("subtitle_lang").value = subtitle_lang;
      let status = document.getElementById("status");
      status.innerHTML = SAVED_TXT;
      status.classList.add("warning");
      setTimeout(() => {
        status.innerHTML = "";
        status.classList.remove("warning");
      }, 750);
    }
  );
}

function reset_options(e) {
  e.preventDefault();
  let frm = document.getElementById("f1");
  if (frm) {
    frm.reset();
    // Update status to let user know options were reset.
    let status = document.getElementById("status");
    status.innerHTML = RESTORED_DEFAULT_TXT;
    status.classList.add("warning");
    setTimeout(() => {
      status.innerHTML = "";
      status.classList.remove("warning");
    }, 750);
  }
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get(
    {
      module: "module-",
      modulesep: "_",
      spacesep: "_",
      subtitle_lang: "en",
      savevideo: true,
      videores: true,
      savevideotxt: true,
      savesubtitle: true,
      savevideotxtadd: true,
      savesubtitleadd: true,
      lastmodule: "",
      lasttopic: "",
      lastfileid: 0,
      usesaveid: true,
    },
    (items) => {
      if (items.module !== undefined) document.getElementById("module").value = items.module;
      if (items.modulesep !== undefined) document.getElementById("modulesep").value = items.modulesep;
      if (items.modulesep !== undefined) document.getElementById("spacesep").value = items.spacesep;
      if (items.subtitle_lang) document.getElementById("subtitle_lang").value = items.subtitle_lang;
      if (items.savevideo !== undefined) document.getElementById("savevideo").checked = items.savevideo;
      if (items.videores !== undefined) document.getElementById("videores").checked = items.videores;
      if (items.savevideotxt !== undefined) document.getElementById("savevideotxt").checked = items.savevideotxt;
      if (items.savevideotxtadd !== undefined)
        document.getElementById("savevideotxtadd").checked = items.savevideotxtadd;
      if (items.savesubtitle !== undefined) document.getElementById("savesubtitle").checked = items.savesubtitle;
      if (items.savesubtitle !== undefined) document.getElementById("savesubtitleadd").checked = items.savesubtitleadd;
      if (items.lastmodule) document.getElementById("lastmodule").value = items.lastmodule;
      if (items.lasttopic) document.getElementById("lasttopic").value = items.lasttopic;
      if (items.lastfileid !== undefined) document.getElementById("lastfileid").value = Number(items.lastfileid);
      if (items.usesaveid !== undefined) document.getElementById("usesaveid").checked = items.usesaveid;
    }
  );
}

async function clearstorage() {
  //console.log('before data removed on storage.local');
  await new Promise((resolve, reject) => {
    chrome.storage.local.clear(function () {
      console.log("All data removed on storage.local");
      resolve();
    });
  });
  //console.log('after data removed on storage.local');
}

const messageRegex = /__MSG_(.*)__/g;
function localizeHtmlPage(elm) {
  for (let i = 0; i < elm.children.length; i++) {
    localizeHtmlPage(elm.children[i]);
    if (elm.children[i].hasAttributes()) {
      for (let j = 0; j < elm.children[i].attributes.length; j++) {
        elm.children[i].attributes[j].name = elm.children[i].attributes[j].name.replace(messageRegex, localizeString);
        elm.children[i].attributes[j].value = elm.children[i].attributes[j].value.replace(messageRegex, localizeString);
      }
    }
    if (elm.children[i].innerHTML.length) {
      elm.children[i].innerHTML = elm.children[i].innerHTML.replace(messageRegex, localizeString);
    }
  }
}

function localizeString(_, str) {
  return str ? chrome.i18n.getMessage(str) : "";
}

function installListsEvent() {
  document.getElementById("save").addEventListener("click", save_options);
  document.getElementById("reset").addEventListener("click", reset_options);
}

function readManifest() {
  let m = chrome.runtime.getManifest();
  if (m) {
    //console.log('readManifest',m);
    let host = m.host_permissions[0].split("/*")[1];
    document.getElementById("version").innerHTML = "             v. " + m.version + " [" + host + "]";
  }
}

function init() {
  localizeHtmlPage(document.body);
  readManifest();
  installListsEvent();
  restore_options();
}

document.addEventListener("DOMContentLoaded", init);
