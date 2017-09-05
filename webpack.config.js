const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: [path.resolve(__dirname, './src/bundle.ts')],
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'bundle.min.js',
    libraryTarget: 'var',
    library: 'mixer',
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
  module: {
    loaders: [
      {
        test: /\.ts?$/,
        exclude: /node_modules/,
        loaders: ['awesome-typescript-loader'],
      },
    ],
  },
  plugins: [
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: false,
      comments: false,
      mangle: {
        screw_ie8: true,
        keep_fnames: true,
      },
      compress: {
        screw_ie8: true,
      },
    }),
  ],
};
