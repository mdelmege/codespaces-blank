const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");

function createWindow() {
  const win = new BrowserWindow({
    width: 650, height: 720, resizable: false, autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  win.loadFile(path.join(__dirname, "index.html"));
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

ipcMain.handle("select-file", async () => {
  const res = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "PDF Documents", extensions: ["pdf"] }] });
  return res.filePaths[0] || null;
});

ipcMain.handle("sanitize-pdf", async (e, filePath) => {
  try {
    const bytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });
    pdfDoc.setTitle(""); pdfDoc.setAuthor(""); pdfDoc.setSubject("");
    pdfDoc.setProducer(""); pdfDoc.setCreator("");
    pdfDoc.setCreationDate(new Date(0)); pdfDoc.setModificationDate(new Date(0));
    const cleanBytes = await pdfDoc.save({ useObjectStreams: false });
    const parsed = path.parse(filePath);
    const outPath = path.join(parsed.dir, `${parsed.name}_sanitized${parsed.ext}`);
    fs.writeFileSync(outPath, cleanBytes);
    return { success: true, outputPath: outPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});