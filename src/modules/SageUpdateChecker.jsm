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
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Erwan Loisant <eloisant@gmail.com>
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

var EXPORTED_SYMBOLS = ["SageUpdateChecker"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import('resource://gre/modules/PlacesUtils.jsm');
Cu.import("resource://gre/modules/Timer.jsm");

var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
             .getService(Ci.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sage/content/commonfunc.js");

const DELAY = 60 * 60 * 1000; // One hour between each check
const INITIAL_CHECK = 10 * 1000; // Delay the first check to avoid impacting startup performances
const FEED_CHECK_TIMEOUT = 10 * 1000; // Wait up to ten seconds for a feed to load

var SageUpdateChecker = {

  _initialized: false,
  _observers: [],
  checking: false,
  checkList: null,
  httpReq: null,
  lastFeed: null,
  logger: null,
  hasNew: false,

  hist: Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService),
  bmsvc: Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService),
  anno: Cc["@mozilla.org/browser/annotation-service;1"].getService(Ci.nsIAnnotationService),


  /********************************************************
   * Initialization and timer functions
   ********************************************************/

  init: function() {
    if (this._initialized) {
      return;
    }
    
    var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
    this.logger = new Logger();

    this.initialCheck();
    this.startTimer();
    this._initialized = true;
    this.logger.info("update checker intialized");
  },

  initialCheck: function() {
    setTimeout((function () {
      this.startCheck(SageUtils.getSageRootFolderId(), true);
    }).bind(this), INITIAL_CHECK);
  },

  startTimer: function() {
    if (this._timer) {
      return;
    }
    setTimeout((function() {
      this.startCheck(SageUtils.getSageRootFolderId(), true);
      this.resetTimer();
    }).bind(this), DELAY);
  },

  resetTimer: function() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this.startTimer();
  },

  /********************************************************
   * Observers
   ********************************************************/

  addObserver: function(aObserver) {
    this._observers.push(aObserver);
  },

  removeObserver: function(aObserver) {
    this._observers = this._observers.filter(function(x) { return (x == aObserver); });
  },

  notifyObservers: function(aEvent, aValue) {
    var observerService = Cc["@mozilla.org/observer-service;1"]
                          .getService(Ci.nsIObserverService);
    observerService.notifyObservers(null, aEvent, aValue);
  },

  /********************************************************
   * Helpers
   ********************************************************/

  getItemAnnotation: function(aItemId, aName) {
    try {
      return this.anno.getItemAnnotation(aItemId, aName);
    } catch(e) {
      // we could check for existence before, but the try/catch is more efficient
      return null;
    }
  },

  setStatusFlag: function(aItemId, aState) {
    this.logger.info("setting " + SageUtils.ANNO_STATUS + " => " + aState + " on item " + aItemId);
    this.anno.setItemAnnotation(aItemId, SageUtils.ANNO_STATUS, aState, 0, this.anno.EXPIRE_NEVER);
    if (aState == SageUtils.STATUS_UPDATE) {
      this.setHasNew(true);
    }
  },

  queueItems: function uc_queueItems(aResultNode) {
    var itemId = aResultNode.itemId;
    PlacesUtils.livemarks.getLivemark(
      { id: itemId },
      (function(aStatus, aLivemark) {
        var isLivemark = false,
            feedURI;
        if (Components.isSuccessCode(aStatus)) {
          isLivemark = true;
          feedURI = aLivemark.feedURI;
        }
        var itemType = this.bmsvc.getItemType(itemId);
        if (itemType == this.bmsvc.TYPE_BOOKMARK || isLivemark) {
          var url = (isLivemark ? feedURI : this.bmsvc.getBookmarkURI(itemId)).spec;
          var status = this.getItemAnnotation(itemId, SageUtils.ANNO_STATUS);
          if (url && status != SageUtils.STATUS_UPDATE) {
            var feed = {
              id: itemId,
              url: url
            };
            this.checkList.push(feed);
          }
        } else if (itemType == this.bmsvc.TYPE_FOLDER) {
          aResultNode.QueryInterface(Ci.nsINavHistoryContainerResultNode);
          aResultNode.containerOpen = true;
          for (var i = 0; i < aResultNode.childCount; i ++) {
            this.queueItems(aResultNode.getChild(i));
          }
          aResultNode.containerOpen = false;
        }
      }).bind(this));
  },

  setHasNew: function(aValue) {
    if (this.hasNew !== aValue) {
      this.hasNew = aValue;
      this.notifyObservers("sage-hasNewUpdated", this.hasNew);
    }
  },


  /********************************************************
   * Network functions and actually checking
   ********************************************************/

  startCheck: function(aCheckFolderId, nonInteraction) {
    if (this.checking) return;
    this.logger.info("looking for feeds to check");

    var hist = Cc["@mozilla.org/browser/nav-history-service;1"]
               .getService(Ci.nsINavHistoryService);
    var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
                .getService(Ci.nsINavBookmarksService);
    var anno = Cc["@mozilla.org/browser/annotation-service;1"]
               .getService(Ci.nsIAnnotationService);

    var query = hist.getNewQuery();
    var options = hist.getNewQueryOptions();
    query.setFolders([aCheckFolderId], 1);
    var result = hist.executeQuery(query, options);
    this.checkList = [];

    // select feeds to be checked, exclude separators and updated feeds
    this.queueItems(result.root);

    // TODO: handle this properly with a callback from queueItems()
    setTimeout((function() {
      this.logger.info("found " + this.checkList.length + " feed(s) to check");
      if (this.checkList.length > 0) {
        this.checking = true;
        this.check();
      }
    }).bind(this), 1000);
  },

  done: function() {
    if (this.checking) {
      this.httpReq.abort();
      this.setStatusFlag(this.lastFeed.id, SageUtils.STATUS_NO_UPDATE);
    }
  },

  check: function() {
    this.lastFeed = this.checkList.shift();
    var name = this.bmsvc.getItemTitle(this.lastFeed.id);
    var url = this.lastFeed.url;
    
    this.logger.info("checking: " + name);

    if (!url) {
      this.checkResult(false, 0);
    }

    if (this.httpReq) {
      this.httpReq.abort();
    }

    this.httpReq = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                   .createInstance(Ci.nsIXMLHttpRequest);
    this.httpReq.mozBackgroundRequest = true;
    this.httpReq.parent = this;

    this.httpReq.open("GET", url);

    this.httpReq.onload = this.httpLoaded.bind(this);
    this.httpReq.onerror = this.httpError.bind(this);
    this.httpReq.onreadystatechange = this.httpReadyStateChange.bind(this);

    this.logger.debug("fetching: " + url);
    try {
      this.httpReq.setRequestHeader("User-Agent", SageUtils.USER_AGENT);
      //this.httpReq.overrideMimeType("application/xml");
      this.httpReq.send(null);
      this.notifyObservers("sage-nowRefreshing", name);
      this.clearFeedCheckTimer();
      this.feedCheckTimer = setTimeout((function() {
        this.httpReq.abort();
        this.checkResult(false, 0);        
      }).bind(this), FEED_CHECK_TIMEOUT);
    } catch(e) {
        // FAILURE
      this.httpReq.abort();
      this.checkResult(false, 0);
    }
  },

  clearFeedCheckTimer: function() {
    if (this.feedCheckTimer) {
      clearTimeout(this.feedCheckTimer);
      this.feedCheckTimer = null;
    }
  },

  httpError: function(e) {
    this.logger.warn("HTTP Error: " + e.target.status + " - " + e.target.statusText);
    this.httpReq.abort();
    this.checkResult(false, 0);
    this.clearFeedCheckTimer();
  },

  httpReadyStateChange: function() {
    if (this.httpReq.readyState == 2) {
      try {
        this.httpReq.status;
      } catch(e) {
          // URL NOT AVAILABLE
        this.httpReq.abort();
        this.checkResult(false, 0);
        this.clearFeedCheckTimer();
      }
    }
  },

  httpLoaded: function(e) {
    this.clearFeedCheckTimer();
    var FeedParserFactory = new Components.Constructor("@sage.mozdev.org/sage/feedparserfactory;1", "sageIFeedParserFactory");
    var feedParserFactory = new FeedParserFactory();
    var feedParser = feedParserFactory.createFeedParser(this.httpReq.responseText);
    var feed = feedParser.parse(this.httpReq.responseText, this.httpReq.channel.originalURI, this);
  },
  
  // sageIFeedParserListener
  onFeedParsed: function(feed) {
    if (feed) {
      feed.setFeedURI(this.httpReq.channel.originalURI.spec);
      var lastModified = 0;
      if (feed.hasLastPubDate()) {
        lastModified = feed.getLastPubDate();
      }
      this.checkResult(true, lastModified, feed);
    } else {
      this.checkResult(false);
    }
  },

  checkResult: function(aSucceed, aLastModified, feed) {
    var name = this.bmsvc.getItemTitle(this.lastFeed.id);
    var status = 0;

    if (aSucceed) {
      var lastVisit = this.getItemAnnotation(this.lastFeed.id, SageUtils.ANNO_LASTVISIT);
      var sig = this.getItemAnnotation(this.lastFeed.id, SageUtils.ANNO_SIG);

      if (aLastModified && lastVisit && sig) {
        if ((aLastModified > lastVisit) && (sig != feed.getSignature())) {
          status = SageUtils.STATUS_UPDATE;
          this.setHasNew(true);
        } else {
          status = SageUtils.STATUS_NO_UPDATE;
        }
      } else if (aLastModified && lastVisit) {
        if (aLastModified > lastVisit) {
          status = SageUtils.STATUS_UPDATE;
        } else {
          status = SageUtils.STATUS_NO_UPDATE;
        }
      } else if (sig) {
        if (sig != feed.getSignature()) {
          status = SageUtils.STATUS_UPDATE;
        } else {
          status = SageUtils.STATUS_NO_UPDATE;
        }
      } else {
        status = SageUtils.STATUS_UPDATE;
      }
    } else {
      status = SageUtils.STATUS_ERROR;
    }

    this.setStatusFlag(this.lastFeed.id, status);
    
    if (this.checkList.length == 0) {
      this.checking = false;
      this.notifyObservers("sage-nowRefreshing", "");
      return;
    } else {
      this.check();
    }
  }
};
