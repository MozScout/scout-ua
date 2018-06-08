const Database = require('../data/database');
const database = new Database();
const url = require('url');
const getFavicons = require('get-website-favicon');
const scrape = require('html-metadata');

class HostnameHelper {
  constructor() {
    this.clearCurrentRequests();
  }

  clearCurrentRequests() {
    this.currentRequests = { all: {}, favicon: {}, publisher: {} };
  }

  getHostname(link) {
    return url.parse(link).hostname.replace('www.', '');
  }

  async fetchAndStoreHostnameData(link, type = 'all') {
    let hostname = this.getHostname(link);
    let self = this;
    if (!self.currentRequests[type][hostname]) {
      console.log(`Fetching ${type} data for ${hostname}`);
      let faviconPromise;
      let metadataPromise;
      let faviconError = false;
      let metadataError = false;
      if (type == 'all' || type == 'favicon') {
        faviconPromise = getFavicons(link).catch(function(err) {
          console.log(
            `Error occured during HostnameHelper Favicon promise calls: ${
              err.status
            }, ${err.name}. Domain: ${hostname}`
          );
          faviconError = true;
        });
      }
      if (type == 'all' || type == 'publisher') {
        metadataPromise = scrape(link).catch(function(err) {
          console.log(
            `Error occured during HostnameHelper Metadata promise calls: ${
              err.status
            }, ${err.name}. Domain: ${hostname}`
          );
          metadataError = true;
        });
      }

      self.currentRequests[type][hostname] = Promise.all([
        faviconPromise,
        metadataPromise
      ])
        .then(function(values) {
          let publisherName = metadataError ? 'error' : '';
          let iconUrl = faviconError ? 'error' : '';

          if (
            values[0] &&
            values[0].icons &&
            values[0].icons[0] &&
            values[0].icons[0].src
          ) {
            iconUrl = values[0].icons[0].src;
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
          }

          return self
            .storeHostnameData(link, iconUrl, publisherName)
            .then(function(values) {
              if (self.currentRequests[type][hostname]) {
                delete self.currentRequests[type][hostname];
              }
              return values;
            });
        })
        .catch(function(err) {
          console.log(
            `Error occured during HostnameHelper promise calls. Error: ${
              err.status
            }, ${err.name}`
          );
        });
    }
    return self.currentRequests[type][hostname];
  }

  async getHostnameData(link, type = 'all') {
    let hostname = this.getHostname(link);
    let data = await database.getHostnameData(hostname);
    let expireDate = new Date();
    // Set the expire_date to 30 days ago
    expireDate.setDate(expireDate.getDate() - 30);

    // if there is no data or if the date is expired for the type, fetch data
    if (
      (data &&
        ((type == 'favicon' &&
          new Date(data.favicon_updated_on) < expireDate) ||
          (type == 'publisher' &&
            new Date(data.publisher_updated_on) < expireDate) ||
          (type == 'all' &&
            (new Date(data.publisher_updated_on) < expireDate ||
              new Date(data.favicon_updated_on) < expireDate)))) ||
      !data
    ) {
      data = await this.fetchAndStoreHostnameData(link, type);
    }

    switch (type) {
      case 'favicon':
        return data.favicon_url;
      case 'publisher':
        return data.publisher_name;
      case 'all':
        return data;
    }
  }

  async storeHostnameData(link, faviconUrl, name) {
    let hostname = this.getHostname(link);
    return await database.storeHostnameData(hostname, faviconUrl, name);
  }
}

module.exports = HostnameHelper;
