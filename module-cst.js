//author= Mücahit Sahin
//github=https://github.com/mucahit-sahin
//author of fork with addons = lexxai
//github=https://github.com/lexxai/coursera-subtitle-translate-extension

window.browser = (function () {
  return typeof window.browser === "undefined" ? window.chrome : window.browser;
})();

async function openBilingual() {
  let tracks = document.getElementsByTagName("track");
  let en;
  //let tr;
  if (tracks.length) {
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].srclang === "en") {
        en = tracks[i];
      }
    }

    if (en) {
      en.track.mode = "showing";

      //addSubtitleStyles("font-size: 16px; color: red;", en);

      await sleep(500);
      let cues = en.track.cues;

      // Виявлення моментів закінчення речення в англійському письмі.
      // ..... кінець речення. Нове речення
      // Тут вважається, що речення закінчується лише у випадках, коли після символу крапки стоїть пробіл.
      // 75.3, model.fit і т.д., щоб не сприймати крапку як кінець речення.
      let endSentence = [];
      let match_pattern = /[.?!]/;
      for (let i = 0; i < cues.length; i++) {
        for (let j = 0; j < cues[i].text.length; j++) {
          if (cues[i].text[j].match(match_pattern) && cues[i].text[j + 1] == undefined) {
            endSentence.push(i);
          }
        }
      }
      ///////////////////////

      let cuesTextList = getTexts(cues);

      getTranslation(cuesTextList, (translatedText) => {
        //console.log("getTranslation. translatedText:", translatedText);
        let translatedList = translatedText.split(" u~~~u");
        //console.log("getTranslation. translatedList:", translatedList);
        translatedList.splice(-1, 1);
        // console.log(
        //   "getTranslation. translatedList:.splice(-1, 1)",
        //   translatedList
        // );

        if (!translatedList) {
          return;
        }

        for (let i = 0; i < endSentence.length; i++) {
          if (i != 0) {
            for (let j = endSentence[i - 1] + 1; j <= endSentence[i]; j++) {
              cues[j].text = cues[j].text.split(" u~~~u")[0].replace(/\n/g, " ");
              if (typeof translatedList[i] != "undefined") {
                cues[j].text += "\n\n" + translatedList[i].trim();
              }
              // console.log(translatedList[i]);
            }
          } else {
            for (let j = 0; j <= endSentence[i]; j++) {
              cues[j].text = cues[j].text.split(" u~~~u")[0].replace(/\n/g, " ");
              if (typeof translatedList[i] != "undefined") {
                cues[j].text += "\n\n" + translatedList[i].trim();
              }
              // console.log(translatedList[i]);
            }
          }
        }
        mark_translated();
      });
    }
  }
}

String.prototype.replaceAt = function (index, replacement) {
  return this.substring(0, index) + replacement + this.substring(index + replacement.length);
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTexts(cues) {
  let cuesTextList = "";
  let match_pattern = /[.?!]/;
  let mark_sequence = "u~~~u";
  let mark_sequence_added = " " + mark_sequence + " ";
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].text.includes("\n\n")) continue;
    let last_char = cues[i].text[cues[i].text.length - 1];
    if (last_char.match(match_pattern)) {
      cues[i].text = cues[i].text.replaceAt(cues[i].text.length - 1, last_char + mark_sequence_added);
    }
    cuesTextList += cues[i].text.replace(/\n/g, " ") + " ";
  }
  return cuesTextList;
}

function resizeSub(size) {
  console.log("CST size:", size);
  //let size = result.size;
  size = size / 100;
  // alert('Value is set to ' + size);
  let css = `video::-webkit-media-text-track-display {font-size: ${size}em;}`,
    head = document.head || document.getElementsByTagName("head")[0],
    style = document.createElement("style");

  style.type = "text/css";
  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  head.appendChild(style);
}

function getTranslation(words, callback) {
  browser.storage.sync.get({ cst_lang: "uk" }, function (result) {
    let lang = result.cst_lang;
    console.log("CST Lang:", lang);
    const xhr = new XMLHttpRequest();
    let url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURI(
      words
    )}`;
    xhr.open("GET", url, true);
    xhr.responseType = "text";
    xhr.onload = function () {
      if (xhr.readyState === xhr.DONE) {
        if (xhr.status === 200 || xhr.status === 304) {
          const translatedList = JSON.parse(xhr.responseText)[0];
          let translatedText = "";
          if (translatedList) {
            for (let i = 0; i < translatedList.length; i++) {
              translatedText += translatedList[i][0];
            }
            callback(translatedText);
          }
        }
      }
    };
    xhr.send();
  });
}

function check_translated() {
  let video = document.getElementById("video_player_html5_api");
  result = video?.getAttribute("cst") == "translated";
  if (result) console.log("CST video is already marked as translated, skip");
  return result;
}

function mark_translated() {
  let video = document.getElementById("video_player_html5_api");
  if (video && video?.getAttribute("cst") != "translated") {
    console.log("CST mark video as translated");
    video.setAttribute("cst", "translated");
  }
}

function translate() {
  if (check_translated()) {
    return;
  }
  browser.storage.sync
    .get({
      cst_fontsize: 75,
    })
    .then((result) => {
      let fontsize = result.cst_fontsize;
      if (fontsize) {
        resizeSub(fontsize);
      } else {
        resizeSub(75);
      }
    })
    .catch(() => {
      resizeSub(75);
    });

  openBilingual();
}

// MAIN

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command == "translate") {
    console.log("CST MODULE translating", request.command);
    translate();
    console.log("CST MODULE translated", request.command);
    if (sendResponse) sendResponse({ command: "translated" });
  }
  return false;
});

console.log("CST MODULE LOADED ...");
