var path = require('path');
var fs = require('graceful-fs');
var loaderUtils = require('loader-utils');
var Promise = require('bluebird');
var JsonDB = require('node-json-db').JsonDB;
var JsonDBConfig = require('node-json-db/dist/lib/JsonDBConfig').Config;

var readFileAsync = Promise.promisify(fs.readFile);

var CACHE_FILENAME = '.tileset-cache';
var tilesetCache;

module.exports = function (cacheable, config, frames, name, cachePath) {
  return new Promise(function (resolve) {
    if (!cacheable) {
      return resolve(false);
    }

    var cacheFile = path.join(cachePath, CACHE_FILENAME);
    var tilesetPath = path.join(cachePath, name);
    var cacheKey = path.join('/', name);

    // If images or json files in output directory not exist，cache cannot enable
    if (!fs.existsSync(`${tilesetPath}.png`) || !fs.existsSync(`${tilesetPath}.json`)) {
      return resolve(false);
    }

    // Read tilesetCache as global
    if (!tilesetCache) {
      tilesetCache = new JsonDB(new JsonDBConfig(cacheFile, true, false));
    }

    var cachedHash = '';
    var cacheEmpty = false;

    try {
      cachedHash = tilesetCache.getData(cacheKey);
    } catch (e) {
      cacheEmpty = true;
    }

    if (cacheEmpty) resolve(false);

    const tilesetHash = loaderUtils.getHashDigest(JSON.stringify(config));

    Promise.all(frames.map(function (frame) {
      return readFileAsync(frame.path);
    })).then(function(results) {
      frames.forEach(function (frame, index) {
        frame.content = results[index];
        frame.hash = loaderUtils.getHashDigest(frame.content);
      });

      var framesHash = frames.map(function (frame) {
        return `${frame.name}:${frame.hash}`;
      }).join();

      var jointHash = `${tilesetHash}|${framesHash}`;

      if (!cacheEmpty) resolve(jointHash === cachedHash);

      tilesetCache.push(cacheKey, jointHash);
    });
  });
};
