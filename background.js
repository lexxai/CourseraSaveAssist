chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled background");
  clearState();
});

chrome.runtime.onConnect.addListener(function (port) {
  console.assert(port.name === "csa-background");
  port.onMessage.addListener(function (request) {
    switch (request.command) {
      case "tabid":
        clearState();
        let tabid = request.message;
        console.log("mgs background tabid:", tabid);
        break;
      case "setFilesCount":
        let count = request.message;
        console.log("mgs background setFilesCount:", count);
        setState(count, 1);
        setTimeout(() => {
          setState(count, 2);
          setTimeout(() => {
            clearState();
          }, 10000);
        }, 5000);
        break;
      case "start":
        console.log("startAction background port");
        chrome.storage.sync.get({}, (items) => {
          console.log("msg background start");
        });
        // port.postMessage({
        //   replybtn: "OK",
        //   state: "on",
        // });
        return true;
        break;
    }
  });
});

function setState(c, mode = 0) {
  const colormodes = ["white", "red", "blue"];
  chrome.action.setBadgeText({ text: String(c).trim() });
  chrome.action.setBadgeBackgroundColor({
    color: colormodes[mode],
  });
}
function clearState(c) {
  chrome.action.setBadgeText({ text: "" });
  chrome.action.setBadgeBackgroundColor({
    color: "",
  });
}

function sentMsg(cmd, tabid = 0) {
  chrome.runtime.sendMessage({ greeting: "csa-bg", command: cmd, tabid: tabid }, function (response) {
    console.log("runtime.sentMsg response", response);
  });
}
