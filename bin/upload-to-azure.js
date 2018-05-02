#!/usr/bin/env node

const webpack = require('webpack');
const { execSync } = require('child_process');
const wpconfig = require('../webpack.config');
const { version } = require('../package.json');

const [major, minor] = version.split('.');
const blobVersion = process.argv[2] || `v${major}.${minor}`;

console.log(` → Compiling library ${blobVersion}`);
webpack(wpconfig, err => {
  if (err) {
    console.error(err);
    return process.exit(1);
  }

  console.log(' ✔ Compiled library');

  console.log(' → Upload to Azure');
  execSync(
    [
      'az storage blob upload',
      '--content-type "text/javascript; charset=utf-8"',
      '-c lib',
      '-f ../dist/bundle.min.js',
      `-n std-mobile-app9-${blobVersion}.js`,
    ].join(' '),
    {
      cwd: __dirname,
      env: process.env,
    },
  );
  console.log(' → Uploaded to Azure');
});
