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

var Cc = Components.classes;
var Ci = Components.interfaces;

var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
             .getService(Ci.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sage/content/commonfunc.js");

var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
logger = new Logger();

const DELAY = 3600 * 1000; // One hour between each check
const INITIAL_CHECK = 10 * 1000; // Delay the first check to avoid impacting startup performances

var SageUpdateChecker = {

  _initialized: false,
  _observers: [],
  checking: false,
  checkList: null,
  httpReq: null,
  lastItemId: -1,
  logger: null,
  livemarkService: null,
  hasNew: false,

  hist: Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService),
  bmsvc: Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService),
  anno: Cc["@mozilla.org/browser/annotation-service;1"].getService(Ci.nsIAnnotationService),
  livemarkService: Cc["@mozilla.org/browser/livemark-service;2"].getService(Ci.nsILivemarkService),


  /********************************************************
   * Initialization and timer functions
   ********************************************************/

  init: function() {
    if (this._initialized) {
      return;
    }

    this._refreshHasNew();
    this.initialCheck();
    this.startTimer();
    this._initialized = true;
  },

  initialCheck: function() {
    var callback = {};
    callback.notify = function () {
      SageUpdateChecker.startCheck(SageUtils.getSageRootFolderId());
    };
    
    var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.initWithCallback(callback, INITIAL_CHECK, Ci.nsITimer.TYPE_ONE_SHOT);
  },

  startTimer: function() {
    if (this._timer) {
      return;
    }

    var callback = {
      notify: function() {
        SageUpdateChecker.startCheck(SageUtils.getSageRootFolderId());
      }
    };
    this._timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    this._timer.initWithCallback(callback, DELAY, Ci.nsITimer.TYPE_REPEATING_SLACK);
  },

  resetTimer: function() {
    this._timer.cancel();
    this._timer = null;
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

  getURL: function(aItemId) {
    if (this.livemarkService.isLivemark(aItemId)) {
      return this.livemarkService.getFeedURI(aItemId).spec;
    } else {
      return this.bmsvc.getBookmarkURI(aItemId).spec;
    }
  },

  getItemAnnotation: function(aItemId, aName) {
    try {
      return this.anno.getItemAnnotation(aItemId, aName);
    } catch(e) {
      // we could check for existence before, but the try/catch is more efficient
      return null;
    }
  },

  setStatusFlag: function(aItemId, aState) {
    logger.info("setting " + SageUtils.ANNO_STATUS + " => " + aState + " on item " + aItemId);
    this.anno.setItemAnnotation(aItemId, SageUtils.ANNO_STATUS, aState, 0, this.anno.EXPIRE_NEVER);
    this._refreshHasNew();
  },

  queueItems: function uc_queueItems(aResultNode) {
    var itemId = aResultNode.itemId;
    var itemType = this.bmsvc.getItemType(itemId);
    if (itemType == this.bmsvc.TYPE_BOOKMARK || this.livemarkService.isLivemark(itemId)) {
      var url = this.getURL(aResultNode.itemId);
      var status = this.getItemAnnotation(aResultNode.itemId, SageUtils.ANNO_STATUS);
      if (url && status != SageUtils.STATUS_UPDATE) {
        this.checkList.push(aResultNode.itemId);
      }
    } else if (itemType == this.bmsvc.TYPE_FOLDER) {
      aResultNode.QueryInterface(Components.interfaces.nsINavHistoryContainerResultNode);
      aResultNode.containerOpen = true;
      for (var i = 0; i < aResultNode.childCount; i ++) {
        this.queueItems(aResultNode.getChild(i));
      }
      aResultNode.containerOpen = false;
    }
  },

  setHasNew: function(aValue) {
    if (this.hasNew !== aValue) {
      this.hasNew = aValue;
      this.notifyObservers("sage-hasNewUpdated", this.hasNew);
    }
  },

  _refreshHasNew: function() {
    var inst = this;
    function itemHasNew(aResultNode) {
      var itemId = aResultNode.itemId;
      var itemType = inst.bmsvc.getItemType(itemId);
      if (itemType == inst.bmsvc.TYPE_BOOKMARK || inst.livemarkService.isLivemark(itemId)) {
        var status = inst.getItemAnnotation(itemId, SageUtils.ANNO_STATUS);
        return (status == SageUtils.STATUS_UPDATE);
      } else if (itemType == inst.bmsvc.TYPE_FOLDER) {
        aResultNode.QueryInterface(Components.interfaces.nsINavHistoryContainerResultNode);
        aResultNode.containerOpen = true;
        for (var i = 0; i < aResultNode.childCount; i ++) {
          if (itemHasNew(aResultNode.getChild(i))) {
            return true;
          }
        }
      }
      return false;
    }

    var query = this.hist.getNewQuery();
    var options = this.hist.getNewQueryOptions();
    query.setFolders([SageUtils.getSageRootFolderId()], 1);
    var result = this.hist.executeQuery(query, options);
    this.setHasNew(itemHasNew(result.root));
  },

  /********************************************************
   * Network functions and actually checking
   ********************************************************/

  startCheck: function(aCheckFolderId) {
    if (this.checking) return;

    var hist = Cc["@mozilla.org/browser/nav-history-service;1"]
               .getService(Ci.nsINavHistoryService);
    var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
                .getService(Ci.nsINavBookmarksService);
    var anno = Cc["@mozilla.org/browser/annotation-service;1"]
               .getService(Ci.nsIAnnotationService);


    var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
    this.logger = new Logger();

    var query = hist.getNewQuery();
    var options = hist.getNewQueryOptions();
    query.setFolders([aCheckFolderId], 1);
    var result = hist.executeQuery(query, options);
    this.checkList = [];

    // select feeds to be checked, exclude separators and updated feeds
    this.queueItems(result.root);

    this.logger.info("found " + this.checkList.length + " feed(s) to check");

    if (this.checkList.length > 0) {
      this.checking = true;
      this.check();
    }
  },

  done: function() {
    if (this.checking) {
      this.httpReq.abort();
      this.setStatusFlag(this.lastItemId, SageUtils.STATUS_NO_UPDATE);
    }
  },

  check: function() {
    this.lastItemId = this.checkList.shift();
    var name = this.bmsvc.getItemTitle(this.lastItemId);
    var url = this.getURL(this.lastItemId);
    
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

    this.httpReq.onload = this.httpLoaded;
    this.httpReq.onerror = this.httpError;
    this.httpReq.onreadystatechange = this.httpReadyStateChange;

    try {
      this.httpReq.setRequestHeader("User-Agent", SageUtils.USER_AGENT);
      //this.httpReq.overrideMimeType("application/xml");
      this.httpReq.send(null);
      this.setStatusFlag(this.lastItemId, SageUtils.STATUS_CHECKING);
      this.notifyObservers("sage-nowRefreshing", name);
    } catch(e) {
        // FAILURE
      this.httpReq.abort();
      this.checkResult(false, 0);
    }
  },

  httpError: function(e) {
    this.logger.warn("HTTP Error: " + e.target.status + " - " + e.target.statusText);
    SageUpdateChecker.httpReq.abort();
    SageUpdateChecker.checkResult(false, 0);
  },

  httpReadyStateChange: function() {
    if (SageUpdateChecker.httpReq.readyState == 2) {
      try {
        SageUpdateChecker.httpReq.status;
      } catch(e) {
          // URL NOT AVAILABLE
        SageUpdateChecker.httpReq.abort();
        SageUpdateChecker.checkResult(false, 0);
      }
    }
  },

  httpLoaded: function(e) {
    var FeedParserFactory = new Components.Constructor("@sage.mozdev.org/sage/feedparserfactory;1", "sageIFeedParserFactory");
    var feedParserFactory = new FeedParserFactory();
    var feedParser = feedParserFactory.createFeedParser(SageUpdateChecker.httpReq.responseText);
    var feed = feedParser.parse(SageUpdateChecker.httpReq.responseText, SageUpdateChecker.httpReq.channel.originalURI, SageUpdateChecker);
  },
  
  // sageIFeedParserListener
  onFeedParsed : function(feed) {
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
    var name = this.bmsvc.getItemTitle(this.lastItemId);
    var url = this.getURL(this.lastItemId).spec;
    var status = 0;

    if (aSucceed) {
      var lastVisit = this.getItemAnnotation(this.lastItemId, SageUtils.ANNO_LASTVISIT);
      var sig = this.getItemAnnotation(this.lastItemId, SageUtils.ANNO_SIG);

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

    this.setStatusFlag(this.lastItemId, status);
    
    if (this.checkList.length == 0) {
      this.checking = false;
      this.notifyObservers("sage-nowRefreshing", "");
      return;
    } else {
      this.check();
    }
  }
};
