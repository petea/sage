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
 * Peter Andrews <petea@jhu.edu>
 * Erik Arvidsson <erik@eae.net>
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

var UpdateChecker = {

  checking: false,
  checkList: null,
  httpReq: null,
  lastItemId: -1,
  logger: null,
  livemarkService: null,

  getURL: function(aItemId) {
    if (this.livemarkService.isLivemark(aItemId)) {
      return this.livemarkService.getFeedURI(aItemId).spec;
    } else {
      return PlacesUtils.bookmarks.getBookmarkURI(aItemId).spec;
    }
  },

  getItemAnnotation: function(aItemId, aName) {
    var anno = PlacesUtils.annotations;
    try {
      return anno.getItemAnnotation(aItemId, aName);
    } catch(e) {
      // we could check for existence before, but the try/catch is more efficient
      return null;
    }
  },

  queueItem: function uc_queueItem(aResultNode) {
    var itemId = aResultNode.itemId;
    var itemType = PlacesUtils.bookmarks.getItemType(itemId);
    if (itemType == PlacesUtils.bookmarks.TYPE_BOOKMARK || this.livemarkService.isLivemark(itemId)) {
      var url = this.getURL(aResultNode.itemId);
      var status = this.getItemAnnotation(aResultNode.itemId, SageUtils.ANNO_STATUS);
      if(url && status != SageUtils.STATUS_UPDATE) {
        this.checkList.push(aResultNode.itemId);
      }
    } else if (itemType == PlacesUtils.bookmarks.TYPE_FOLDER) {
      aResultNode.QueryInterface(Components.interfaces.nsINavHistoryContainerResultNode);
      aResultNode.containerOpen = true;
      for (var i = 0; i < aResultNode.childCount; i ++) {
        this.queueItem(aResultNode.getChild(i));
      }
      aResultNode.containerOpen = false;
    }
  },

  startCheck: function(aCheckFolderId) {
    if(this.checking) return;

    this.livemarkService = Cc["@mozilla.org/browser/livemark-service;2"].getService(Ci.nsILivemarkService);

    var hist = PlacesUtils.history;
    var bmsvc = PlacesUtils.bookmarks;
    var anno = PlacesUtils.annotations;

    var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
    this.logger = new Logger();

    var query = hist.getNewQuery();
    var options = hist.getNewQueryOptions();
    query.setFolders([aCheckFolderId], 1);
    var result = hist.executeQuery(query, options);
    this.checkList = [];

    // select feeds to be checked, exclude separators and updated feeds
    this.queueItem(result.root);

    this.logger.info("found " + this.checkList.length + " feed(s) to check");

    if (this.checkList.length > 0) {
      this.checking = true;
      this.check();
    }
  },

  done: function() {
    if(this.checking) {
      this.httpReq.abort();
      this.setStatusFlag(this.lastItemId, SageUtils.STATUS_NO_UPDATE);
    }
  },

  check: function() {
    this.lastItemId = this.checkList.shift();
    var name = PlacesUtils.bookmarks.getItemTitle(this.lastItemId);
    var url = this.getURL(this.lastItemId);
    
    this.logger.info("checking: " + name);

    if(!url) {
      this.checkResult(false, 0);
    }

    if(this.httpReq) {
      this.httpReq.abort();
    }

    this.httpReq = new XMLHttpRequest();
    this.httpReq.parent = this;

    this.httpReq.open("GET", url);

    this.httpReq.onload = this.httpLoaded;
    this.httpReq.onerror = this.httpError;
    this.httpReq.onreadystatechange = this.httpReadyStateChange;

    try {
      this.httpReq.setRequestHeader("User-Agent", SageUtils.USER_AGENT);
      this.httpReq.overrideMimeType("application/xml");
      this.httpReq.send(null);
      this.setStatusFlag(this.lastItemId, SageUtils.STATUS_CHECKING);
      this.onCheck(name, url);
    } catch(e) {
        // FAILURE
      this.httpReq.abort();
      this.checkResult(false, 0);
    }
  },

  httpError: function(e) {
    this.logger.warn("HTTP Error: " + e.target.status + " - " + e.target.statusText);
    UpdateChecker.httpReq.abort();
    UpdateChecker.checkResult(false, 0);
  },

  httpReadyStateChange: function() {
    if(UpdateChecker.httpReq.readyState == 2) {
      try {
        UpdateChecker.httpReq.status;
      } catch(e) {
          // URL NOT AVAILABLE
        UpdateChecker.httpReq.abort();
        UpdateChecker.checkResult(false, 0);
      }
    }
  },

  httpLoaded: function(e) {
    var lastModified = 0;

    try {
      var FeedParserFactory = new Components.Constructor("@sage.mozdev.org/sage/feedparserfactory;1", "sageIFeedParserFactory");
      var feedParserFactory = new FeedParserFactory();
      var feedParser = feedParserFactory.createFeedParser(UpdateChecker.httpReq.responseXML);
      var feed = feedParser.parse(UpdateChecker.httpReq.responseXML);
      feed.setFeedURI(UpdateChecker.httpReq.channel.originalURI);
    } catch(e) {
      UpdateChecker.checkResult(false, 0);
      return;
    }

    if(feed.hasLastPubDate()) {
      lastModified = feed.getLastPubDate();
    }

    UpdateChecker.checkResult(true, lastModified, feed);
  },

  checkResult: function(aSucceed, aLastModified, feed) {
    var name = PlacesUtils.bookmarks.getItemTitle(this.lastItemId);
    var url = this.getURL(this.lastItemId).spec;
    var status = 0;

    if (aSucceed) {
      var lastVisit = this.getItemAnnotation(this.lastItemId, SageUtils.ANNO_LASTVISIT);
      var sig = this.getItemAnnotation(this.lastItemId, SageUtils.ANNO_SIG);

      if (aLastModified && lastVisit && sig) {
        if ((aLastModified > lastVisit) && (sig != feed.getSignature())) {
          status = SageUtils.STATUS_UPDATE;
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
      this.onChecked(name, url);
      return;
    } else {
      this.check();
    }
  },

  setStatusFlag: function(aItemId, aState) {
    logger.info("setting " + SageUtils.ANNO_STATUS + " => " + aState + " on item " + aItemId);
    PlacesUtils.annotations.setItemAnnotation(aItemId, SageUtils.ANNO_STATUS, aState, 0, PlacesUtils.annotations.EXPIRE_NEVER);
  },
  
  onCheck: function(aName, aURL) {},
  onChecked: function(aName, aURL) {}
}
