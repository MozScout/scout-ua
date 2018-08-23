class Utils {
  UrlToFile(url) {
    return url.substr(url.lastIndexOf('/') + 1);
  }
}

module.exports = Utils;
