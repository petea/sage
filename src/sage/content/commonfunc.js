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

var CommonFunc = {

	VERSION: [1, 4, 0],
	USER_AGENT: "Mozilla/5.0 (Sage)",

	FEED_FOLDER_ID: "sage.folder_id",
	LAST_VERSION: "sage.last_version",
	USER_CSS_ENABLE: "sage.user_css.enable",
	USER_CSS_PATH: "sage.user_css.path",
	ALLOW_ENCODED_CONTENT: "sage.allow_encoded_content",
	AUTO_FEED_TITLE: "sage.auto_feed_title",
	RENDER_FEEDS: "sage.render_feeds",
	TWELVE_HOUR_CLOCK: "sage.twelve_hour_clock",
	FEED_ITEM_ORDER: "sage.feed_item_order",
	FEED_DISCOVERY_MODE: "sage.feed_discovery_mode",


	RESULT_OK:	 			0,
	RESULT_PARSE_ERROR:		1,
	RESULT_NOT_RSS:			2,
	RESULT_NOT_FOUND:		3,
	RESULT_NOT_AVAILABLE:	4,
	RESULT_ERROR_FAILURE:	5,

	FEED_SUMMARY_URI:		"chrome://sage/content/feedsummary.html",

	ANNO_ROOT: "sage/root", // int, a Places itemId
	ANNO_STATUS: "sage/status", // string, as defined in CommonFunc (STATUS_*)
	ANNO_SIG: "sage/signature", // string
	ANNO_LASTVISIT: "sage/lastvisit", // Epoch seconds

// ++++++++++ ++++++++++ Bookmark RDF ++++++++++ ++++++++++

	NC_NS:				"http://home.netscape.com/NC-rdf#",
	BM_LAST_VISIT:		"http://home.netscape.com/WEB-rdf#LastVisitDate",
	BM_LAST_MODIFIED:	"http://home.netscape.com/WEB-rdf#LastModifiedDate",
	BM_DESCRIPTION:		"http://home.netscape.com/NC-rdf#Description",
	BM_NAME:				"http://home.netscape.com/NC-rdf#Name",
	BM_URL:				"http://home.netscape.com/NC-rdf#URL",
	BM_FEEDURL:			"http://home.netscape.com/NC-rdf#FeedURL",

	RDF_NS:				"http://www.w3.org/1999/02/22-rdf-syntax-ns#",
	RDF_TYPE:			"http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
	
	XUL_NS:				"http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",

	STATUS_UPDATE: "updated",
	STATUS_NO_UPDATE: "no-updated",
	STATUS_UNKNOWN: "unknown",
	STATUS_ERROR: "error",
	STATUS_NO_CHECK: "no-check",
	STATUS_CHECKING: "checking",


// ++++++++++ ++++++++++ CharCode ++++++++++ ++++++++++

	convertCharCodeFrom: function(aString, aCharCode) {
		var UConvID = "@mozilla.org/intl/scriptableunicodeconverter";
		var UConvIF  = Components.interfaces.nsIScriptableUnicodeConverter;
		var UConv = Components.classes[UConvID].getService(UConvIF);

		var tmpString = "";
		try {
			UConv.charset = aCharCode;
			tmpString = UConv.ConvertFromUnicode(aString);
		} catch(e) {
			tmpString = null;
		}
		return tmpString;
	},


	getInnerText: function(aNode) {
		if(!aNode.hasChildNodes()) return "";
		
		var NodeFilter = Components.interfaces.nsIDOMNodeFilter;
	
		var resultArray = new Array();
		var walker = aNode.ownerDocument.createTreeWalker(aNode, NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_TEXT, null, false);
		while(walker.nextNode()) {
			resultArray.push(walker.currentNode.nodeValue);
		}
		return resultArray.join('').replace(/^\s+|\s+$/g, "");
	},


	loadText: function(aURI) {
		var	URI = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
		URI.spec = aURI;
	
		var IOService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		var channel = IOService.newChannelFromURI(URI);
		var stream	= channel.open();
		var scriptableStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
		scriptableStream.init(stream);

		var fileContents = scriptableStream.read(scriptableStream.available());

		scriptableStream.close();
		stream.close();

		return fileContents;
	},


// ++++++++++ ++++++++++ preferences ++++++++++ ++++++++++

	setPrefValue : function(aPrefString, aPrefType, aValue) {
		var nsISupportsString = Components.interfaces.nsISupportsString;
		var xpPref = Components.classes["@mozilla.org/preferences;1"].getService(Components.interfaces.nsIPrefBranch);

		var prefType = xpPref.getPrefType(aPrefString);

		try {
			switch(aPrefType) {
				case "wstr":
					var string = Components.classes['@mozilla.org/supports-string;1'].createInstance(nsISupportsString);
					string.data = aValue;
					return xpPref.setComplexValue(aPrefString, nsISupportsString, string);
					break;
				case "str":
					return xpPref.setCharPref(aPrefString, aValue);
					break;
				case "int":
					aValue = parseInt(aValue);
					return xpPref.setIntPref(aPrefString, aValue);
					break;
				case "bool":
				default:
					if(typeof(aValue) == "string") {
						aValue = (aValue == "true");
					}
					return xpPref.setBoolPref(aPrefString, aValue);
					break;
			}
		} catch(e) {
		}
		return null;
	},

	getPrefValue : function(aPrefString, aPrefType, aDefault) {
		var nsISupportsString = Components.interfaces.nsISupportsString;
		var xpPref = Components.classes["@mozilla.org/preferences;1"].getService(Components.interfaces.nsIPrefBranch);

		if(xpPref.getPrefType(aPrefString) == xpPref.PREF_INVALID) {
			return aDefault;
		}
		try {
			switch (aPrefType) {
				case "wstr":
					return xpPref.getComplexValue(aPrefString, nsISupportsString).data;
					break;
				case "str":
					return xpPref.getCharPref(aPrefString).toString();
					break;
				case "int":
					return xpPref.getIntPref(aPrefString);
					break;
				case "bool":
				default:
					return xpPref.getBoolPref(aPrefString);
					break;
			}
		} catch(e) {
		}
		return aDefault;
	},

	clearPref: function(aPrefString) {
		var xpPref = Components.classes["@mozilla.org/preferences;1"].getService(Components.interfaces.nsIPrefBranch);

		try {
			xpPref.clearUserPref(aPrefString);
			return true;
		} catch(e) {
			return false;
		}
	},

		// remove all preferences
	removePrefs: function() {
		var xpPref = Components.classes["@mozilla.org/preferences;1"].getService(Components.interfaces.nsIPref);

		var prefBranch = xpPref.getBranch("sage.");

		try {
			prefBranch.deleteBranch("");
			return true;
		} catch(e) {
			return false;
		}
	},

	addPrefListener: function(aPrefString, aFunc) {
		var prefObserver;
		try {
			prefObserver = {
				domain: aPrefString,
				observe: aFunc
			};

			var pbi = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranchInternal);
			pbi.addObserver(prefObserver.domain, prefObserver, false);
		} catch(e) {
			alert(e);
			prefObserver = null;
		}

		return prefObserver;
	},

	removePrefListener: function(aObserver) {
		var prefObserver;
		try {
			var pbi = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranchInternal);
			pbi.removeObserver(aObserver.domain, aObserver);
		} catch(e) {
			alert(e)
		}
	},

	// takes a version string, returns an integer triple containing (major version, minor version, patch level)
	versionStrDecode: function(versionStr) {
		var regexp = /([0-9]*)\.([0-9]*)\.([0-9]*)/;
		var result = regexp.exec(versionStr);
		return Array(parseInt(result[1]), parseInt(result[2]), parseInt(result[3]));
	},

	// takes a version triple, returns an integer
	versionToInt: function(versionTriple) {
		return versionTriple[0]*100 + versionTriple[1]*10 + versionTriple[2];
	},

	// takes two version triples, returns 1 if the first is more recent, 0 otherwise
	versionCompare: function(versionA, versionB) {
		if(this.versionToInt(versionA) > this.versionToInt(versionB)) {
			return 1;
		} else {
			return 0;
		}
	},

	// takes a version triple, returns a formatted version string
	versionString: function(version, pretty) {
		var formatted;
		if(pretty) {
			formatted = version[0].toString() + '.' + version[1].toString();
			formatted += version[2] != 0 ? "." + version[2] : ""
		} else {
			formatted = version[0].toString() + '.' + version[1].toString() + '.' + version[2].toString();
		}
		return formatted;
	},
	
	getSageRootFolderId: function() {
		var annotationService = Cc["@mozilla.org/browser/annotation-service;1"].getService(Ci.nsIAnnotationService);
		var results = annotationService.getItemsWithAnnotation("sage/root", {});
		if (results.length == 1) {
			return results[0];
		} else if (results.length == 0) {
			throw "No root folder found";
		} else if (results.length > 1) {
			throw "Multiple root folders found";
		}
	},
	
	setSageRootFolderId: function(folderId) {
		var annotationService = Cc["@mozilla.org/browser/annotation-service;1"].getService(Ci.nsIAnnotationService);
		var results = annotationService.getItemsWithAnnotation("sage/root", {});
		if (results.length == 1) {
			if (results[0] != folderId) {
				annotationService.removeItemAnnotation(results[0], "sage/root");
				annotationService.setItemAnnotation(folderId, "sage/root", "Sage Root Folder", 0, annotationService.EXPIRE_NEVER);
			}
		} else if (results.length == 0) {
			annotationService.setItemAnnotation(folderId, "sage/root", "Sage Root Folder", 0, annotationService.EXPIRE_NEVER);
		} else if (results.length > 1) {
			throw "Multiple root folders found";
		}
	}

}
