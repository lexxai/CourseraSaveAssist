const SAVED_TXT = chrome.i18n.getMessage("SAVED_TXT");
const RESTORED_DEFAULT_TXT = chrome.i18n.getMessage("RESTORED_DEFAULT_TXT");

// Saves options to chrome.storage
function save_options(e) {
  console.log("save_options");
  e.preventDefault();
  let send_msg = document.getElementById("send_messg").value;
  let users_ignore = document.getElementById("users_ignore").value;
  let users_ignore_on = document.getElementById("users_ignore_on").checked;
  let users_allowed = document.getElementById("users_allowed").value;
  let users_allowed_video = document.getElementById(
    "users_allowed_video"
  ).value;
  let users_allowed_on = document.getElementById("users_allowed_on").checked;
  let users_allowed_video_on = document.getElementById(
    "users_allowed_video_on"
  ).checked;
  let imageurl = document.getElementById("imageurl").value;
  let imagecode = document.getElementById("imagecode").value;
  let users_replace = document.getElementById("users_replace").value;
  let startpos = document.getElementById("startpos").value;
  let activate = document.getElementById("activate").checked;
  let ul_pinned = document.getElementById("ul_pinned").checked;
  let baseurl = document.getElementById("baseurl").value;
  let baseurl_um = document.getElementById("baseurl_um").value;
  let maxtime = document.getElementById("maxtime").value;
  let randomtime = document.getElementById("randomtime").checked;
  //let videofile = document.getElementById('videofile').files[0];
  // let  min_time = document.getelementbyid('min_time').value;
  // let  s_max_time = document.getelementbyid('s_max_time').value;
  // let  e_max_time = document.getelementbyid('e_max_time').value;
  // let  a_max_time = document.getelementbyid('a_max_time').value;
  // let  refresh_time = document.getelementbyid('refresh_time').value;
  // let  button_id = document.getelementbyid('button_id').value;
  // let  button_trigg = document.getelementbyid('button_trigg').value;
  // let  add_button_text = document.getelementbyid('add_button_text').checked;
  // let  a_max_time_activate = document.getelementbyid('a_max_time_activate').checked;
  // let  btnsearch =  document.getElementById('btnsearch').value;

  chrome.storage.sync.set(
    {
      module: module,
      modulesep: modulesep,
      subtitle_lang: subtitle_lang,
      savevideo: savevideo,
      savevideotxt: savevideotxt,
      savesubtitle: savesubtitle,
      savesubtitleadd: savesubtitleadd,
    },
    function () {
      // Update status to let user know options were saved.
      let status = document.getElementById("status");
      status.innerHTML =
        '<div align="right" style="color: red; font-weight: bold;">' +
        SAVED_TXT +
        ".</div>";
      setTimeout(function () {
        status.innerHTML = "";
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
    status.innerHTML =
      '<div align="right" style="color: red; font-weight: bold;">' +
      RESTORED_DEFAULT_TXT +
      ".</div>";
    setTimeout(function () {
      status.innerHTML = "";
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
      subtitle_lang: "en",
      savevideo: true,
      savevideotxt: true,
      savesubtitle: true,
      savesubtitleadd: true,
    },
    function (items) {
      if (items.module) document.getElementById("module").value = items.module;
      if (items.modulesep)
        document.getElementById("modulesep").value = items.modulesep;
      if (items.subtitle_lang)
        document.getElementById("subtitle_lang").value = items.subtitle_lang;
      if (items.savevideo)
        document.getElementById("savevideo").checked = items.savevideo;
      if (items.savevideotxt)
        document.getElementById("savevideotxt").checked = items.savevideotxt;
      if (items.savesubtitle)
        document.getElementById("savesubtitle").checked = items.savesubtitle;
      if (items.savesubtitle)
        document.getElementById("savesubtitleadd").checked = items.savesubtitle;
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
        elm.children[i].attributes[j].name = elm.children[i].attributes[
          j
        ].name.replace(messageRegex, localizeString);
        elm.children[i].attributes[j].value = elm.children[i].attributes[
          j
        ].value.replace(messageRegex, localizeString);
      }
    }
    if (elm.children[i].innerHTML.length) {
      elm.children[i].innerHTML = elm.children[i].innerHTML.replace(
        messageRegex,
        localizeString
      );
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
    document.getElementById("version").innerHTML =
      "             v. " + m.version + " [" + host + "]";
  }
}

function init() {
  localizeHtmlPage(document.body);
  readManifest();
  installListsEvent();
  restore_options();
}

document.addEventListener("DOMContentLoaded", init);
