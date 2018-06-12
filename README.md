# pixi-tileset-loader
Webpack loader for generating tilesets for PIXI.js

## Install
`npm install pixi-tileset-loader -D`

## Usage
1. Add a `.tileset` (or other filename) file in frames directory
```bash
animation
├── .tileset
├── 001.png
├── 002.png
└── 003.png
```
2. See [Image processing params](#image-processing-params) to configure `.tileset` in `YAML` format
```yaml
skip: 1
colors: 16
scale: 0.5
```
3. Add `pixi-tileset-loader` in `webpack.config.js`:
```javascript
module.export = {
  // statements
  module: {
    loaders: [
      {
        test: /\.tileset/i,
        loader: 'pixi-tileset-loader',
        query: {
          output: 'game/images',
          image: { // url-loader for PNG file
            name: 'resources/[name].[ext]',
            limit: 4096
          },
          json: { // url-loader for JSON file
            name: 'resources/[name].[ext]',
            limit: 1
          }
        }
      }
    ]
  },
  output: {
    path: path.resovle('dist')
  }
};
```
4. `import` or `require` the `.tileset` file in your module
```javascript
import tilesetAnimationJSON from './frames/animation/.tileset';
// Will get a JSON file path in return，and the image path will be replaced with resources/[name].[ext] in JSON file
```

## Processing
1. Frames trimming：to specify a `skip` option to perform an *N to 1* frame trimming
2. Spritesheet：genarate PNG and JSON files using [spritesheet.js](https://github.com/krzysztof-o/spritesheet.js)
3. Image optimizing：use [node-pngquant](https://github.com/papandreou/node-pngquant) to reduce colors amount of PNG image
4. Write the PNG and JSON files into `game/images` directory (specified by `query.output`)
```bash
game
├── frames
│   ├── animation # the frames directory
│   │   ├── .tileset
│   │   ├── 001.png
│   │   ├── 002.png
│   │   └── 003.png
├── images # the directory to cache the PNG and JSON file
│   ├── tileset-animation.json
│   └── tileset-animation.png
└── resources.js
```
5. Build PNG and JSON files in `game/images` directory into `dist/resources` (specified by `output.path` in webpack config) by [url-loader](https://github.com/webpack-contrib/url-loader). This will replace `meta.image` in JSON with `output.publicPath` or `base64` (it depends on `query.image`)
```bash
dist
└── resources
    ├── tileset-animation.json
    └── tileset-animation.png
```

## System dependencies
First to ensure these packages installed in system:
+ [ImageMagick](https://www.imagemagick.org/script/download.php): `identify` and `convert` command are required to get image information and resize image
+ [pngquant](https://pngquant.org/)：`pngquant` command is required to reduce colors of PNG image


## Options
+ `query.output`: the directory to cache PNG and JSON file, we recommend specifying a source code directory and commit this directory as well. The cache will be disabled when specified as empty string.
+ `query.loader`: use `url-loader`, `json-loader` to process JSON file, or not process. Default is `url`, `json` and `none` are optional.
+ `query.process`: to process frames or not. It will directly read JSON and PNG cache from the directory where `output` option specified to perform the build when `false`
+ `query.image`: [url-loader](https://github.com/webpack-contrib/url-loader) webpack loader options for PNG file
+ `query.json`: [url-loader](https://github.com/webpack-contrib/url-loader) webpack loader options for JSON file. Not required when `query.loader` specified as `json`
+ `query.verbose`: log the entire error stack or not, default is `false`

> When `query.process` is specified `false`, the first 4 steps of [processing](#Processing) will be ignored, PNG and JSON cache will be directly read from the directory `query.output` specified, and webpack will emit these files via [url-loader](https://github.com/webpack-contrib/url-loader) , but a **webpack warning** will be emitted as well. This ensure the build in remote server, where ImageMagick or pngquant package is missing.

## Image processing params
+ `trim`：trim the whitespace in PNG image or not, default is `false`
+ `scale`: scale factor, based on [imagemagick-stream](https://github.com/eivindfjeldstad/imagemagick-stream) to reduce the size of PNG image, default is `1`
+ `padding`: padding in the spritesheet, default is `10`
+ `skip`：ignore *N* frames in every *N + 1* frames, default is `0`
+ `colors`：colors amount for pngquant, default is `0`
+ `files`: file paths in `[path]-[name]` format, frames will be read from the directory `files` specified instead of the directory where `.tileset` is in
+ `excludes`: the file paths to exclude
+ `interpolate`: string template to specify the prefix, such as `$name$-tileset` and `tileset`

`files` specifies the paths relative to the directory where `.tileset` is in, for example:
```yaml
files:
  ../animation-a/001.png: animation-a
  ../animation-b/001.png: animation-b
  ../animation-c/001.png: animation-c
```
