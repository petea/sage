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

var SageUtils = {

	VERSION : "1.4a",
	
	USER_AGENT : "Mozilla/5.0 (Sage)",

	PREF_BRANCH : "extensions.sage.",
	
	PREF_VERSION : "version",
	PREF_USER_CSS_ENABLE : "userCss.enable",
	PREF_USER_CSS_PATH : "userCss.path",
	PREF_ALLOW_ENCODED_CONTENT : "allowEncodedContent",
	PREF_AUTO_FEED_TITLE : "autoFeedTitle",
	PREF_RENDER_FEEDS : "renderFeeds",
	PREF_TWELVE_HOUR_CLOCK : "twelveHourClock",
	PREF_FEED_ITEM_ORDER : "feedItemOrder",
	PREF_FEED_DISCOVERY_MODE : "feedDiscoveryMode",
	PREF_LOG_LEVEL : "logLevel",

	RESULT_OK : 0,
	RESULT_PARSE_ERROR : 1,
	RESULT_NOT_RSS : 2,
	RESULT_NOT_FOUND : 3,
	RESULT_NOT_AVAILABLE : 4,
	RESULT_ERROR_FAILURE : 5,

	FEED_SUMMARY_URI :		"chrome://sage/content/feedsummary.html",

	ANNO_ROOT : "sage/root", // int, a Places itemId
	ANNO_STATUS : "sage/status", // string, as defined in SageUtils (STATUS_*)
	ANNO_SIG : "sage/signature", // string
	ANNO_LASTVISIT : "sage/lastvisit", // Epoch seconds
	ORGANIZER_QUERY_ANNO : "PlacesOrganizer/OrganizerQuery", // Not Sage-specific

	NC_NS: "http://home.netscape.com/NC-rdf#",
	XUL_NS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",

	STATUS_UPDATE: "updated",
	STATUS_NO_UPDATE: "no-updated",
	STATUS_UNKNOWN: "unknown",
	STATUS_ERROR: "error",
	STATUS_CHECKING: "checking",

	convertCharCodeFrom : function(aString, aCharCode) {
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

	getInnerText : function(aNode) {
		if(!aNode.hasChildNodes()) return "";
		
		var NodeFilter = Components.interfaces.nsIDOMNodeFilter;
	
		var resultArray = new Array();
		var walker = aNode.ownerDocument.createTreeWalker(aNode, NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_TEXT, null, false);
		while(walker.nextNode()) {
			resultArray.push(walker.currentNode.nodeValue);
		}
		return resultArray.join('').replace(/^\s+|\s+$/g, "");
	},

	loadText : function(aURI) {
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

	setPrefValue : function(aPrefString, aValue) {
		var prefService = Cc["@mozilla.org/preferences;1"].getService(Ci.nsIPrefService);
		var prefBranch = prefService.getBranch(this.PREF_BRANCH);

		switch (prefBranch.getPrefType(aPrefString)) {
			case Ci.nsIPrefBranch.PREF_INVALID:
				throw "Invalid preference: " + aPrefString;
			case Ci.nsIPrefBranch.PREF_STRING:
				var string = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
				string.data = aValue;
				prefBranch.setComplexValue(aPrefString, Ci.nsISupportsString, string);
				break;
			case Ci.nsIPrefBranch.PREF_INT:
				aValue = parseInt(aValue);
				prefBranch.setIntPref(aPrefString, aValue);
				break;
			case Ci.nsIPrefBranch.PREF_BOOL:
				if (typeof(aValue) == "string") {
					aValue = (aValue == "true");
				}
				prefBranch.setBoolPref(aPrefString, aValue);
				break;
		}
	},

	getPrefValue : function(aPrefString) {
		var prefService = Cc["@mozilla.org/preferences;1"].getService(Ci.nsIPrefService);
		var prefBranch = prefService.getBranch(this.PREF_BRANCH);
		
		switch (prefBranch.getPrefType(aPrefString)) {
			case Ci.nsIPrefBranch.PREF_INVALID:
				throw "Invalid preference: " + aPrefString;
			case Ci.nsIPrefBranch.PREF_STRING:
				return prefBranch.getComplexValue(aPrefString, Ci.nsISupportsString).data;
			case Ci.nsIPrefBranch.PREF_INT:
				return prefBranch.getIntPref(aPrefString);
			case Ci.nsIPrefBranch.PREF_BOOL:
				return prefBranch.getBoolPref(aPrefString);
		}
	},

	// takes a version string, returns an integer triple containing (major version, minor version, patch level)
	versionStrDecode : function(versionStr) {
		var regexp = /([0-9]*)\.([0-9]*)\.([0-9]*)/;
		var result = regexp.exec(versionStr);
		return Array(parseInt(result[1]), parseInt(result[2]), parseInt(result[3]));
	},

	// takes a version triple, returns an integer
	versionToInt : function(versionTriple) {
		return versionTriple[0]*100 + versionTriple[1]*10 + versionTriple[2];
	},

	// takes two version triples, returns 1 if the first is more recent, 0 otherwise
	versionCompare : function(versionA, versionB) {
		if(this.versionToInt(versionA) > this.versionToInt(versionB)) {
			return 1;
		} else {
			return 0;
		}
	},

	// takes a version triple, returns a formatted version string
	versionString : function(version, pretty) {
		var formatted;
		if(pretty) {
			formatted = version[0].toString() + '.' + version[1].toString();
			formatted += version[2] != 0 ? "." + version[2] : ""
		} else {
			formatted = version[0].toString() + '.' + version[1].toString() + '.' + version[2].toString();
		}
		return formatted;
	},
	
	getSageRootFolderId : function() {
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
	
	// Set the sage/root annotation to the corresponding folder, as well as
	// PlacesOrganizer/OrganizerQuery. Note that there is no risk to stomp
	// a folder already annotated for Firefox, because Firefox only annotates
	// left pane queries this way. Our UI doesn't allow users to select such
	// queries so no problem.
	setSageRootFolderId : function(folderId) {
		var annotationService = Cc["@mozilla.org/browser/annotation-service;1"].getService(Ci.nsIAnnotationService);
		var results = annotationService.getItemsWithAnnotation("sage/root", {});
		if (results.length == 1) {
			if (results[0] != folderId) {
				annotationService.removeItemAnnotation(results[0], "sage/root");
				annotationService.setItemAnnotation(folderId, "sage/root", "Sage Root Folder", 0, annotationService.EXPIRE_NEVER);
				this.clearSageLibraryQuery(results[0]);
				annotationService.setItemAnnotation(folderId, this.ORGANIZER_QUERY_ANNO, "SageRoot", 0, annotationService.EXPIRE_NEVER);
			}
		} else if (results.length == 0) {
			annotationService.setItemAnnotation(folderId, "sage/root", "Sage Root Folder", 0, annotationService.EXPIRE_NEVER);
			annotationService.setItemAnnotation(folderId, this.ORGANIZER_QUERY_ANNO, "SageRoot", 0, annotationService.EXPIRE_NEVER);
		} else if (results.length > 1) {
			throw "Multiple root folders found";
		}
	},
	
	clearSageLibraryQuery : function(folderId) {
		var annotationService = Cc["@mozilla.org/browser/annotation-service;1"].getService(Ci.nsIAnnotationService);
		try {
				annotationService.removeItemAnnotation(folderId, this.ORGANIZER_QUERY_ANNO);
		 } catch (e) {
			// The annotation didn't exist
		}
	},
	
	addFeed : function(title, url) {
		var bookmarksService = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
		var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
		var bookmarkURI = ioService.newURI(url, null, null);
		var folderId = this.getSageRootFolderId();
		bookmarksService.insertBookmark(folderId, bookmarkURI, bookmarksService.DEFAULT_INDEX, title);	
	},
	
	persistValue : function(uri, id, attribute, value) {
		var RDF = Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService);
		var localstore = RDF.GetDataSource("rdf:local-store");
		localstore.Assert(RDF.GetResource(uri), RDF.GetResource("http://home.netscape.com/NC-rdf#persist"), RDF.GetResource(uri + "#" + id), true);
		localstore.Assert(RDF.GetResource(uri + "#" + id), RDF.GetResource(attribute), RDF.GetLiteral(value), true);
	}

}
