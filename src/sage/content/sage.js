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

var resultStrArray = null;

	// XUL Object
var strRes, bmStrRes; // stringbundle Object
var bookmarksTree;
var rssItemListBox;
var rssTitleLabel;
var rssItemToolTip;

var currentFeed;
var prefObserverSageFolder;
var lastResource;
var sageFolderID = "";
var enableTooltip = true;
var popupTimeoutId=0;

var logger;

function init() {
	
	var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
	logger = new Logger();

	bookmarksTree = document.getElementById("bookmarksTree");
	rssItemListBox = document.getElementById("rssItemListBox");
	rssTitleLabel = document.getElementById("rssTitleLabel");
	rssItemToolTip = document.getElementById("rssItemToolTip");

	strRes = document.getElementById("strRes");
	bmStrRes = document.getElementById("bmStrRes");
	resultStrArray = new Array(
		strRes.getString("RESULT_OK_STR"),
		strRes.getString("RESULT_PARSE_ERROR_STR"),
		strRes.getString("RESULT_NOT_RSS_STR"),
		strRes.getString("RESULT_NOT_FOUND_STR"),
		strRes.getString("RESULT_NOT_AVAILABLE_STR"),
		strRes.getString("RESULT_ERROR_FAILURE_STR")
	);
	
	// get the version string from the last release used
	var lastVersion = CommonFunc.getPrefValue(CommonFunc.LAST_VERSION, "str", null);
	if(lastVersion) {
		lastVersion = CommonFunc.versionStrDecode(lastVersion);
	} else {
		lastVersion = Array(0,0,0);
	}
	var currentVersion = CommonFunc.VERSION;

	// if feed folder has not been set, assume new user and install default feed folder and demo feeds
	if(!CommonFunc.getPrefValue(CommonFunc.FEED_FOLDER_ID, "str", null)) { // check for new user
		logger.info("new user, creating feed folder and setting default preferences...");
		var new_folder = BMSVC.createFolderInContainer("Sage Feeds", RDF.GetResource("NC:BookmarksRoot"), null);
		CommonFunc.setPrefValue(CommonFunc.FEED_FOLDER_ID, "str", new_folder.Value);
		if(BMSVC.createBookmarkInContainer.length == 7) { // firefox 0.8 and lower
			BMSVC.createBookmarkInContainer("BBC News | News Front Page | World Edition", "http://news.bbc.co.uk/rss/newsonline_world_edition/front_page/rss091.xml", null, "updated", null, new_folder, null);
			BMSVC.createBookmarkInContainer("Yahoo! News - Sports", "http://rss.news.yahoo.com/rss/sports", null, "updated", null, new_folder, null);
			BMSVC.createBookmarkInContainer("Sage Project News", "http://sage.mozdev.org/rss.xml", null, "updated", null, new_folder, null);
		} else {
			BMSVC.createBookmarkInContainer("BBC News | News Front Page | World Edition", "http://news.bbc.co.uk/rss/newsonline_world_edition/front_page/rss091.xml", null, "updated", null, null, new_folder, null);
			BMSVC.createBookmarkInContainer("Yahoo! News - Sports", "http://rss.news.yahoo.com/rss/sports", null, "updated", null, null, new_folder, null);
			BMSVC.createBookmarkInContainer("Sage Project News", "http://sage.mozdev.org/rss.xml", null, "updated", null, null, new_folder, null);
		}
		setCheckbox("chkShowSearchBar", "false");
		setCheckbox("chkShowTooltip", "true");
		setCheckbox("chkShowFeedItemList", "true");
		setCheckbox("chkShowFeedItemListToolbar", "true");
	} else if(CommonFunc.versionCompare(currentVersion, lastVersion)) {  // check for upgrade
		logger.info("upgrade (last version: " + CommonFunc.versionString(lastVersion, 0) + ", current version: " + CommonFunc.versionString(currentVersion, 0) + "), setting new default preferences...");
		if(CommonFunc.versionCompare(Array(1,3,0), lastVersion)) {
			setCheckbox("chkShowFeedItemListToolbar", "true");
		}
	}

	CommonFunc.setPrefValue(CommonFunc.LAST_VERSION, "str", CommonFunc.versionString(currentVersion, 0));

	// get feed folder location
	sageFolderID = CommonFunc.getPrefValue(CommonFunc.FEED_FOLDER_ID, "str", "NC:BookmarksRoot");
	// check for changes to the feed folder
	prefObserverSageFolder = CommonFunc.addPrefListener(CommonFunc.FEED_FOLDER_ID, sageFolderChanged);
	// set feed folder location
	bookmarksTree.tree.setAttribute("ref", sageFolderID);
	// select first entry
	if (bookmarksTree.treeBoxObject.selection) {
		bookmarksTree.treeBoxObject.selection.select(0);
	}

	FeedSearch.init();
	toggleShowSearchBar();
	toggleShowFeedItemList();
	toggleShowFeedItemListToolbar();

	document.documentElement.controllers.appendController(readStateController);
	readStateController.onCommandUpdate();

	logger.info("sidebar open");
}

