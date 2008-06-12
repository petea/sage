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

var sageOverlay = {

	init : function() {		
		var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
		var logger = new Logger();
		
		logger.info("initialized");

		var bookmarksService = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
		
		if (SageUtils.getPrefValue(SageUtils.PREF_VERSION) == "") {  // new user
			var folderId = bookmarksService.createFolder(bookmarksService.bookmarksMenuFolder, "Sage Feeds", bookmarksService.DEFAULT_INDEX);
			SageUtils.setSageRootFolderId(folderId);
			SageUtils.addFeed("BBC News | News Front Page | World Edition", "http://news.bbc.co.uk/rss/newsonline_world_edition/front_page/rss091.xml");
			SageUtils.addFeed("Yahoo! News - Sports", "http://rss.news.yahoo.com/rss/sports");
			SageUtils.addFeed("Sage Project News", "http://sage.mozdev.org/rss.xml");
			this.addButton();
			SageUtils.persistValue("chrome://sage/content/sage.xul", "chkShowFeedItemList", "checked", true);
			SageUtils.persistValue("chrome://sage/content/sage.xul", "chkShowFeedItemListToolbar", "checked", true);
			SageUtils.persistValue("chrome://sage/content/sage.xul", "chkShowFeedItemTooltips", "checked", true);
			//this.addContentHandler();
		} else { // check for upgrade
			var lastVersion = SageUtils.getPrefValue(SageUtils.PREF_VERSION);
			if (lastVersion != "1.3.7" &&
				lastVersion != "1.3.8" &&
				lastVersion != "1.3.9" &&
				lastVersion != "1.3.10" &&
				lastVersion != "1.4.0") { // upgrade
				this.addButton();
			}
		}
		SageUtils.setPrefValue(SageUtils.PREF_VERSION, SageUtils.VERSION);
		//this.loadFaviconForHandler();
	},
	
	uninit : function() {},

	hasButton : function() {
		var toolbox = document.getElementById("navigator-toolbox");
		for (var i = 0; i < toolbox.childNodes.length; ++i) {
			var toolbar = toolbox.childNodes[i];
			if (toolbar.localName == "toolbar" && toolbar.getAttribute("customizable") == "true") {
				if (toolbar.currentSet.indexOf("sage-button") > -1) {
					return true;
				}
	    	}
	    }
	},
	
	addButton : function() {
		if (!this.hasButton()) {
			var toolbox = document.getElementById("navigator-toolbox");
			for (var i = 0; i < toolbox.childNodes.length; ++i) {
				toolbar = toolbox.childNodes[i];
				if (toolbar.localName == "toolbar" &&  toolbar.getAttribute("customizable") == "true" && toolbar.id == "nav-bar") {
					var newSet = "";
					var child = toolbar.firstChild;
					while (child) {
						if(child.id == "urlbar-container") {
							newSet += "sage-button,";
						}
						newSet += child.id + ",";
						child = child.nextSibling;
					}
					newSet = newSet.substring(0, newSet.length - 1);
					toolbar.currentSet = newSet;
					toolbar.setAttribute("currentset", newSet);
					toolbox.ownerDocument.persist(toolbar.id, "currentset");
					try {
						BrowserToolboxCustomizeDone(true);
					} catch (e) {}
					break;
				}
			}
		}
	},
	
	addContentHandler : function() {
		var prefService = Cc["@mozilla.org/preferences;1"].getService(Ci.nsIPrefService);
		var i = 0;
		var prefBranch = null;
		while (true) {
			prefBranch = prefService.getBranch("browser.contentHandlers.types." + i + ".");
			try {
				prefBranch.getCharPref("type");
				i++;
			} catch (e) {
				// No more handlers
				break;
			}
		}
		if (prefBranch) {
			prefBranch.setCharPref("title", "Sage");
			prefBranch.setCharPref("type", "application/vnd.mozilla.maybe.feed");
			prefBranch.setCharPref("uri", "chrome://sage/content/feedsummary.html?uri=%s");
		}
		prefService.savePrefFile(null);
	},
	
	loadFaviconForHandler : function() {
		var faviconService = Cc["@mozilla.org/browser/favicon-service;1"].getService(Ci.nsIFaviconService);
		var ioservice = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
		var pageURI = ioservice.newURI("chrome://sage/content/feedsummary.html", null, null);
		var faviconURI = ioservice.newURI("chrome://sage/skin/sage_leaf_16.png", null, null);
		faviconService.setAndLoadFaviconForPage(pageURI, faviconURI, true);
	},
	
	// nsIDOMEventListener
	handleEvent: function(event) {
		switch(event.type) {
			case "load":
				this.init();
				break;
			case "unload":
				this.uninit();
				break;
		}
	}

}

window.addEventListener("load", sageOverlay, false);
window.addEventListener("unload", sageOverlay, false);
