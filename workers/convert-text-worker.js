const {
  convertLatinToCyrillic,
  convertCyrillicToLatin,
} = require("../converter");
const { parentPort, workerData } = require("worker_threads");

(() => {
  try {
    const { text, direction } = workerData;
    let convertedText = text;

    if (text && direction) {
      convertedText =
        direction === "lat-to-cyr"
          ? convertLatinToCyrillic(text)
          : convertCyrillicToLatin(text);
      parentPort.postMessage({
        success: true,
        convertedText,
        message: "Tekst uspešno konvertovan",
      });
      return;
    } else {
      parentPort.postMessage({
        success: false,
        convertedText,
        message: "Tekst za konverziju ne postoji",
      });
      return;
    }
  } catch (error) {
    console.log("Error on converting text", error);
    parentPort.postMessage({
      success: false,
      convertedText: null,
      message: "Imamo problem, molimo pokušajte ponovo",
    });
  }
})();
