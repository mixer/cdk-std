const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

let target;

exports.onHandleContent = ev => {
  ev.data.content = ev.data.content.replace(/(import .*?<a href=".*?">).*<\/a>/g, '$1@mixer/cdk</a>')
};

exports.onHandleConfig = ev => {
  target = path.join(process.cwd(), ev.data.config.destination);
};

exports.onComplete = () => {
  const $ = cheerio.load(fs.readFileSync(path.join(target, 'identifiers.html'), 'utf-8'));

  // Remove typedefs and classes (non-entry-points)
  $('.summary .kind-typedef').closest('tr').remove();
  $('.summary .kind-class').closest('tr').remove();

  // Remove the extra bundle dir.
  $('#bundle').closest('[data-ice="dirSummaryWrap"]').remove();

  // Update the title.
  $('.content > h1').text('Cdk-std Reference');

  fs.writeFileSync(path.join(target, 'simple-ref.html'), $.html());
};
