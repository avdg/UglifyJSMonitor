'use strict';

const  fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const url = require("url");

const HTTP_NOT_MODIFIED = 304;

const validateFetchContentSettings = function(options) {
    if (typeof options !== "object") {
        throw Error("No options given");
    }

    if (typeof options.url !== "string") {
        throw Error("No url set");
    }
}

/**
 * Fetches content over http.
 *
 * This implementation includes a way to cache requests to reduce bandwith.
 *
 * Available options:
 *
 * - url (required): The url to fetch the content from
 * - cache: The location of the cache to avoid needless polling
 * - data: Cache meta data storage location.
 *         If cache is set, this will default to cache location.
 *         The file name is the same but with '.data' added to the cache path.
 *
 * @param array options
 *
 * @return Promise If resolved, it will pass the content of that page
 *
 * @throws Error
 */
const fetchContent = function(options) {
    validateFetchContentSettings(options);
    
    options.url = url.parse(options.url);

    if (typeof options.cache === "string" && typeof options.data !== "string") {
        options.data = options.cache + ".data";
    }

    return new Promise(function(done, err) {
        if (typeof options.cache === "string") {
            try {
                let stats = fs.statSync(options.data);
                if (stats.isFile()) {
                    options.status = JSON.parse(
                        fs.readFileSync(options.data, {encoding: "utf8"})
                    );
                }
                if (options.status.etag) {
                    options.url.headers = {"If-None-Match": options.status.etag};
                }
            } catch (e) {
                // Ignore
            }
        }
        let content = "";
        let req = (options.url.protocol.match("^https") ? https : http).get(options.url, (res) => {
            res.on("data", (chunk) => {
                content += chunk;
            });
            res.on("end", () => {
                if (res.statusCode === 304) {
                    content = fs.readFileSync(options.cache, {encoding: "utf8"});
                } else if (typeof options.cache === "string" && res.headers.etag) {
                    let cacheDir = path.dirname(options.cache);
                    let dataDir = path.dirname(options.data);
                    let tmp;
                    try { if (!fs.statSync(cacheDir).isDirectory()) throw Error(); }
                        catch (e) { fs.mkdirSync(cacheDir); }
                    try { if (!fs.statSync(dataDir).isDirectory()) throw Error(); }
                        catch (e) { fs.mkdirSync(dataDir); }
                    fs.writeFileSync(options.cache, content);
                    fs.writeFileSync(options.data, JSON.stringify({
                        etag: res.headers.etag
                    }));
                }
                done(content);
            });
            res.on("error", (e) => {
                err(e);
            });
        });
    });
};

module.exports = {
    fetchContent
};