function discoverFeeds() {
	window.openDialog("chrome://sage/contents/discover_feeds.xul", "sage_discover_feeds", "chrome,modal,close", bookmarksTree);
}

// TODO: This does not work in 0.9.x since the implementation for smart bookmarks
//       has been removed. Too bad because this feature was really nice
function showOnlyUpdated() {
	if(getCheckboxCheck("chkOnlyUpdate")) {
		var findURL = "find:datasource=rdf:bookmarks&match=";
			findURL += CommonFunc.BM_DESCRIPTION;
			findURL += "&method=is&text=updated";
		bookmarksTree.tree.setAttribute("ref", findURL);
	} else {
		bookmarksTree.tree.setAttribute("ref", sageFolderID);
	}
}

function sageFolderChanged(subject, topic, prefName) {
		// observe Preference
	sageFolderID = CommonFunc.getPrefValue(CommonFunc.FEED_FOLDER_ID, "str", "NC:BookmarksRoot");
	bookmarksTree.tree.setAttribute("ref", sageFolderID);
	bookmarksTree.treeBoxObject.view.selection.select(0);
}

function done() {
	if(prefObserverSageFolder) {
		CommonFunc.removePrefListener(prefObserverSageFolder);
	}

	if (feedLoader) {
		feedLoader.abort();
	}
	UpdateChecker.done();
	
	// remove observer
	linkVisitor.uninit();
	
	logger.info("flushing bookmark data store..");
	BMDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();

	logger.info("sidebar closed");
}

function openOPMLWizard() {
	var dialogURL = "chrome://sage/content/opml/opml.xul";
	window.openDialog(dialogURL, "", "chrome,modal,close");
}

function openSettingDialog() {
	var dialogURL = "chrome://sage/content/settings/settings.xul";
	window.openDialog(dialogURL, "", "chrome,modal,close");
}

function openSageProjectFeed() {
	lastResource = null;
	loadFeed("http://sage.mozdev.org/rss.xml", "", "Sage Project News");
}

function manageRSSList() {
	var dialogURL = "chrome://browser/content/bookmarks/bookmarksManager.xul";
	window.openDialog(dialogURL, "", "chrome,all,dialog=no", sageFolderID);
}

function updateCheck(aCheckFolderId) {
	UpdateChecker.onCheck = function(aName, aURL) {
		// TODO: Remove
	}
	UpdateChecker.onChecked = function(aName, aURL) {
		setStatusDone();
	}

	if(aCheckFolderId) {
		UpdateChecker.startCheck(aCheckFolderId);
	} else {
		UpdateChecker.startCheck(sageFolderID);
	}
}

