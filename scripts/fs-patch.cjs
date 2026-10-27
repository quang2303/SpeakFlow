const fs = require("fs");

// Windows exFAT / non-NTFS drives throw EISDIR instead of EINVAL when calling readlink on regular files.
// Converting EISDIR to EINVAL allows Webpack & Next.js to work seamlessly on exFAT drives.
const origReadlink = fs.readlink;
fs.readlink = function (path, options, callback) {
  const cb = typeof options === "function" ? options : callback;
  const opts = typeof options === "function" ? undefined : options;
  return origReadlink.call(fs, path, opts, (err, linkString) => {
    if (err && (err.code === "EISDIR" || err.code === "EPERM")) {
      err.code = "EINVAL";
    }
    if (cb) cb(err, linkString);
  });
};

const origReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path, options) {
  try {
    return origReadlinkSync.call(fs, path, options);
  } catch (err) {
    if (err && (err.code === "EISDIR" || err.code === "EPERM")) {
      err.code = "EINVAL";
    }
    throw err;
  }
};

if (fs.promises && fs.promises.readlink) {
  const origPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = async function (path, options) {
    try {
      return await origPromisesReadlink.call(fs.promises, path, options);
    } catch (err) {
      if (err && (err.code === "EISDIR" || err.code === "EPERM")) {
        err.code = "EINVAL";
      }
      throw err;
    }
  };
}
