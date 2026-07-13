const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "dist", "front-end", "browser", "index.html");
// Wait, Angular 17+ outputs to dist/front-end/browser/index.html
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, "utf8");
  
  const virtualConsole = new jsdom.VirtualConsole();
  virtualConsole.on("error", (err) => {
    console.error("JSDOM ERROR:", err);
  });
  virtualConsole.on("log", (log) => {
    console.log("JSDOM LOG:", log);
  });
  virtualConsole.on("jsdomError", (err) => {
    console.error("JSDOM jsdomError:", err);
  });

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    virtualConsole,
    url: "http://localhost:4200/"
  });

  setTimeout(() => {
    console.log("App rendered HTML:", dom.window.document.body.innerHTML);
  }, 2000);
} else {
  console.log("dist/front-end/browser/index.html not found, searching...");
  const distPath = path.join(__dirname, "dist", "front-end");
  if (fs.existsSync(distPath)) {
    console.log("Files in dist/front-end:", fs.readdirSync(distPath));
  } else {
    console.log("dist/front-end not found");
  }
}