function BookmarkResource(aRes, aDB) {
	this.res = aRes;
	this.db = aDB;
	this.name = BookmarksUtils.getProperty(this.res, CommonFunc.NC_NS + "Name", this.db);
	if(BookmarksUtils.getProperty(this.res, CommonFunc.RDF_NS + "type", this.db) == CommonFunc.NC_NS + "Bookmark") {
		this.url = BookmarksUtils.getProperty(this.res, CommonFunc.NC_NS + "URL", this.db);
	}
	if(BookmarksUtils.getProperty(this.res, CommonFunc.RDF_NS + "type", this.db) == CommonFunc.NC_NS + "Livemark") {
		this.url = BookmarksUtils.getProperty(this.res, CommonFunc.NC_NS + "FeedURL", this.db);
	}

}

function bookmarksOpen(aEvent) {
	lastResource = new BookmarkResource(bookmarksTree.currentResource, bookmarksTree.db);
	// get type of parent node
	var predicate = lastResource.db.ArcLabelsIn(lastResource.res).getNext();
	if(predicate instanceof Components.interfaces.nsIRDFResource) {
		var parent = lastResource.db.GetSource(predicate, lastResource.res, true);
	}
	var parentType = BookmarksUtils.getProperty(parent, CommonFunc.RDF_NS + "type", lastResource.db);
	// if this is a livemark child, open as a web page, otherwise process it as a feed
	if(parentType == CommonFunc.NC_NS + "Livemark") {
		getContentBrowser().loadURI(lastResource.url);
	} else {
		loadFeed(lastResource.url, aEvent);
	}
}

function createTreeContextMenu2(aEvent) {
	var popup = aEvent.target;
	if(popup.localName != "menupopup") return;

	var selection = bookmarksTree._selection;
	var itemId = selection.item[0].Value;
	var cmdSrc = "";
	var tempMenuItem;

	// get type of parent node
	var predicate = bookmarksTree.db.ArcLabelsIn(bookmarksTree.currentResource).getNext();
	if(predicate instanceof Components.interfaces.nsIRDFResource) {
		var parent = bookmarksTree.db.GetSource(predicate, bookmarksTree.currentResource, true);
	}
	var parentType = BookmarksUtils.getProperty(parent, CommonFunc.RDF_NS + "type", bookmarksTree.db);

	if((selection.type == "Bookmark" && parentType != CommonFunc.NC_NS + "Livemark") || selection.type == "Livemark") {
		cmdSrc = "GetRssTitle.getRssTitle('" + itemId + "')";
		tempMenuItem = document.createElement("menuitem");
		tempMenuItem.setAttribute("label", strRes.getString("GET_RSS_TITLE"));
		tempMenuItem.setAttribute("oncommand", cmdSrc);
		popup.appendChild(document.createElement("menuseparator"));
		popup.appendChild(tempMenuItem);
	} else if(selection.type == "Folder") {
		cmdSrc = "updateCheck('" + itemId + "')";
		tempMenuItem = document.createElement("menuitem");
		tempMenuItem.setAttribute("label", strRes.getString("CHECK_UPDATE"));
		tempMenuItem.setAttribute("oncommand", cmdSrc);
		popup.appendChild(document.createElement("menuseparator"));
		popup.appendChild(tempMenuItem);
	}

	// if we are not rendering the summary we should disable the open new window and tab
	var cmdWin = document.getElementById("cmd_bm_openinnewwindow");
	var cmdTab = document.getElementById("cmd_bm_openinnewtab");
	if (CommonFunc.getPrefValue(CommonFunc.RENDER_FEEDS, "bool", true)) {
		cmdWin.removeAttribute("disabled");
		cmdTab.removeAttribute("disabled");
	} else {
		cmdWin.setAttribute("disabled", "true");
		cmdTab.setAttribute("disabled", "true");
	}
}

