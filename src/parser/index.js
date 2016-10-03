import util from 'util';
import parsers from './parsers';

export default function parse(url, lang) {
  if (!lang) {
    throw new Error('The second argument (lang) is required!');
  }

  // find a suitable parser
  const parser = parsers.find(p => url.match(p.pattern));

  if (parser) {
    return parser.parse(url, lang);
  }

  return Promise.reject('there is no parser for ' + url);
}

if (!module.parent) {
  parse(process.argv[2], process.argv[3] || 'fi')
  .then(r => console.log(util.inspect(r, null, null)))
  .catch(err => console.error(err));
}
