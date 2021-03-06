var metajs = require("./metajs_node"),
    program = require("commander"),
    path = require("path"),
    fs = require("fs");

var vm = require("vm"),
    readline = require("readline"),
    util = require("util");

var createContext = (function(filename) {
  var context = vm.createContext();
  if ((typeof(path) !== "undefined")) {
    module.filename = filename;
  } else {
    module.filename = "<repl>";
  }
  context.module = module;
  context.require = require;
  Object.keys(global).forEach((function(key) {
    (context)[key] = (global)[key];
  }));
  return context;
});

var startRepl = (function() {
  var input = process.stdin,
    output = process.stdout,
    rl = readline.createInterface(input, output),
    buf = "",
    context = createContext();
  var prompt = (function() {
    rl.setPrompt((function() {
      if ((buf.length === 0)) {
        return "metajs> ";
      } else {
        return "> ";
      }
    })());
    return rl.prompt();
  });
  var processLine = (function(line) {
    (function() {
      try {
        buf = (buf + line);
        (rl.history)[0] = buf;
        var jsStr = metajs.translate(buf),
    res = vm.runInContext(jsStr, context, "metajs-tepl");
        if ((typeof(res) !== "undefined")) {
          output.write((util.inspect(res) + "\n"));
        }
        (context)["_"] = res;
        buf = "";
      } catch (e) {
        if (e.message.match(/Missed closing bracket/)) {
          buf = (buf + " ");
          return rl.history.shift();
        } else {
          (rl.history)[0] = buf;
          output.write((e.stack + "\n"));
          buf = "";
        }
      }
    })();
    return prompt();
  });
  rl.on("line", processLine);
  rl.on("close", (function() {
    output.write("Bye!\n");
    return process.exit(0);
  }));
  output.write((metajs.versionString() + " TEPL (Translate Eval Print Loop)\n"));
  return prompt();
});


program.usage("[options] [file.mjs ...]").version(metajs.versionString()).option("-x, --execute", "Execute a MetaJS file.").option("-e, --eval <code>", "Eval MetaJS code.").option("-o, --output <dir>", "Output directory for translated files.").option("-b, --bootstrap", "Enable bootstrap mode (required for compiling MetaJS compiler only).").parse(process.argv);

var evalJs = (function(js, filename) {
  return vm.runInContext(js, createContext(filename), filename);
});

var outputJs = (function(sourcePath, jsStr) {
  var bn = path.basename(sourcePath, ".mjs"),
    outPath = (path.join(program.output, bn) + ".js");
  return fs.writeFile(outPath, jsStr);
});

var processFiles = (function(fnames) {
  return fnames.forEach((function(fname) {
    var sourcePath = path.join(process.cwd(), fname),
    jsStr = metajs.translateFile(sourcePath);
    if (program.output) {
      return outputJs(sourcePath, jsStr);
    } else if (program.execute) {
      return evalJs(jsStr, sourcePath);
    } else {
      return console.log(jsStr);
    }
  }));
});

metajs.bootstrapMode = program.bootstrap;

if (program.eval) {
  console.log(evalJs(metajs.translate(program.eval)));
} else if ((program.args.length === 0)) {
  startRepl();
} else {
  processFiles(program.args);
}