function bookmarksTreeClick(aEvent) {
	var selectedItemType = BookmarksUtils.getProperty(bookmarksTree.currentResource, CommonFunc.RDF_NS + "type", bookmarksTree.db);
	switch(aEvent.type) {
		case "click":
			var obj = {};
			var row = {};
			bookmarksTree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, row, {}, obj);
			row = row.value;
			if(aEvent.button == 2 || aEvent.originalTarget.localName != "treechildren" || row == -1) {
				return;
			}
			if(obj.value == "twisty") return;
			if(selectedItemType == CommonFunc.NC_NS + "Folder") {
				bookmarksTree.treeBoxObject.view.toggleOpenState(row);
			}
			break;

		case "keypress":
			if(aEvent.originalTarget.localName != "tree") {
				return;
			}
			break;
	}

	const BOOKMARK_SEPARATOR = CommonFunc.NC_NS + "BookmarkSeparator";
	const BOOKMARK_FOLDER = CommonFunc.NC_NS + "Folder";
	if(selectedItemType == BOOKMARK_SEPARATOR || selectedItemType == BOOKMARK_FOLDER) {
		return;
	}

	bookmarksOpen(aEvent);
}

function rssItemListBoxClick(aEvent) {
	if(aEvent.type == "click") {
		if(aEvent.button == 2 || aEvent.originalTarget.localName != "listitem") {
			return;
		}
	} else if(aEvent.type == "keypress") {
		if(aEvent.originalTarget.localName != "listbox") {
			return;
		}
	}

	var listItem = rssItemListBox.selectedItem;
	var feedItem = getFeedItemFromListItem( listItem );

	// If we are using Gecko 1.8+ we are using an observer to listen to
	// changes to the history and therefore we should not the item as visited
	// here in case we failed to load it
	var rv = navigator.userAgent.match(/rv\:([^)]+)/)[1];
	if (rv < "1.8") {
		listItem.setAttribute("visited", "true");
	}
	openURI(feedItem.getLink(), aEvent);
}

function rssTitleLabelClick(aNode, aEvent){
	if(aEvent.button == 2) {
		return;
	}
	openURI(currentFeed.getLink(), aEvent);
}

function setStatusLoading(label) {
	// TODO: Remove?
	UpdateChecker.setCheckingFlag(lastResource.res, true, false);
}

function setStatusDone() {
	if (lastResource) {
		UpdateChecker.setCheckingFlag(lastResource.res, false, false);
	}
	if(currentFeed) {
		rssTitleLabel.value = currentFeed.getTitle();
		if(currentFeed.getLink()) {
			rssTitleLabel.tooltipText = currentFeed.getLink();
		} else {
			rssTitleLabel.tooltipText = "";
		}
	}
}

function setStatusError(aStatus) {
	CommonFunc.setBMDSProperty(lastResource.res, CommonFunc.BM_DESCRIPTION, CommonFunc.STATUS_ERROR + " " + CommonFunc.getBMDSProperty(lastResource.res, CommonFunc.BM_DESCRIPTION).match(/\[.*\]/));
	UpdateChecker.setCheckingFlag(lastResource.res, false, false);
}

function getContentBrowser() {
	var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	var topWindowOfType = windowManager.getMostRecentWindow("navigator:browser");
	if (topWindowOfType) {
		return topWindowOfType.document.getElementById('content');
	}
	return null;
}

function toggleShowSearchBar() {
	var showSearchBar = getCheckboxCheck("chkShowSearchBar");
	document.getElementById("barSearch").hidden = !showSearchBar;
}

function toggleShowFeedItemList() {
	var showFeedItemList = getCheckboxCheck("chkShowFeedItemList");
	document.getElementById("sage-splitter").hidden = !showFeedItemList;
	document.getElementById("rssItemListBoxBox").hidden = !showFeedItemList;
	if(showFeedItemList) setRssItemListBox();
}

function toggleShowFeedItemListToolbar() {
	var showFeedItemListToolbar = getCheckboxCheck("chkShowFeedItemListToolbar");
	document.getElementById("itemListToolbar").hidden = !showFeedItemListToolbar;
	if (showFeedItemListToolbar) readStateController.onCommandUpdate();
}

