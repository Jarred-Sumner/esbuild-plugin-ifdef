const util = require("util");
const fs = require("fs");
const path = require("path");
const readFile = util.promisify(fs.readFile);

const IF_DEFS = [];

const ENDIF = "//#endif";
const IFDEF = "//#ifdef";
let filterList;
let baseDir;

function configureStringsToSearch(vars) {
  for (let _key in vars) {
    const key = _key.replace("process.env.", "");

    const keytype = typeof vars[_key];

    if (keytype === "boolean" && vars[_key]) {
      IF_DEFS.push(key);
    } else if (keytype !== "boolean" && keytype !== "undefined") {
      IF_DEFS.push(key);
    }
  }
}

const MODE = {
  find_opening: 0,
  find_closing: 1,
};

const LINE_TYPE = {
  plain: 0,
  ifdef: 1,
  closing: 2,
};

let exclusions;

async function onLoadPlugin(args) {
  let dirPath = path.relative(baseDir, args.path);
  let hasMatch = false;

  for (let filter of filterList) {
    if (dirPath.startsWith(filter)) {
      hasMatch = true;
      break;
    }
  }

  if (!hasMatch) {
    return null;
  }

  let text = await readFile(args.path, "utf8");
  if (text.includes(IFDEF)) {
    let lines = text.split("\n");
    let ifdefStart = -1,
      endifStart = -1,
      depth = 0;

    let count = 0;
    let line = "",
      expression = "";
    let step = MODE.find_opening;
    let shouldRemove = false;
    let lineType = LINE_TYPE.plain;

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      line = lines[lineNumber];

      if (line.startsWith(IFDEF)) {
        lineType = LINE_TYPE.ifdef;
      } else if (line.startsWith(ENDIF)) {
        lineType = LINE_TYPE.closing;
      } else {
        lineType = LINE_TYPE.plain;
      }

      if (lineType === LINE_TYPE.ifdef && step === MODE.find_opening) {
        depth = 0;
        ifdefStart = lineNumber;
        step = MODE.find_closing;
        expression = line.substring(IFDEF.length).trim();
        shouldRemove = !IF_DEFS.includes(expression);
        if (shouldRemove && expression.startsWith("!")) {
          shouldRemove = false;
        }
      } else if (lineType === LINE_TYPE.ifdef && step === MODE.find_closing) {
        depth++;
      } else if (
        lineType === LINE_TYPE.closing &&
        step === MODE.find_closing &&
        depth > 0
      ) {
        depth--;
      } else if (
        lineType === LINE_TYPE.closing &&
        step === MODE.find_closing &&
        depth === 0
      ) {
        if (shouldRemove) {
          lines = [
            ...lines.slice(0, ifdefStart),
            ...lines.slice(lineNumber + 1),
          ];
        } else {
          lines = [
            ...lines.slice(0, ifdefStart),
            ...lines.slice(ifdefStart + 1, lineNumber),
            ...lines.slice(lineNumber + 1),
          ];
        }

        step = MODE.find_opening;
        ifdefStart = -1;
        shouldRemove = false;
        lineNumber = 0;
      }
    }

    text = lines.join("\n");

    return {
      contents: text,
      loader: path.extname(args.path).substring(1),
    };
  } else {
    return null;
  }
}

const DEFAULT_EXCLUDE_LIST = ["dist", "vendor", "node_modules", ".git"];

module.exports = (
  env = process.env,
  _baseDir = process.cwd(),
  exclude = DEFAULT_EXCLUDE_LIST
) => {
  configureStringsToSearch(env);

  baseDir = _baseDir;
  filterList = fs.readdirSync(baseDir).filter((dir) => {
    if (dir.includes(".")) {
      return false;
    }

    for (let excludeDir of exclude) {
      if (excludeDir.includes(dir)) {
        return false;
      }
    }

    return true;
  });

  const filter = {
    filter: new RegExp(
      `(${filterList
        .map((dir) => path.join(_baseDir, dir))
        .join("|")}).*\\.(js|ts|tsx)$`
    ),
  };

  return {
    name: "#ifdef",
    setup(build) {
      build.onLoad(filter, onLoadPlugin);
    },
  };
};
