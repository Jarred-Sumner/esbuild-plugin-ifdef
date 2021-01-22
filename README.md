# esbuild-plugin-ifdef

This esbuild plugin lets you use `//#ifdef` comments in JavaScript & TypeScript, so you can conditionally add code to files.

## Installation

```bash
yarn add esbuild-plugin-ifdef
```

## Usage

This adds `//#ifdef` comments to JavaScript & TypeScript which let you conditionally add code to files.

For example:

```js
//#ifdef LOD_FEATURE_FLAG
function getLODistance() {
  // When LOD_FEATURE_FLAG is true, this code is included.
  return runLongFunctionCode();
}
//#endif

//#ifdef !LOD_FEATURE_FLAG
function getLODistance() {
  // When LOD_FEATURE_FLAG is falsy, this code is included.
  return 0;
}
//#endif
```

This is useful for cases where treeshaking doesn't work or interferes with scoping. For example, this code does not work with tree shaking:

```js
if (true) {
  function getLODistance() {
    // When LOD_FEATURE_FLAG is true, this code is included.
    return runLongFunctionCode();
  }
} else {
  function getLODistance() {
    return 0;
  }
}

// This code doesn't work! getLODDistance() is undefined because it's only accessible from inside the if/else scope.
getLODDistance();
```

## Configuration

Pass `esbuild-plugin-ifdef` an object. If the value is a boolean, `true` means the code inside `//#ifdef KEY_IN_OBJECT` will be included, otherwise it will be removed before tree shaking/parsing.

```js
const { build } = require("esbuild");
const ifdef = require("esbuild-plugin-ifdef");

const define = {
  "process.env.LOD_FEATURE_FLAG": true,
};

build({
  entryPoints: ["input.js"],
  outfile: "output.js",
  bundle: true,
  define,
  plugins: [ifdef(define)],
}).catch(() => process.exit(1));
```

Arguments:

```ts
export function ifdef(
  // Environment variables to include
  // Suggestion: use the same `define` object.
  env: Object,
  // By default, esbuild runs plugins on node_modules.
  // You probably don't want to run this on node_modules for both performance and security reasons.
  // This filters the list of files to run on to exclude node_modules and include only the directories in the top level of your project.
  baseDir: string = process.cwd(),
  exclude: string[] = ["dist", "vendor", "node_modules", ".git"]
);
```

It will automatically ignore "process.env" from any keys passed in, so you can write:

```js
//#ifdef LOD_FEATURE_FLAG
```

Instead of:

```js
//#ifdef process.env.LOD_FEATURE_FLAG
```

To keep the parsing really simple, `#ifndef` is not implemented. However, you can prepend a "!" instead.

```ts
//#ifdef !CONDITION
```
