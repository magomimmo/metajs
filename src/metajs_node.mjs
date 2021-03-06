(def metajs exports
  util (require 'util)
  path (require 'path)
  fs (require 'fs)
  sys (require 'sys)
  inspect  util.inspect)

(defn pr (x)
  (sys.print x))

(include "./core")

(set-in metajs
        'dir  (process.cwd)
        'pr pr)

(defn metajs.remove-script-header (data)
  (data.replace /^#!.*\n/ ""))

(defn metajs.include (file)
  (when (not (file.match /\.(mjs|json)$/))
    (set file (str file ".mjs")))
  (when (file.match (regex "^\\./"))
    (set file (str metajs.dir "/" file)))
  (metajs.translate-file (require.resolve file)))

(defmacro include (file)
  (with-meta {virtual: true}
    (cdata (metajs.include (eval-expr file)))))

(defn with-dir-and-file (dir file func)
  (def scope (get-scope))
  (rebind (metajs.dir dir metajs.file file scope.source file)
          (func)))

(defn metajs.translate-file (file-name)
  ;; (log "translate-file" file-name)
  (with-dir-and-file (path.dirname file-name)
    file-name
    (fn ()
      (metajs.translate
       (metajs.remove-script-header
        (fs.read-file-sync file-name "utf8"))))))

(defn metajs.version-string ()
  (let package metajs.package-json
       (str package.name " " package.version)))

(set metajs.package-json (include "../package.json"))

