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

var sageMain = {
	init: function() {
		var stylesheets = document.styleSheets;
		var platform = new String(navigator.platform);
		if (platform.search(/^Mac/) == 0) {
			for (var c = 0; c < stylesheets.length; c++) {
				if (stylesheets[c].href == "chrome://sage/skin/sage-button.css") {
					stylesheets[c].disabled = true;
				} else if (stylesheets[c].href == "chrome://sage/skin/sage-button-mac.css") {
					stylesheets[c].disabled = false;
				}
			}
		} else {
			for (var c = 0; c < stylesheets.length; c++) {
				if (stylesheets[c].href == "chrome://sage/skin/sage-button.css") {
					stylesheets[c].disabled = false;
				} else if (stylesheets[c].href == "chrome://sage/skin/sage-button-mac.css") {
					stylesheets[c].disabled = true;
				}
			}
		}
		
		var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
		var logger = new Logger();
		
		logger.info("initialized");
		
		var prefService = Components.classes["@mozilla.org/preferences;1"].getService(Components.interfaces.nsIPrefService);
		var prefBranch = prefService.getBranch("sage.");
		if (!prefBranch.prefHasUserValue("last_version")) {  // new user
			var new_folder = BMSVC.createFolderInContainer("Sage Feeds", RDF.GetResource("NC:BookmarksRoot"), null);
			prefBranch.setCharPref("folder_id", new_folder.Value);
			BMSVC.createBookmarkInContainer("BBC News | News Front Page | World Edition", "http://news.bbc.co.uk/rss/newsonline_world_edition/front_page/rss091.xml", null, "updated", null, null, new_folder, null);
			BMSVC.createBookmarkInContainer("Yahoo! News - Sports", "http://rss.news.yahoo.com/rss/sports", null, "updated", null, null, new_folder, null);
			BMSVC.createBookmarkInContainer("Sage Project News", "http://sage.mozdev.org/rss.xml", null, "updated", null, null, new_folder, null);
			addSageButton();
			prefBranch.setCharPref("last_version", "1.4.0");
		} else { // check for upgrade
			var lastVersion = prefBranch.getCharPref("last_version");
			if (lastVersion != "1.3.7" && lastVersion != "1.4.0") { // upgrade
				addSageButton();
				prefBranch.setCharPref("last_version", "1.4.0");
			}
		}
	}
}

function addSageButton() {
	var toolbox = document.getElementById("navigator-toolbox");
	var toolboxDocument = toolbox.ownerDocument;
    
	var hasSageButton = false;
	for (var i = 0; i < toolbox.childNodes.length; ++i) {
		var toolbar = toolbox.childNodes[i];
		if (toolbar.localName == "toolbar" && toolbar.getAttribute("customizable") == "true") {
			if (toolbar.currentSet.indexOf("sage-button") > -1) {
				hasSageButton = true;
			}
    	}
    }

	if(!hasSageButton) {
		for (var i = 0; i < toolbox.childNodes.length; ++i) {
			toolbar = toolbox.childNodes[i];
			if (toolbar.localName == "toolbar" &&  toolbar.getAttribute("customizable") == "true" && toolbar.id == "nav-bar") {
				var newSet = "";
				var child = toolbar.firstChild;
				while (child) {
					if(!hasSageButton && child.id == "urlbar-container") {
						newSet += "sage-button,";
						hasSageButton = true;
					}
					newSet += child.id + ",";
					child = child.nextSibling;
				}
				newSet = newSet.substring(0, newSet.length - 1);
				toolbar.currentSet = newSet;
				toolbar.setAttribute("currentset", newSet);
				toolboxDocument.persist(toolbar.id, "currentset");
				try {
					BrowserToolboxCustomizeDone(true);
				} catch (e) {}
				break;
			}
		}
	}
}


window.addEventListener("load", function() { setTimeout(sageMain.init, 250); }, false);
