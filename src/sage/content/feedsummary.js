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
 * Erik Arvidsson <erik@eae.net>.
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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var strBundleService = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
var strRes = strBundleService.createBundle("chrome://sage/locale/sage.properties");

var feedSummary = {

	_uri:			null,
	_feedLoader:	null,
	_ownFeedLoader:	false,

	get uri() {
		if (this._uri != null) {
			return this._uri;
		}

		// parse
		var docFrag = document.location.toString().split("#")[1];
		var params = docFrag.split("/");
		if (params[0] == "feed") {
			return this._uri = decodeURIComponent(params[1]);
		}
		return null;
	},

	get feedLoader() {
		if (this._feedLoader != null) {
			return this._feedLoader;
		}

		// if the sidebar has the same uri then we should reuse that
		var ssb = this.findSageSideBar();
		if (ssb != null && ssb.feedLoader.uri == this.uri) {
			this._ownFeedLoader = false;
			return this._feedLoader = ssb.feedLoader;
		}
		this._ownFeedLoader = true;
		var fl = this.feedLoader = new FeedLoader;
		return fl
	},

	set feedLoader(fl) {
		if (fl != this._feedLoader) {
			if (this._feedLoader != null) {
				this._feedLoader.removeListener("load", this._onFeedLoad);
				this._feedLoader.removeListener("error", this._onFeedError);
				this._feedLoader.removeListener("abort", this._onFeedAbort);
			}
			this._feedLoader = fl;
		}
		return fl;
	},

	onPageLoad : function(e) {
		// populate the error array
		resultStrArray = [
			strRes.GetStringFromName("RESULT_OK_STR"),
			strRes.GetStringFromName("RESULT_PARSE_ERROR_STR"),
			strRes.GetStringFromName("RESULT_NOT_RSS_STR"),
			strRes.GetStringFromName("RESULT_NOT_FOUND_STR"),
			strRes.GetStringFromName("RESULT_NOT_AVAILABLE_STR"),
			strRes.GetStringFromName("RESULT_ERROR_FAILURE_STR")
		];

		this.findSageSideBar();

		var uri = this.uri;

		var p = document.createElement("p");
		p.setAttribute("id", "loading-text");
		p.textContent = strRes.formatStringFromName("RESULT_LOADING", [uri], 1);
		document.body.appendChild(p);

		var pb = document.createElementNS(XUL_NS, "progressmeter");
		pb.setAttribute("id", "loading-progress-meter");
		document.body.appendChild(pb);
		pb.setAttribute("mode", "undetermined");
		pb.setAttribute("value", "");

		document.body.setAttribute("loading", "true");

		if (uri) {
			this.loadFeed(uri);
		}
	},

	onPageUnload : function(e) {
		var fl = this.feedLoader;
		fl.removeListener("load", feedSummary.onFeedLoad);
		fl.removeListener("error", feedSummary.onFeedError);
		fl.removeListener("abort", feedSummary.onFeedAbort);
	},

	loadFeed : function(uri) {
		var fl = this.feedLoader;
		if (fl.currentFeed != null) {
			this.onFeedLoad(fl.currentFeed);
		} else {
			fl.addListener("load", this.onFeedLoad);
			fl.addListener("error", this.onFeedError);
			fl.addListener("abort", this.onFeedAbort);
			if (!fl.loading) {
				fl.loadURI(uri);
			}
		}
	},


	onFeedLoad : function(aFeed) {
		var fl = feedSummary.feedLoader
		fl.removeListener("load", feedSummary.onFeedLoad);
		fl.removeListener("error", feedSummary.onFeedError);
		fl.removeListener("abort", feedSummary.onFeedAbort);

		// in case the sidebar started loading some other feed.
		// This should be handled in a better way.
		if (aFeed.getFeedURI() == feedSummary.uri) {
			feedSummary.displayFeed(aFeed);
			document.body.removeAttribute("loading");
			document.body.removeAttribute("error");
		} else {
			feedSummary._feedLoader = null;
			feedSummary.loadFeed(feedSummary.uri);
		}
	},

	onFeedError : function(aErrorCode) {
		var fl = feedSummary.feedLoader
		fl.removeListener("load", feedSummary.onFeedLoad);
		fl.removeListener("error", feedSummary.onFeedError);
		fl.removeListener("abort", feedSummary.onFeedAbort);

		var p = document.getElementById("loading-text");
		p.textContent = strRes.formatStringFromName("RESULT_ERROR", [resultStrArray[aErrorCode]], 1);

		var pb = document.getElementById("loading-progress-meter");
		pb.setAttribute("mode", "determined");
		pb.setAttribute("value", "100%");
		document.body.setAttribute("error", "true");
		document.body.removeAttribute("loading");
	},

	onFeedAbort : function() {
		if (feedSummary._ownFeedLoader) {
			feedSummary.loadFeed(feedSummary.uri);
		} else {
			document.body.removeAttribute("loading");
		}
	},

	displayFeed : function(feed) {
		document.title = feed.getTitle() + " - Sage";
		document.body.innerHTML = CreateHTML.createHTMLSource(feed);
	},

	findSageSideBar : function() {
		var win = this.findCurrentWindow();
		if (win) {
			var sageBrowser = win.document.getElementById("sidebar");
			if (sageBrowser.getAttribute("src") == "chrome://sage/content/sage.xul") {
				return sageBrowser.contentWindow;
			}
		}
		return null;
	},

	findCurrentWindow : function() {
		// for all windows find all browsers and all frames.
		// xul:tabbrowser . browsers

		var windowManager = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
		var windowManagerInterface = windowManager.QueryInterface(Ci.nsIWindowMediator);

		//var topWindowOfType = windowManagerInterface.getMostRecentWindow( "navigator:browser" );
		var wins = windowManagerInterface.getEnumerator( "navigator:browser" );
		var win, res;
		while (wins.hasMoreElements()) {
			win = wins.getNext();
			win.QueryInterface(Ci.nsIDOMWindow);
			if (this._findInDocument(win.document, document)) {
				return win;
			}
		}
		return null;
	},

	_findInDocument : function(d) {
		var doc = d;
		if (doc == document) {
			return true;
		}

		var frames = d.defaultView.frames;
		var res, i;
		for (i = 0; i < frames.length; i++) {
			res = this._findInDocument(frames[i].document);
			if (res) {
				return true;
			}
		}

		var browsers = doc.getElementsByTagNameNS(XUL_NS, "browser");
		for (i = 0; i < browsers.length; i++) {
			res = this._findInDocument(browsers[i].contentDocument);
			if (res) {
				return true;
			}
		}

		var tabBrowsers = doc.getElementsByTagNameNS(XUL_NS, "tabbrowser");
		for (i = 0; i < tabBrowsers.length; i++) {
			browsers = tabBrowsers[i].browsers;
			for (j = 0; j < browsers.length; j++) {
				res = this._findInDocument(browsers[j].contentDocument);
				if (res) {
					return true;
				}
			}
		}

		return false;
	}

};

window.addEventListener("load", function(e) { return feedSummary.onPageLoad(e); }, false);
window.addEventListener("unload", function(e) { return feedSummary.onPageUnload(e); }, false);

// Cannot use DOM to set base
if (feedSummary.uri) {
	document.write("<base href=\"" + feedSummary.uri + "\">");
}

// set feed style sheet before content loads
var cssUrl	= CreateHTML.getUserCssURL();
if (!cssUrl) {
	cssUrl = CreateHTML.DEFAULT_CSS;
}
var headEl = document.getElementsByTagName("head")[0];
var linkEl = document.createElement("link");
linkEl.setAttribute("rel", "stylesheet");
linkEl.setAttribute("type", "text/css");
linkEl.setAttribute("title", "standard Style");
linkEl.setAttribute("href", cssUrl);
headEl.appendChild(linkEl);
