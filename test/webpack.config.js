const webpack = require('webpack');
const path = require('path');

module.exports = (() => {
  const config = {};

  config.devtool = 'cheap-module-eval-source-map';

  config.resolve = {
    extensions: ['.ts', '.js', '.json'],
  };

  config.module = {
    loaders: [
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader',
        query: {
          useForkChecker: true,
        },
      },
      {
        test: /\.json$/,
        loader: 'json-loader',
      },
    ],
  };

  return config;
})();
