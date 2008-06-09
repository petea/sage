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

	init: function() {		
		var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
		var logger = new Logger();
		
		logger.info("initialized");

		var RDF = Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService);
		var localstore = RDF.GetDataSource("rdf:local-store");
		var prefService = Cc["@mozilla.org/preferences;1"].getService(Ci.nsIPrefService);
		var prefBranch = prefService.getBranch("sage.");
		var bookmarksService = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
		var annotationService = Cc["@mozilla.org/browser/annotation-service;1"].getService(Ci.nsIAnnotationService);
		var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
		
		if (!prefBranch.prefHasUserValue("last_version")) {  // new user
			var folderId = bookmarksService.createFolder(bookmarksService.bookmarksMenuFolder, "Sage Feeds", bookmarksService.DEFAULT_INDEX);
			annotationService.setItemAnnotation(folderId, "sage/root", "Sage Root Folder", 0, annotationService.EXPIRE_NEVER);
			//prefBranch.setCharPref("folder_id", new_folder.Value);
			function createBookmark(title, url) {
				var bookmarkURI = ioService.newURI(url, null, null);
				bookmarksService.insertBookmark(folderId, bookmarkURI, bookmarksService.DEFAULT_INDEX, title);
			}
			createBookmark("BBC News | News Front Page | World Edition", "http://news.bbc.co.uk/rss/newsonline_world_edition/front_page/rss091.xml");
			createBookmark("Yahoo! News - Sports", "http://rss.news.yahoo.com/rss/sports");
			createBookmark("Sage Project News", "http://sage.mozdev.org/rss.xml");
			this.addButton();
			localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul"), RDF.GetResource("http://home.netscape.com/NC-rdf#persist"), RDF.GetResource("chrome://sage/content/sage.xul#chkShowSearchBar"), true);
			localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul#chkShowSearchBar"), RDF.GetResource("checked"), RDF.GetLiteral("false"), true);
			localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul"), RDF.GetResource("http://home.netscape.com/NC-rdf#persist"), RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemList"), true);
			localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemList"), RDF.GetResource("checked"), RDF.GetLiteral("true"), true);
			localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul"), RDF.GetResource("http://home.netscape.com/NC-rdf#persist"), RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemListToolbar"), true);
			localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemListToolbar"), RDF.GetResource("checked"), RDF.GetLiteral("true"), true);
			localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul"), RDF.GetResource("http://home.netscape.com/NC-rdf#persist"), RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemTooltips"), true);
			localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul#chkShowTooltip"), RDF.GetResource("checked"), RDF.GetLiteral("true"), true);
			
		} else { // check for upgrade
			var lastVersion = prefBranch.getCharPref("last_version");
			if (lastVersion != "1.3.7" &&
				lastVersion != "1.3.8" &&
				lastVersion != "1.3.9" &&
				lastVersion != "1.3.10" &&
				lastVersion != "1.4.0") { // upgrade
				this.addButton();
			}
		}
		prefBranch.setCharPref("last_version", "1.4.0");
	},
	
	uninit: function() {},

	hasButton: function() {
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
	
	addButton: function() {
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
