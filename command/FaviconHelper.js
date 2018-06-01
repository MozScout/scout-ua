const Database = require('../data/database');
const database = new Database();
const url = require('url');
const getFavicons = require('get-website-favicon');
const scrape = require('html-metadata');

class FaviconHelper {
  constructor() {
    this.currentRequests = {};
  }

  clearCurrentRequests() {
    this.currentRequests = {};
  }

  getHostname(link) {
    return url.parse(link).hostname.replace('www.', '');
  }

  async getWebsiteFavicon(link) {
    let hostname = this.getHostname(link);
    let data = await database.getWebsiteFavicon(hostname);
    let expire_date = new Date();
    // Set the expire_date to 30 days ago
    expire_date.setDate(expire_date.getDate() - 30);

    if (data && new Date(data.updated_on) > expire_date) {
      return data;
    } else {
      let self = this;
      if (!self.currentRequests[hostname]) {
        let faviconPromise = getFavicons(link);
        let metadataPromise = scrape(link);
        self.currentRequests[hostname] = Promise.all([
          faviconPromise,
          metadataPromise
        ])
          .then(function(values) {
            let publisherName = '';
            let icon_url = '';

            if (
              values[0] &&
              values[0].icons &&
              values[0].icons[0] &&
              values[0].icons[0].src
            ) {
              icon_url = values[0].icons[0].src;
            }

            // Picks by order of priority
            // jsonLd name > openGraph publisher > hostname
            if (
              values[1] &&
              values[1].jsonLd &&
              values[1].jsonLd.publisher &&
              values[1].jsonLd.publisher.name
            ) {
              publisherName = values[1].jsonLd.publisher.name;
            } else if (
              values[1] &&
              values[1].openGraph &&
              values[1].openGraph.site_name
            ) {
              publisherName = values[1].openGraph.site_name;
            } else {
              publisherName = self.getHostname(link);
            }

            return self.storeWebsiteFavicon(link, icon_url, publisherName);
          })
          .catch(function() {
            console.log('Error occured during Favicon Promise calls.');
          });
      }
      return self.currentRequests[hostname];
    }
  }

  async storeWebsiteFavicon(link, favicon_url, name) {
    let hostname = this.getHostname(link);
    return await database.storeWebsiteFavicon(hostname, favicon_url, name);
  }
}

module.exports = FaviconHelper;
