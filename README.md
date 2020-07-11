# pixi-tileset-loader
Webpack loader for generating tilesets for PIXI.js

## Install
`npm install pixi-tileset-loader -D`

## Usage
1. Add a `.tileset` (or other filename) file in frames source directory
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
{
  test: /\.tileset/i,
  use: [
    {
      loader: 'pixi-tileset-loader',
      // type: 'json',
      options: {
        process: true,
        mode: 'file',
        // cacheable: true,
        output: './output',
        name: '[name]_[hash:6].[ext]',
        limit: false,
        outputPath: 'res',
        publicPath: './'
        // image: {
        //   outputPath: 'res',
        //   publicPath: './'
        // },
        // json: {
        //   outputPath: 'res',
        //   publicPath: './res'
        // }
      }
    }
  ]
}
```
4. `import` or `require` the `.tileset` in your module
```javascript
import tilesetAnimationJSON from './animation/.tileset';
// Will get a JSON file path or JSON object in return，and the image path will be replaced in JSON
```

## Processing
1. Read from cache where storing content hash to confirm weather *frames* and *tileset* are changed or not
2. Spritesheet：genarate image and JSON files using [spritesheet.js](https://github.com/krzysztof-o/spritesheet.js)
3. Image optimizing：use [node-pngquant](https://github.com/papandreou/node-pngquant) to reduce colors amount of PNG image
4. Write the image and JSON files into `options.output` directory
5. Build image and JSON files in `options.output` directory into `options.outputPath` directory by [url-loader](https://github.com/webpack-contrib/url-loader). This will replace `meta.image` in JSON with interpolated url or `base64`
```bash
example
└── resources
│   ├── animation # where source images are stored
│   │   ├── .tileset
│   │   ├── 001.png
│   │   ├── 002.png
│   │   └── 003.png
│   └── index.js
├── output # where image and JSON file are stored after process
│   ├── tileset-animation.json
│   └── tileset-animation.png
└── dist # final built result
    ├── main.js
    └── res
        ├── tileset-animation_1512a1.json
        └── tileset-animation_eee48e.png
```

## System dependencies
First to ensure these packages installed in system:
+ [ImageMagick](https://www.imagemagick.org/script/download.php): `identify` and `convert` command are required to get image information and resize image
+ [pngquant](https://pngquant.org/)：`pngquant` command is required to reduce colors of PNG image

## Options
+ `options.output`: the directory to cache image and JSON file, we recommend specifying a source code directory and commit this directory as well
+ `options.mode`: how webpack will build tileset JSON. `file` by default to generate JSON file; `inline` to generate JSON module source code; `none` to do nothing
+ `options.process`: to process frames or not. When specified `false`, it will directly read image and JSON from the cache directory where `output` option specified to perform the build
+ `options.cacheable`: cache process result or not. `false` by default, `true` to read image and JSON files cached before in `options.output` directory, if source *frames* and *tileset* file are not changed
+ `options.name`: [url-loader](https://github.com/webpack-contrib/url-loader) `name` option for image and JSON files
+ `options.outputPath`: [url-loader](https://github.com/webpack-contrib/url-loader) `outputPath` option for image and JSON files
+ `options.publicPath`: [url-loader](https://github.com/webpack-contrib/url-loader) `publicPath` option for image and JSON files
+ `options.image`: [url-loader](https://github.com/webpack-contrib/url-loader) webpack loader options for image file
+ `options.json`: [url-loader](https://github.com/webpack-contrib/url-loader) webpack loader options for JSON file. Not required when `options.mode` specified as `inline`
+ `options.verbose`: log the entire error stack or not, `false` by default

> + The option specified in `options` will be overwrite by the same option specified in `options.image` or `options.json`
> + When `options.process` is specified `false`, the 1 - 4 steps of [processing](#Processing) will be skipped, image and JSON file will be directly read from the cache directory `query.output` specified, and webpack will emit these files via [url-loader](https://github.com/webpack-contrib/url-loader) , but a **webpack warning** will be emitted as well. This ensure building in remote server, where ImageMagick or pngquant package is missing
> + We recommend to specify `options.cacheable` as `true` to improve webpack building performance, by skipping 2 - 4 steps of [processing](#Processing) frames, and avoid unwanted image and JSON file change due to different system environment(e.g. different version of `ImageMagick`) when source frames and tileset file are not changed
> + `options.resource` can be specified e.g. `'window.baseRoot + "$url"'`, `baseRoot` is a path similar to `/path/to/image`. It is useful to dynamically concat image path when running in browser

## Image processing params
+ `trim`：trim the whitespace in frames or not, default is `false`
+ `scale`: scale factor, based on [imagemagick-stream](https://github.com/eivindfjeldstad/imagemagick-stream) to reduce the size of PNG image, default is `1`
+ `padding`: padding in the spritesheet, default is `10`
+ `skip`：ignore *N* frames in every *N + 1* frames, default is `0`
+ `colors`：colors amount for pngquant, default is `0` for none color amount reducing
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
