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

var sageFolderID;

//var chkUserCssEnable;
//var txtUserCssPath;
var chkAllowEContent;
var chkAutoFeedTitle;
var chkRenderFeeds;
var chkTwelveHourClock;
var feedItemOrder;
var feedDiscoveryMode;

var gList;
var gNameArc;
var strRes;

function init() {
	initServices();
	initBMService();

	strRes = document.getElementById("strRes");

	//var header = document.getElementById("header");
	//header.setAttribute("description", header.getAttribute("description") + " " + CommonFunc.versionString(CommonFunc.VERSION, 1));

	sageFolderID = CommonFunc.getPrefValue(CommonFunc.FEED_FOLDER_ID, "str", "NC:BookmarksRoot");
	gNameArc = RDF.GetResource(CommonFunc.NC_NS + "Name");
	gList = document.getElementById("select-menu");

	//chkUserCssEnable = document.getElementById("chkUserCssEnable");
	//chkUserCssEnable.checked = CommonFunc.getPrefValue(CommonFunc.USER_CSS_ENABLE, "bool", false);

	//txtUserCssPath = document.getElementById("txtUserCssPath");
	//txtUserCssPath.value = CommonFunc.getPrefValue(CommonFunc.USER_CSS_PATH, "wstr", "");

	chkAllowEContent = document.getElementById("chkAllowEContent");
	chkAllowEContent.checked = CommonFunc.getPrefValue(CommonFunc.ALLOW_ENCODED_CONTENT, "bool", true);

	chkAutoFeedTitle = document.getElementById("chkAutoFeedTitle");
	chkAutoFeedTitle.checked = CommonFunc.getPrefValue(CommonFunc.AUTO_FEED_TITLE, "bool", true);

	chkRenderFeeds = document.getElementById("chkRenderFeeds");
	chkRenderFeeds.checked = CommonFunc.getPrefValue(CommonFunc.RENDER_FEEDS, "bool", true);

	chkTwelveHourClock = document.getElementById("chkTwelveHourClock");
	chkTwelveHourClock.checked = CommonFunc.getPrefValue(CommonFunc.TWELVE_HOUR_CLOCK, "bool", false);

	feedItemOrder = document.getElementById("feedItemOrder");
	feedItemOrder.value = CommonFunc.getPrefValue(CommonFunc.FEED_ITEM_ORDER, "str", "chrono");

	feedDiscoveryMode = document.getElementById("feedDiscoveryMode");
	feedDiscoveryMode.value = CommonFunc.getPrefValue(CommonFunc.FEED_DISCOVERY_MODE, "str", "exhaustive");

	setDisabled();

	populateList();

	setTimeout(fillSelectFolderMenupopup, 0);
}

function accept() {
	CommonFunc.setPrefValue(CommonFunc.FEED_FOLDER_ID, "str", sageFolderID);
	//CommonFunc.setPrefValue(CommonFunc.USER_CSS_ENABLE, "bool", chkUserCssEnable.checked);
	//CommonFunc.setPrefValue(CommonFunc.USER_CSS_PATH, "wstr", txtUserCssPath.value);
	CommonFunc.setPrefValue(CommonFunc.ALLOW_ENCODED_CONTENT, "bool", chkAllowEContent.checked);
	CommonFunc.setPrefValue(CommonFunc.AUTO_FEED_TITLE, "bool", chkAutoFeedTitle.checked);
	CommonFunc.setPrefValue(CommonFunc.RENDER_FEEDS, "bool", chkRenderFeeds.checked);
	CommonFunc.setPrefValue(CommonFunc.TWELVE_HOUR_CLOCK, "bool", chkTwelveHourClock.checked);
	CommonFunc.setPrefValue(CommonFunc.FEED_ITEM_ORDER, "str", feedItemOrder.value);
	CommonFunc.setPrefValue(CommonFunc.FEED_DISCOVERY_MODE, "str", feedDiscoveryMode.value);

	var list = document.getElementById("file-list");
	if (list.selectedItem)
		setTheme(list.selectedItem.value);
}

function selectFolder(aEvent){
	sageFolderID = aEvent.target.id;
}

