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
	STATE_ANNO: "sage/state",
	SIG_ANNO: "sage/signature",

	getURL: function(aItemId) {
		var livemarksvc = Cc["@mozilla.org/browser/livemark-service;2"]
											.getService(Ci.nsILivemarkService);
		if (livemarksvc.isLivemark(aItemId)) {
			return livemarkService.getSiteURI(aItemId).spec;
		} else {
			return PlacesUtils.bookmarks.getBookmarkURI(aItemId).spec;
		}
	},

	startCheck: function(aCheckFolderId) {
		if(this.checking) return;

		var hist = PlacesUtils.history;
		var bmsvc = PlacesUtils.bookmarks;
		var anno = PlacesUtils.annotations;

		var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
		this.logger = new Logger();

		sageRootFolderID = CommonFunc.getSageRootFolderId();

		var query = hist.getNewQuery();
		var options = hist.getNewQueryOptions();
		query.setFolders([aCheckFolderId], 1);
		var result = hist.executeQuery(query, options);
		this.checkList = [];

		// select feeds to be checked, exclude separators and updated feeds
		var cont = result.root;
		cont.containerOpen = true;
		for (var i = 0; i < cont.childCount; i ++) {
			var node = cont.getChild(i);
			var url = this.getURL(node.itemId);
			var itemId = node.itemId;
			var status = null;
			try {
				status = anno.getItemAnnotationString(itemId, this.STATE_ANNO);
			} catch(e) {
				// we could check for existence before, but the try/catch is more efficient
			}
			if(url && !(status == CommonFunc.STATUS_UPDATE || status == CommonFunc.STATUS_NO_CHECK)) {
				this.checkList.push(itemId);
			}
		}
		cont.containerOpen = false;

		this.logger.info("found " + this.checkList.length + " feed(s) to check");

		if (this.checkList.length > 0) {
			this.checking = true;
			this.check();
		}
	},

	done: function() {
		if(this.checking) {
			this.httpReq.abort();
			this.setStatusFlag(this.lastItemId, CommonFunc.STATUS_NO_UPDATE);
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
			this.httpReq.setRequestHeader("User-Agent", CommonFunc.USER_AGENT);
			this.httpReq.overrideMimeType("application/xml");
			this.httpReq.send(null);
			this.setStatusFlag(this.lastItemId, CommonFunc.STATUS_CHECKING);
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
		var url = PlacesUtils.bookmarks.getBookmarkURI(this.lastItemId).spec;
		var status = 0;

		//var lastVisit = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_LAST_VISIT);
		var lastVisit;
		if(!lastVisit) {
			lastVisit = 0;
		} else {
			lastVisit /= 1000;
		}

		if(aSucceed) {
			var sig = null;
			try {
				sig = anno.getItemAnnotationString(this.lastItemId, this.SIG_ANNO);
			} catch(e) {
				// we could check for existence before, but the try/catch is more efficient
			}
			if(aLastModified) {
				if((aLastModified > lastVisit) && (sig != feed.getSignature())) {
					status = CommonFunc.STATUS_UPDATE;
				} else {
					status = CommonFunc.STATUS_NO_UPDATE;
				}
			} else {
				if(sig != feed.getSignature()) {
					status = CommonFunc.STATUS_UPDATE;
				} else {
					status = CommonFunc.STATUS_NO_UPDATE;
				}
			}
		} else {
			status = CommonFunc.STATUS_ERROR;
		}

		this.setStatusFlag(this.lastItemId, status);
		
		if(this.checkList.length == 0) {
			this.checking = false;
			this.onChecked(name, url);
			return;
		} else {
			this.check();
		}
	},

	setStatusFlag: function(aItemId, aState, aRecursive) {
		logger.info("setting " + this.STATE_ANNO + " => " + aState + " on item " + aItemId);
		PlacesUtils.annotations.setItemAnnotation(aItemId, this.STATE_ANNO, aState, 0, PlacesUtils.annotations.EXPIRE_NEVER);

		if (aRecursive || aRecursive === undefined) {
			// Go to parent folder
			var parentFolderId = PlacesUtils.bookmarks.getFolderIdForItem(aItemId);
			if (parentFolderId != -1 &&
					parentFolderId != sageRootFolderID) {
				this.setStatusFlag(parentFolderId, aState, true);
			}
		}
	},
	
	onCheck: function(aName, aURL) {},
	onChecked: function(aName, aURL) {}
}
