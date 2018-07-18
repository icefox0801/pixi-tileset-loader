var path = require('path');
var fs = require('graceful-fs');
var fse = require('fs-extra');
var yaml = require('yaml-js');
var tempfile = require('tempfile');
var loaderUtils = require('loader-utils');
var Promise = require('bluebird');

var BinPacking = require('./lib/BinPacking');
var FramesPacker = require('./lib/FramesPacker');
var preprocessAsync = require('./lib/preprocessAsync');
var getImageSizeAsync = require('./lib/getImageSizeAsync');
var spritesheetAsync = require('./lib/spritesheetAsync');
var pngOptimizeAsync = require('./lib/pngOptimizeAsync');

var urlLoader = require('url-loader');
var jsonLoader = require('json-loader');

function rewriteJSON (content, imagePathStr, loader) {
  var sheetConfig = JSON.parse(content);
  var imagePath = /"([^"]+)"/.exec(imagePathStr)[1];
  sheetConfig.meta.image = imagePath;

  if (loader === 'json') {
    sheetConfig.meta.json = `${imagePath.substr(0, imagePath.lastIndexOf('.png')) || imagePath}.json`;
  }

  return JSON.stringify(sheetConfig);
}

function buildFiles (context, query, options = {}, name) {
  var content = '';
  if (query.loader === 'none') {
    return content;
  }
  // build image
  var imageFullPath = path.resolve(query.output, `${name}.png`);
  var imageContent = fs.readFileSync(imageFullPath);
  var imageContext = Object.create(context);
  imageContext.resourcePath = imageFullPath;
  imageContext.query = query.image;
  imageContext.options = options;
  var imagePathStr = urlLoader.call(imageContext, imageContent);
  // build json
  var jsonFullPath = path.resolve(query.output, `${name}.json`);
  var jsonStr = fs.readFileSync(jsonFullPath);
  var jsonContent = rewriteJSON(jsonStr, imagePathStr, query.loader);
  var jsonContext = Object.create(context);
  jsonContext.resourcePath = jsonFullPath;
  jsonContext.query = query.json;
  jsonContext.options = options;

  if (query.loader === 'json') {
    content = jsonLoader.call(jsonContext, jsonContent);
  } else {
    content = urlLoader.call(jsonContext, jsonContent);
  }

  return content;
}

module.exports = function (content) {
  var self = this;
  var callback = self.async();
  var query = loaderUtils.getOptions(self) || {};
  var config = yaml.load(content.toString()) || {};
  var framesPacker = new FramesPacker(self.context, config);
  var inputTemp = tempfile();
  var outputTemp = tempfile();

  query.process = typeof query.process === 'undefined' ? true : query.process;
  query.output = query.output || inputTemp;

  self.cacheable(true);
  self.addContextDependency(self.context);

  if (config.files) {
    Object.keys(config.files).forEach(function (filePath) {
      var fullPath = path.resolve(self.context, filePath);
      self.addDependency(fullPath);
    });
  }

  if (!query.process) {
    var result = '';
    var imageFullPath = path.resolve(query.output, `${framesPacker.output}.png`);
    if (!fs.existsSync(imageFullPath)) {
      self.emitError(`${framesPacker.output}.json and ${framesPacker.output}.png are not found in the directory ouput option specified when process option is disabled, please ensure these files were built into this directory in the last build.`);
    } else {
      self.emitWarning(`Image processing will not execute when process option is disabled. ${framesPacker.output}.json and ${framesPacker.output}.png will be read from the directory ouput option specified.`);
      result = buildFiles(self, query, self.options, framesPacker.output);
    }

    process.nextTick(function () {
      fse.remove(inputTemp);
      fse.remove(outputTemp);
    });

    return callback(null, result);
  }

  framesPacker.initFrames();
  framesPacker.compressFrames();

  preprocessAsync(framesPacker.frames, inputTemp, framesPacker.config)
    .then(function (compressdFrames) {
      return getImageSizeAsync(compressdFrames, framesPacker.config);
    })
    .then(function (sizedFrames) {
      var binPacking = new BinPacking(framesPacker.output, sizedFrames, {
        rotatable: framesPacker.config.rotatable,
        algorithm: 'max-rects'
      });
      binPacking.pack();
      var packedFrames = binPacking.packed;
      var canvasSize = {
        width: binPacking.canvasWidth,
        height: binPacking.canvasHeight
      };
      var outputPath = path.join(outputTemp, `${framesPacker.output}`);
      fse.ensureDirSync(outputTemp);
      return spritesheetAsync(packedFrames, canvasSize, outputPath, framesPacker.config);
    })
    .then(function (sourcePath) {
      var destPath = path.resolve(path.join(query.output, framesPacker.output));
      return Promise.all([
        pngOptimizeAsync(`${sourcePath}.png`, `${destPath}.png`, framesPacker.config.colors),
        fse.copy(`${sourcePath}.json`, `${destPath}.json`)
      ]);
    })
    .then(function () {
      var content = buildFiles(self, query, self.options, framesPacker.output);
      process.nextTick(function () {
        fse.remove(inputTemp);
        fse.remove(outputTemp);
      });
      callback(null, content);
    })
    .catch(function (error) {
      if (query.verbose) {
        console.error(error);
      }

      if (query.process) {
        self.emitError(`Error occured in image processing, ImageMagick or pngquant may not be correctly installed or specified in operating system. See https://github.com/icefox0801/pixi-tileset-loader#system-dependencies for more information.`);
      }

      var content = buildFiles(self, query, self.options, framesPacker.output);
      process.nextTick(function () {
        fse.remove(inputTemp);
        fse.remove(outputTemp);
      });
      callback(null, content);
    });
};

module.exports.raw = true;