function setRssItemListBox() {
	if(!currentFeed) return;
	if(document.getElementById("rssItemListBoxBox").hidden) return;

	while(rssItemListBox.getRowCount() != 0) {
		rssItemListBox.removeItemAt(0);
	}

	linkVisitor.clearItems();
	var feedItemOrder = CommonFunc.getPrefValue(CommonFunc.FEED_ITEM_ORDER, "str", "chrono");

	var items = currentFeed.getItems(feedItemOrder);

	for(var i = 0; items.length > i; i++) {
		var item = items[i];
		var itemLabel = item.getTitle();
		itemLabel = (i+1) + ". " + itemLabel;
		var listItem = rssItemListBox.appendItem(itemLabel, i);
		linkVisitor.addItem(item.getLink(), listItem);
		if(linkVisitor.getVisited(item.getLink())) {
			listItem.setAttribute("visited", "true");
		}
	}

	readStateController.onCommandUpdate();
}

function getCheckboxCheck(element_id) {
	var checkboxNode = document.getElementById(element_id);
	return checkboxNode.getAttribute("checked") == "true";
}

function setCheckbox(element_id, value) {
	var checkboxNode = document.getElementById(element_id);
	checkboxNode.setAttribute("checked", value);
}


function populateToolTip(e) {
	// if setting disabled
	if(!getCheckboxCheck("chkShowTooltip")) {
		e.preventDefault();
		return;
	}

	if(document.tooltipNode == rssItemListBox) {
		e.preventDefault();
		return;
	}
	var listItem = document.tooltipNode;
	var feedItemOrder = CommonFunc.getPrefValue(CommonFunc.FEED_ITEM_ORDER, "str", "chrono");
	var items = currentFeed.getItems(feedItemOrder);
	var description = htmlToText(items[listItem.value].getContent());
  if(description.indexOf("/") != -1) {
    description = description.replace(/\//gm, "/\u200B");
  }
  if(description.length > 400) {
    description = description.substring(0,400) + "...";
  }

	rssItemToolTip.title = listItem.label;
	rssItemToolTip.description = description;
}

function htmlToText(aStr) {
	var	formatConverter = Components.classes["@mozilla.org/widget/htmlformatconverter;1"].createInstance(Components.interfaces.nsIFormatConverter);
	var fromStr = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
	fromStr.data = aStr;
	var toStr = { value: null };

	try {
		formatConverter.convert("text/html", fromStr, fromStr.toString().length, "text/unicode", toStr, {});
	} catch(e) {
		return aStr;
	}
	if(toStr.value) {
		toStr = toStr.value.QueryInterface(Components.interfaces.nsISupportsString);
		return toStr.toString();
	}
	return aStr;
}

function onFeedLoaded(aFeed)
{
	currentFeed = aFeed;

	if (lastResource && lastResource.res) {
		if (CommonFunc.getPrefValue(CommonFunc.AUTO_FEED_TITLE, "bool", true)) {
			var title = aFeed.getTitle()
			if (CommonFunc.getBMDSProperty(lastResource.res, CommonFunc.BM_NAME) != title) {
				CommonFunc.setBMDSProperty(lastResource.res, CommonFunc.BM_NAME, title);
			}
		}

		BMSVC.updateLastVisitedDate(lastResource.url, "UTF-8");
		CommonFunc.setBMDSProperty(lastResource.res, CommonFunc.BM_DESCRIPTION, CommonFunc.STATUS_NO_UPDATE + " " + currentFeed.getSignature());
	}

	setStatusDone();
	setRssItemListBox();

	//if (CommonFunc.getPrefValue(CommonFunc.RENDER_FEEDS, "bool", true))
	//{
	//	CreateHTML.openHTML(currentFeed);
	//}
}

function onFeedLoadError(aErrorCode) {
	setStatusError(resultStrArray[aErrorCode]);
}

function onFeedAbort(sURI) {
	// BM_FEEDURL
	var urlLiteral = RDF.GetLiteral(sURI);
	// don't do anything if this URI isn't bookmarked
	var bmResource = BMSVC.GetSource(RDF.GetResource(CommonFunc.BM_URL), urlLiteral, true);
	if (!bmResource) {	// try live mark as wll
		bmResource = BMSVC.GetSource(RDF.GetResource(CommonFunc.BM_FEEDURL), urlLiteral, true);
	}
	if (bmResource) {
		UpdateChecker.setCheckingFlag(bmResource, false, false);
	}
}

var feedLoader = new FeedLoader;
feedLoader.addListener("load", onFeedLoaded);
feedLoader.addListener("error", onFeedLoadError);
feedLoader.addListener("abort", onFeedAbort);

// This takes a list item from the rss list box and returns the uri it represents
// this seems a bit inefficient. Shouldn't there be a direct mapping between these?

/**
 * This takes a listitem element and returns the FeedItem it represents
 * @param	oListItem : XULListItem
 * @returns	FeedItem
 */
function getFeedItemFromListItem( oListItem ) {
	var feedItemOrder = CommonFunc.getPrefValue(CommonFunc.FEED_ITEM_ORDER, "str", "chrono");
	var items = currentFeed.getItems(feedItemOrder);
	return items[oListItem.value];
}

/**
 * Starts the loading of a feed. This will open up the feed summary if needed
 * @param	aURI : String	The URI to the feed
 * @param	oType : Object	If this is an Event object we check the modifiers.
 * 							Otherwise we assume it is a string describing the
 *                          window type.
 * @param	aStatus : String	Optional status text
 * @returns	void
 */
function loadFeed(aURI, oType, aStatus) {
	var wType = getWindowType(oType);
	if (wType != "tab" && wType != "window") {
		setStatusLoading(aStatus);
		feedLoader.loadURI(aURI);
	}

	if (CommonFunc.getPrefValue(CommonFunc.RENDER_FEEDS, "bool", true)) {
		openURI(CommonFunc.FEED_SUMMARY_URI + "?uri=" + encodeURIComponent(aURI), wType);
	}
}

/**
 * Returns "tab", "window" or other describing where to open the URI
 *
 * @param	oType : Object	If this is an Event object we check the modifiers.
 * 							Otherwise we assume it is a string describing the
 *                          window type.
 * @returns	String
 */
function getWindowType(oType) {
	var windowType;
	if (oType instanceof Event) {
		// figure out what kind of open we want
		if (oType.button == 1 || oType.ctrlKey) // click middle button or ctrl click
			return "tab";
		else if (oType.shiftKey)
			return "window";
	}
	return oType;
}

/**
 * Opens a link in the same window, a new tab or a new window
 *
 * @param	sURI : String
 * @param	oType : Object	If this is an Event object we check the modifiers.
 * 							Otherwise we assume it is a string describing the
 *                          window type.
 * @returns	void
 */
function openURI(sURI, oType) {
	switch (getWindowType(oType)) {
		case "tab":
			getContentBrowser().addTab(sURI);
			break;
		case "window":
			// XXX: This opens the window in the background if using the context menu
			document.commandDispatcher.focusedWindow.open(sURI);
			break;
		default:
			getContentBrowser().loadURI(sURI);
	}
	readStateController.onCommandUpdate();
}

/**
 * This is called by the context menu
 * @param	oType : String
 * @returns	void
 */
function openListItem(oType) {
	var listItem = document.popupNode;
	var feedItem = getFeedItemFromListItem(listItem);
	listItem.setAttribute("visited", "true");
	openURI(feedItem.getLink(), oType);
}

// link visit code based on LinkVisitor.mozdev.org
/*
 * This observes to the link-visited broadcast topic and calls onURIChanged when
 * an URI changed its visited state.
 */
var linkVisitor = {
	_uriFixup : Components.classes["@mozilla.org/docshell/urifixup;1"].getService(Components.interfaces.nsIURIFixup),
	_topic: "link-visited",
	
	setVisited:	function (sURI, bRead) {
		if (!sURI) {
			return;
		}

		// why do we need to fixup the URI?
		var fixupURI = this._getFixupURI(sURI);
		if (fixupURI == null) {
			return;
		}
		if (bRead) {
			if (this._ff08) {
				this._globalHistory.addPage(fixupURI);
			} else {
				// Firefox 1.1 added a forth argument used for the referrer
				this._globalHistory.addURI(fixupURI, false, true, null);
			}
		} else {
			this._browserHistory.removePage(fixupURI);
		}
	},

	getVisited : function (sURI) {
		var fixupURI = this._getFixupURI(sURI);
		if (fixupURI == null)
			return false;
		return this._globalHistory.isVisited(fixupURI);
	},

	_getFixupURI : function (sURI) {
		try {
			return this._uriFixup.createFixupURI(sURI, 0);
		}
		catch (e) {
			logger.warn("Could not fixup URI: " + sURI);
			return null;
		}
	},

	init : function () {
		// Firefox 0.8 does not support @mozilla.org/browser/global-history;2 or
		// nsIGlobalHistory2
		this._ff08 = !("@mozilla.org/browser/global-history;2" in Components.classes);
		var gh;
		if (this._ff08) {
			gh = Components.classes["@mozilla.org/browser/global-history;1"];
			linkVisitor._globalHistory = gh.getService(Components.interfaces.nsIGlobalHistory);
		} else {
			gh = Components.classes["@mozilla.org/browser/global-history;2"];
			linkVisitor._globalHistory = gh.getService(Components.interfaces.nsIGlobalHistory2);
		}
		linkVisitor._browserHistory = gh.getService(Components.interfaces.nsIBrowserHistory);
		
		// add observer
		var os = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		os.addObserver(this, this._topic, false);		
	},
	
	uninit: function () {
		this.clearItems();
		var os = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		os.removeObserver(this, this._topic);
		
	},
	
	// nsIObserver
	observe: function (aSubject, aTopic, aData) {
		// subject is an URI
		// data is null
		if (aTopic != this._topic) {
			return;
		}
		
		var uri = aSubject.QueryInterface(Components.interfaces.nsIURI);
		this.onURIChanged(uri.spec)
	},
	
	// mapping from the observer to the rss list items
	_items: {},
	
	clearItems: function () {
		this._items = {};
	},
	
	addItem: function (aURI, aListItem) {
		this._items[aURI] = aListItem;
	},
	
	onURIChanged: function (aURI) {
		if (aURI in this._items) {
			var listItem = this._items[aURI];
			if (this.getVisited(aURI)) {
				listItem.setAttribute("visited", "true");
			} else {
				listItem.removeAttribute("visited");
			}
		}
	}
};
linkVisitor.init();


// RSS Item Context Menu

/**
 * This is called before the context menu for the listbox is shown. Here we
 * enabled/disable menu items as well as change the text to correctly reflect
 * the read state
 * @returns	void
 */
function updateItemContextMenu() {
	readStateController.onCommandUpdate();
	document.getElementById("rssMarkAsReadItem").hidden =
		!readStateController.isCommandEnabled("cmd_markasread");
	document.getElementById("rssMarkAsUnreadItem").hidden =
		!readStateController.isCommandEnabled("cmd_markasunread");
}


/**
 * Marks all read or unread
 * @param	bRead : Boolean	Whether to mark as read or unread
 * @returns	void
 */
function markAllReadState(bRead) {
	if (currentFeed) {
		var feedItemOrder = CommonFunc.getPrefValue(CommonFunc.FEED_ITEM_ORDER, "str", "chrono");
		var feedItems = currentFeed.getItems(feedItemOrder);

		for (var i = 0; i < feedItems.length; i++)
			linkVisitor.setVisited(feedItems[i].getLink(), bRead);

		var listItem;
		for (var y = 0; y < rssItemListBox.getRowCount(); y++)
		{
			listItem = rssItemListBox.getItemAtIndex(y);
			if (bRead)
				listItem.setAttribute("visited", "true");
			else
				listItem.removeAttribute("visited");
		}
	}
}


/**
 * This marks the selected items as read/unread. This works with multiple
 * selection as well if we want to enable that in the future.
 * @param	bRead : Boolean		Whether to mark items read or unread
 * @returns	void
 */
function markReadState(bRead) {
	var listItems = rssItemListBox.selectedItems;
	for (var i = 0; i < listItems.length; i++) {
		var listItem = listItems[i];
		var feedItem = getFeedItemFromListItem(listItem);
		var uri = feedItem.getLink();
		if (bRead)
			listItem.setAttribute("visited", "true");
		else
			listItem.removeAttribute("visited");
		linkVisitor.setVisited(uri, bRead);
	}
}

/**
 * This toggles the selected items read state. This works with multiple
 * selection as well if we want to enable that in the future.
 *
 * In Thunderbird, pressing M marks all read on unread based on the first
 * item. This seems more consistent and more useful
 *
 * @returns	void
 */
function toggleMarkAsRead() {
	var listItems = rssItemListBox.selectedItems;
	var read;
	for (var i = 0; i < listItems.length; i++) {
		var listItem = listItems[i];
		var feedItem = getFeedItemFromListItem(listItem);
		var uri = feedItem.getLink();
		if (read == null)
			read = !linkVisitor.getVisited(uri);
		if (read)
			listItem.setAttribute("visited", "true");
		else
			listItem.removeAttribute("visited");
		linkVisitor.setVisited(uri, read);
	}
}


/**
 * This controller object takes care of the commands related to marking feed
 * items as read
 */
var readStateController = {
	supportsCommand : function(cmd) {
		switch (cmd) {
			case "cmd_markasread":
			case "cmd_markasunread":
			case "cmd_toggleread":
			case "cmd_markallasread":
			case "cmd_markallasunread":
				return true;
			default:
				return false;
		}
	},

	isCommandEnabled : function(cmd) {
		var items, feedItem, visited, i;

		if (!getCheckboxCheck("chkShowFeedItemList"))
			return false;

		switch (cmd) {
			// Enable if any items available. A more exact solution is to loop
			// over the item and disable/enable dependiong on whether all items
			// are read/unread. This solution is however too slow to be practical.
			case "cmd_markallasread":
			case "cmd_markallasunread":
				return rssItemListBox.getRowCount() > 0;

			// There is a state where we mark a listitem as visited even though
			// we don't know if the server will respond and therefore the link
			// might be unread in the history and read in the UI. In these cases
			// both mark as read and mark as unread needs to be enabled

			case "cmd_markasread":
				items = rssItemListBox.selectedItems;

				// if we have one non visited we can mark as read
				for (i = 0; i < items.length; i++) {
					feedItem = getFeedItemFromListItem( items[i] );
					visited = linkVisitor.getVisited( feedItem.getLink() );
					if (!visited || items[i].getAttribute("visited") != "true")
						return true;
				}
				return false;

			case "cmd_markasunread":
				items = rssItemListBox.selectedItems;

				// if we have one visited we can mark as unread
				for (i = 0; i < items.length; i++) {
					feedItem = getFeedItemFromListItem( items[i] );
					visited = linkVisitor.getVisited( feedItem.getLink() );
					if (visited || items[i].getAttribute("visited") == "true")
						return true;
				}
				return false;

			case "cmd_toggleread":
				return this.isCommandEnabled("cmd_markasread") ||
					   this.isCommandEnabled("cmd_markasunread");
		}

		return false;
	},
	doCommand : function(cmd) {
		switch (cmd) {
			case "cmd_markasread":
				markReadState(true);
				break;

			case "cmd_markasunread":
				markReadState(false);
				break;

			case "cmd_toggleread":
				toggleMarkAsRead();
				break;

			case "cmd_markallasread":
				markAllReadState(true);
				break;

			case "cmd_markallasunread":
				markAllReadState(false);
				break;
		}
		this.onCommandUpdate();
	},

	onCommandUpdate: function () {
		var commands = ["cmd_markasread", "cmd_markasunread",
						"cmd_toggleread",
						"cmd_markallasread", "cmd_markallasunread"];
		for (var i = 0; i < commands.length; i++)
			goSetCommandEnabled(commands[i], this.isCommandEnabled(commands[i]));
	},

	onEvent : function(evt){ }
};
