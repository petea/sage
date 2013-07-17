/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Sage.
 *
 * The Initial Developer of the Original Code is
 * Peter Andrews <petea@jhu.edu>.
 * Portions created by the Initial Developer are Copyright (C) 2013
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Peter Andrews <petea@jhu.edu>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS = ["SageMetrics"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sage/content/commonfunc.js");

var SageMetrics = {

  TID: null,
  GA_URL: "http://www.google-analytics.com/collect",

  _initialized: false,
  _uuid: null,
  _locale: null,

  init: function() {
    if (this._initialized) {
      return;
    }
    
    var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
    this.logger = new Logger();

    var uuid = SageUtils.getSagePrefValue(SageUtils.PREF_UUID);
    if (!uuid) {
      var uuidGenerator = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);
      uuid = uuidGenerator.generateUUID().toString();
      SageUtils.setSagePrefValue(SageUtils.PREF_UUID, uuid);
      this.logger.debug("generated uuid: " + uuid);
    }
    this.logger.debug("using uuid: " + uuid);
    this._uuid = uuid;

    try {
      this._locale = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService)
        .getDefaultBranch("general.useragent.")
        .getCharPref("locale");
    } catch (e) {
      this.logger.error("Could not find default locale");
    }

    this._initialized = true;
    this.logger.info("metrics intialized");
  },

  view: function(path) {
    this._sendData({
      t: "pageview",
      dp: path
    });
  },

  event: function(category, action, options) {
    var params = {
      t: "event",
      ec: category,
      ea: action
    };
    if (options) {
      if (options["label"]) {
        params["el"] = options["label"];
      }
      if (options["value"]) {
        params["ev"] = options["value"];
      }
      if (options["nonInteraction"]) {
        params["ni"] = "1";
      }
      if (options["newInstall"]) {
        // convert ISO 8601 format to YYYYMMDDHHMMSS
        params["cd2"] = (new Date()).toISOString().replace(/(([-:TZ]?)|(\.[0-9]{3,3}))?/g, "");
      }
    }
    this._sendData(params);
  },

  _sendData: function(params) {
    if (!this.TID) {
      return;
    }
    var finalParams = {
      v: "1",
      tid: this.TID,
      cid: this._uuid,
      cd1: SageUtils.VERSION,
      ul: this._locale
    };
    Object.keys(params).forEach(function(key) {
      finalParams[key] = params[key];
    });
    
    request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
    request.mozBackgroundRequest = true;
    request.parent = this;

    request.open("POST", this.GA_URL);

    request.onload = (function() {
      this.logger.debug('metrics sent');
    }).bind(this);
    request.onerror = (function() {
      this.logger.debug('metrics request failed');
    }).bind(this);;

    var payload = Object.keys(finalParams)
          .map(function(key) {
            return encodeURIComponent(key) + "=" + encodeURIComponent(finalParams[key]);
          })
          .join("&");

    this.logger.debug("sending metrics: " + finalParams.toSource());
    try {
      request.send(payload);
    } catch(e) {
      request.abort();
    }
  }

};