function setDisabled() {
	chkAllowEContent.disabled = !chkRenderFeeds.checked;
	//txtUserCssPath.disabled = !chkUserCssEnable.checked;
	document.getElementById("file-list").disabled = !chkRenderFeeds.checked;
	document.getElementById("btnBrowseCss").disabled = !chkRenderFeeds.checked;
}

function browseForTheme() {
	var fpicker = Components.classes["@mozilla.org/filepicker;1"]
					.createInstance(Components.interfaces.nsIFilePicker);
	fpicker.init(window, strRes.getString("css_select_file"), fpicker.modeOpen);
	//fpicker.appendFilter(strRes.getString("css_css_file") + " (*.css)", "*.css");
	fpicker.appendFilter("Theme files" + " (*.css; *.zip; *.jar)", "*.css;*.zip;*.jar");
	fpicker.appendFilters(fpicker.filterAll);

	var showResult = fpicker.show();
	if(showResult == fpicker.returnOK) {
		addThemeFile(fpicker.file);
		populateList();
		//txtUserCssPath.value = fpicker.file.path;
		// we need to copy the file to the theme directory and update the list
	}
}

function fillSelectFolderMenupopup () {
	var popup = document.getElementById("select-folder");

	// clearing the old menupopup
	while (popup.hasChildNodes()) {
		popup.removeChild(popup.firstChild);
	}

	// to be removed once I checkin the top folder
	var element = document.createElementNS(CommonFunc.XUL_NS, "menuitem");
	element.setAttribute("label", "Bookmarks");
	element.setAttribute("id", "NC:BookmarksRoot");
	popup.appendChild(element);

	var folder = RDF.GetResource("NC:BookmarksRoot");
	fillFolder(popup, folder, 1);
	if(gList.selectedIndex == -1) {
		gList.selectedIndex = 0;
		sageFolderID = "NC:BookmarksRoot";
	}
}

function fillFolder(aPopup, aFolder, aDepth) {
	RDFC.Init(BMDS, aFolder);
	var children = RDFC.GetElements();
	while (children.hasMoreElements()) {
		var curr = children.getNext();
		if (RDFCU.IsContainer(BMDS, curr)) {
			curr = curr.QueryInterface(Components.interfaces.nsIRDFResource);
			var element = document.createElementNS(CommonFunc.XUL_NS, "menuitem");
			var name = BMDS.GetTarget(curr, gNameArc, true).QueryInterface(kRDFLITIID).Value;
			var indentation = new Array(aDepth + 1).join("   ");
			element.setAttribute("label", indentation + name);
			element.setAttribute("id", curr.Value);
			aPopup.appendChild(element);
			if (curr.Value == sageFolderID) {
				gList.selectedItem = element;
			}
			fillFolder(aPopup, curr, ++aDepth);
			--aDepth;
		}
	}
}


// Logic for theme list


//const // @mozilla.org/file/directory_service;1


function getSageThemeDir()
{
	var dirService = Components.classes["@mozilla.org/file/directory_service;1"]
						.getService(Components.interfaces.nsIProperties);
	var dir = dirService.get("ProfD", Components.interfaces.nsILocalFile);
	dir.append("SageThemes");
	if (!dir.exists())
		dir.create(dir.DIRECTORY_TYPE, 0770);
	return dir;
}

function populateList()
{
	var list = document.getElementById("file-list");

	while (list.getRowCount() != 0)
	{
		list.removeItemAt(0);
	}

		var dir = getSageThemeDir();

	var file;
	var files = dir.directoryEntries;

	var icon, listItem;

	while (files.hasMoreElements()) {
		// we should only display css and jars (zips?)
		file = files.getNext();

		if (isThemeFileSupported(file)) {
			icon = ("moz-icon://" + file.path + "?size=16").replace(/\//g, "/");
			listItem = list.appendItem(file.leafName, file.path);
			listItem.setAttribute("style", "list-style-image: url(\"" + icon + "\")");
			listItem.setAttribute("class", "listitem-iconic");
			if (isThemeSelected(file.path)) {
				list.selectItem(listItem);
			}
		}
	}
}
function isThemeFileSupported(aFile) {
	var ioService = Components.classes["@mozilla.org/network/io-service;1"]
						.getService(Components.interfaces.nsIIOService);
	var uriFixup = Components.classes["@mozilla.org/docshell/urifixup;1"]
						.createInstance(Components.interfaces.nsIURIFixup);
	aFile.QueryInterface(Components.interfaces.nsIFile);
	var uri = uriFixup.createFixupURI(aFile.path, 0);
	var contentType = ioService.newChannelFromURI(uri)
						.QueryInterface(Components.interfaces.nsIChannel)
						.contentType;
	return contentType == "text/css" || isJarPath(aFile.path);
}

function setTheme(sPath)
{
	var uriFixup = Components.classes["@mozilla.org/docshell/urifixup;1"]
						.createInstance(Components.interfaces.nsIURIFixup);

	var uri = uriFixup.createFixupURI(sPath, 0).spec;

	// check if sPath is a jar file
	if (isJarPath(sPath))
	{
		uri = "jar:" + uri + "!/summary.css";
	}

	CommonFunc.setPrefValue(CommonFunc.USER_CSS_PATH, "wstr", uri);
	//alert(uri);
}

function isJarPath(sPath)
{
	return /\.(jar|zip)$/i.test(sPath);
}

function addThemeFile(aFile) {
	// need to check that file is css, jar or zip
	if (isThemeFileSupported(aFile)) {
		var dst = getSageThemeDir();
		try {
			aFile.copyTo(dst, null);
			populateList();
		} catch (ex) {
			alert("Failed to copy " + aFile.leafName);
		}
	} else {
		alert(aFile.leafName + " is not a supported theme file format");
	}
}

function removeThemeFile(aFile) {
	try {
		aFile.remove(false);
		populateList();
	} catch (ex) {
		alert("Failed to remove " + aFile.leafName);
	}
}

function onThemeRemove() {
	var list = document.getElementById("file-list");
	var listItem = list.selectedItem;
	if (listItem) {
		var file = Components.classes["@mozilla.org/file/local;1"].
			createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(listItem.value);
		removeThemeFile(file);
	}
}

// This is used when the list is populated so that we can select the item
// according to the setting
function isThemeSelected(aPath) {
	var sel = CommonFunc.getPrefValue(CommonFunc.USER_CSS_PATH, "wstr", "");
	var uriFixup = Components.classes["@mozilla.org/docshell/urifixup;1"]
						.createInstance(Components.interfaces.nsIURIFixup);
	var uri = uriFixup.createFixupURI(aPath, 0).spec;
	if (isJarPath(aPath)) {
		uri = "jar:" + uri + "!/summary.css"
	}
	return uri == sel;
}


// drag and drop

var dropObserver = {
	getSupportedFlavours : function () {
		var flavours = new FlavourSet();
		//flavours.appendFlavour("text/unicode");
		flavours.appendFlavour("application/x-moz-file","nsIFile");
		return flavours;
	},
	onDragOver: function (e, flavour, session) {},
	onDrop: function (e, dropdata, session) {
		if (dropdata.data) {
			addThemeFile(dropdata.data);
		}
	}
};

// based on code from Firefox Download manager
function openThemeFolder() {
	var dir = getSageThemeDir();
	try {
		dir.reveal();
	} catch (ex) {
		// if nsILocalFile::Reveal failed (eg it currently just returns an
		// error on unix), just open the folder in a browser window
		openExternal(dir.path);
	}
}

function openExternal(aPath) {
	var uri = Components.classes["@mozilla.org/network/standard-url;1"]
				.createInstance(Components.interfaces.nsIURI);
	uri.spec = "file:///" + aPath;
	var protocolSvc = Components.classes
				["@mozilla.org/uriloader/external-protocol-service;1"]
				.getService(Components.interfaces.nsIExternalProtocolService);
	protocolSvc.loadUrl(uri);
}

function getMoreThemes(e) {
	if (e.type == "click" || e.type == "keypress" &&
		(e.keyCode == Event.DOM_VK_ENTER || e.keyCode == Event.DOM_VK_RETURN)) {
		e.preventDefault();
		e.stopPropagation();
		alert("Go to theme site");
	}
}
