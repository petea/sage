const USER_AGENT = CommonFunc.USER_AGENT;

const RESULT_OK = 0;
const RESULT_PARSE_ERROR = 1;
const RESULT_NOT_RSS = 2;
const RESULT_NOT_FOUND = 3;
const RESULT_NOT_AVAILABLE = 4;
const RESULT_ERROR_FAILURE = 5;

var resultStrArray = null;

	// XUL Object
var strRes // stringbundle Object
var bookmarksTree;
var rssItemListBox;
var rssStatusImage;
var rssStatusLabel;
var rssTitleLabel;
var rssItemToolTip;

var currentFeed;
var httpReq;
var prefObserverSageFolder;
var responseXML;
var lastResource;
var rssLoading = false;
var sageFolderID = "";
var enableTooltip = true;
var popupTimeoutId=0;


function init() {
	bookmarksTree = document.getElementById("bookmarksTree");
	rssItemListBox = document.getElementById("rssItemListBox");
	rssStatusImage = document.getElementById("rssStatusImage");
	rssStatusLabel = document.getElementById("rssStatusLabel");
	rssTitleLabel = document.getElementById("rssTitleLabel");
	rssItemToolTip = document.getElementById("rssItemToolTip");

	strRes = document.getElementById("strRes");
	resultStrArray = new Array(
		strRes.getString("RESULT_OK_STR"),
		strRes.getString("RESULT_PARSE_ERROR_STR"),
		strRes.getString("RESULT_NOT_RSS_STR"),
		strRes.getString("RESULT_NOT_FOUND_STR"),
		strRes.getString("RESULT_NOT_AVAILABLE_STR"),
		strRes.getString("RESULT_ERROR_FAILURE_STR")
	);

	// if feed folder has not been set, assume new user and install default feed folder and demo feeds
	if(!CommonFunc.getPrefValue(CommonFunc.RSS_READER_FOLDER_ID, "str", null)) {
		logMessage("setting default preferences...");
		var new_folder = BMSVC.createFolderInContainer("Sage Feeds", RDF.GetResource("NC:BookmarksRoot"), null);
		CommonFunc.setPrefValue(CommonFunc.RSS_READER_FOLDER_ID, "str", new_folder.Value);
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
	}

	// get feed folder location
	sageFolderID = CommonFunc.getPrefValue(CommonFunc.RSS_READER_FOLDER_ID, "str", "NC:BookmarksRoot");
	// check for changes to the feed folder
	prefObserverSageFolder = CommonFunc.addPrefListener(CommonFunc.RSS_READER_FOLDER_ID, sageFolderChanged);
	// set feed folder location
	bookmarksTree.tree.setAttribute("ref", sageFolderID);
	// select first entry
	bookmarksTree.treeBoxObject.selection.select(0);

	FeedSearch.init();
	toggleShowSearchBar();
	toggleShowFeedItemList();

	logMessage("initialized");
}

function discoverFeeds() {
	window.openDialog("chrome://sage/contents/discover_feeds.xul", "sage_discover_feeds", "chrome,modal,close", bookmarksTree);
}

	// XV‚³‚ê‚½RSS‚Ì‚Ý•\Ž¦
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
	sageFolderID = CommonFunc.getPrefValue(CommonFunc.RSS_READER_FOLDER_ID, "str", "NC:BookmarksRoot");
	bookmarksTree.tree.setAttribute("ref", sageFolderID);
	bookmarksTree.treeBoxObject.selection.select(0);
}

function done() {
	if(prefObserverSageFolder) {
		CommonFunc.removePrefListener(prefObserverSageFolder);
	}

	if(rssLoading) {
		httpReq.abort();
		rssLoading = false;
	}
	UpdateChecker.done();

	logMessage("shutdown");
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
	var feedURL = "http://sage.mozdev.org/rss.xml";
	setStatusLoading("Sage Project News");
	httpGet(feedURL);
}

function manageRSSList() {
	var dialogURL = "chrome://browser/content/bookmarks/bookmarksManager.xul";
	window.openDialog(dialogURL, "", "chrome,all,dialog=no", sageFolderID);
}

function updateCheck(aCheckFolderId) {	
	UpdateChecker.onCheck = function(aName, aURL) {
			rssStatusImage.setAttribute("loading", "true");
			rssStatusLabel.value = strRes.getString("RESULT_CHECKING") + ": " + aName;
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
	
function BookmarkResource(aRes, aDB){
	this.res = aRes;
	this.db = aDB;
	this.name = BookmarksUtils.getProperty(this.res, NC_NS + "Name", this.db);
	this.url = BookmarksUtils.getProperty(this.res, NC_NS + "URL", this.db);
}

function bookmarksOpen(){
	lastResource = new BookmarkResource(bookmarksTree.currentResource, bookmarksTree.db);
	setStatusLoading();
	httpGet(lastResource.url);
}

function createTreeContextMenu2(aEvent) {
	var popup = aEvent.target;
	if(popup.localName != "menupopup") return;

	var selection = bookmarksTree._selection;
	var itemId = selection.item[0].Value;
	var cmdSrc = "";
	var tempMenuItem;

	if(selection.type == "Bookmark") {
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
}

function bookmarksTreeClick(aEvent){
	if(aEvent.type == "click") {
		if(aEvent.button == 2 || aEvent.originalTarget.localName != "treechildren") {
			return;
		}
		var obj = {};
		bookmarksTree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, {}, {}, obj);
		if(obj.value == "twisty") return;
	} else if(aEvent.type == "keypress") {
		if(aEvent.originalTarget.localName != "tree") {
			return;
		}
	}
	
	CreateHTML.tabbed = false;
	if(aEvent.button == 1) { CreateHTML.tabbed = true; } // click middle button
	if(aEvent.ctrlKey) { CreateHTML.tabbed = true; } // press Ctrl Key

	const BOOKMARK_TYPE = RDF_NS + "type";
	const BOOKMARK_SEPARATOR = NC_NS + "BookmarkSeparator";
	const BOOKMARK_FOLDER = NC_NS + "Folder"
	var bookmarkType = (BookmarksUtils.getProperty(bookmarksTree.currentResource, BOOKMARK_TYPE , bookmarksTree.db))
	if(bookmarkType == BOOKMARK_SEPARATOR || bookmarkType == BOOKMARK_FOLDER) {
		return;
	}
	
	bookmarksOpen();
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

	var feedItemOrder = CommonFunc.getPrefValue(CommonFunc.FEED_ITEM_ORDER, "str", "chrono");

	var selectedItem = rssItemListBox.selectedItem;
	var items = currentFeed.getItems(feedItemOrder);
	var link = items[selectedItem.value].getLink();
	var tabbed = false;

	if(aEvent.button == 1) { tabbed = true; } // click middle button
	if(aEvent.ctrlKey) { tabbed = true; } // press Ctrl Key
	
	if(tabbed) {
		getContentBrowser().addTab(link);	
	} else {
		getContentBrowser().loadURI(link);
	}
	selectedItem.setAttribute("visited", "true");
}

function rssTitleLabelClick(aNode, aEvent){
	var tabbed = false;
	if(!aNode.hasAttribute("href") || aEvent.button == 2) {
		return;
	}

	var link = aNode.getAttribute("href");
	tabbed = false;

	if(aEvent.button == 1) { tabbed =true; } // click middle button
	if(aEvent.ctrlKey) { tabbed = true; } // press Ctrl Key
	
	if(tabbed) {
		getContentBrowser().addTab(link);	
	} else {
		getContentBrowser().loadURI(link);
	}
}

function setStatusLoading(label) {
	rssStatusImage.setAttribute("loading", "true");
	if(label) {
		rssStatusLabel.value = strRes.getString("RESULT_LOADING") + ": " + label;
	} else {
		rssStatusLabel.value = strRes.getString("RESULT_LOADING") + ": " + lastResource.name;
	}
}

function setStatusDone() {
	rssStatusImage.setAttribute("loading", "false");
	rssStatusLabel.value = "";

	if(currentFeed) {
		rssTitleLabel.value = htmlToText(currentFeed.getTitle());
		if(currentFeed.getLink()) {
			rssTitleLabel.setAttribute("href", currentFeed.getLink());
			rssTitleLabel.tooltipText = currentFeed.getLink();
		} else {
			rssTitleLabel.removeAttribute("href");
			rssTitleLabel.tooltipText = "";
		}
	}
}

function setStatusError(aStatus) {
	rssStatusImage.setAttribute("loading", "error");
	rssStatusLabel.value = "Error: " + aStatus;
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

function setRssItemListBox() {
	if(!currentFeed) return;
	if(document.getElementById("rssItemListBoxBox").hidden) return;

	while(rssItemListBox.getRowCount() != 0) {
		rssItemListBox.removeItemAt(0);
	}

	var feedItemOrder = CommonFunc.getPrefValue(CommonFunc.FEED_ITEM_ORDER, "str", "chrono");

	var items = currentFeed.getItems(feedItemOrder);

	for(var i = 0; items.length > i; i++) {
		var item = items[i];
		var itemLabel = item.getTitle();
		itemLabel = (i+1) + ". " + itemLabel;
		var listItem = rssItemListBox.appendItem(itemLabel, i);
		if(isVisited(item.getLink())) {
			listItem.setAttribute("visited", "true");
		}
	}
}

function isVisited(aURL) {
	try {
		var globalHistory = Components.classes["@mozilla.org/browser/global-history;1"].getService(Components.interfaces.nsIGlobalHistory);
		var URI = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
		URI.spec = aURL;
		return globalHistory.isVisited(URI.spec);
	} catch(e) {}
	return false;
}

function getCheckboxCheck(element_id) {
	var checkboxNode = document.getElementById(element_id);
	return checkboxNode.getAttribute("checked") == "true";
}

function setCheckbox(element_id, value) {
	var checkboxNode = document.getElementById(element_id);
	checkboxNode.setAttribute("checked", value);
}

function showRssItemListPopup(aEvent) {
	if(aEvent.originalTarget.localName != "listitem") {
		rssItemListPopup.hidePopup();
		return;
	}
	if(!getCheckboxCheck("chkShowTooltip")) {
		rssItemListPopup.hidePopup();
		return;
	}

	var feedItemOrder = CommonFunc.getPrefValue(CommonFunc.FEED_ITEM_ORDER, "str", "chrono");
	
	var items = currentFeed.getItems(feedItemOrder);

	var description = htmlToText(items[aEvent.originalTarget.value].getContent());
	if(description.indexOf("/") != -1) {
		description = description.replace(/\//gm, "/\u200B");
	}
		// description ‚ð400•¶ŽšˆÈ“à‚É‚·‚é
	if(description.length > 400) {
		description = description.substring(0,400) + "...";
	}

	var popX = aEvent.screenX + 10;
	var popY = aEvent.screenY + 20;

	rssItemListPopup.title = aEvent.originalTarget.label;
	rssItemListPopup.description = description;
	rssItemListPopup.autoPosition = false;
	rssItemListPopup.moveTo(popX, popY);
	popupTimeoutId = setTimeout("rssItemListPopup.showPopup(rssItemListBox)", 150);
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

function hideRssItemListPopup(aEvent) {
	clearTimeout(popupTimeoutId);
	rssItemListPopup.hidePopup();
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



// ++++++++++ +++++++++  HTTP	++++++++++ +++++++++ 

function httpGet(aURL) {
	if(rssLoading) {
		httpReq.abort();
		rssLoading = false;
	}

	responseXML = null;

	httpReq = new XMLHttpRequest();

	httpReq.open("GET", aURL);

	httpReq.onload = httpLoaded;	
	httpReq.onerror = httpError;
	httpReq.onreadystatechange = httpReadyStateChange;

	try {
		httpReq.setRequestHeader("User-Agent", USER_AGENT);
		httpReq.overrideMimeType("application/xml");
	} catch(e) {
		httpGetResult(RESULT_ERROR_FAILURE);
	}

	try {
		httpReq.send(null);
		rssLoading = true;
	} catch(e) {
		httpGetResult(RESULT_ERROR_FAILURE);
	}
}

function httpError(e) {
	logMessage("HTTP Error");
}

function httpReadyStateChange() {

	if(httpReq.readyState == 2) {
		try {
			if(httpReq.status == 404) {
				httpGetResult(RESULT_NOT_FOUND);
			}
		} catch(e) {
			httpGetResult(RESULT_NOT_AVAILABLE);
			return;
		}
	} else if(httpReq.readyState == 3) {}
}

function httpLoaded(e) {
	responseXML = httpReq.responseXML;
	var rootNodeName = responseXML.documentElement.localName.toLowerCase();

	switch(rootNodeName) {
		case "parsererror":
			// XML Parse Error
			httpGetResult(RESULT_PARSE_ERROR);
			break;
		case "rss":
		case "rdf":
		case "feed":
			httpGetResult(RESULT_OK);
			break;
		default:
			// Not RSS or ATOM
			httpGetResult(RESULT_NOT_RSS);
			break;
	}
}

function httpGetResult(aResultCode) {
	httpReq.abort();
	rssLoading = false;

	if(aResultCode == RESULT_OK) {
		currentFeed = new Feed(responseXML);

		if(lastResource && lastResource.res) {
			if(CommonFunc.getPrefValue(CommonFunc.AUTO_FEED_TITLE, "bool", true)) {
				if(CommonFunc.getBMDSProperty(lastResource.res, CommonFunc.BM_NAME) != currentFeed.getTitle()) {
					CommonFunc.setBMDSProperty(lastResource.res, CommonFunc.BM_NAME, currentFeed.getTitle());
				}
			}

			BMSVC.updateLastVisitedDate(lastResource.url, "UTF-8");
			CommonFunc.setBMDSProperty(lastResource.res, CommonFunc.BM_DESCRIPTION, CommonFunc.STATUS_NO_UPDATE + " " + currentFeed.getSignature());
		}

		setStatusDone();
		setRssItemListBox();
		
		if(CommonFunc.getPrefValue(CommonFunc.RENDER_FEEDS, "bool", true)) {
			CreateHTML.openHTML(currentFeed);
		}
	} else {
		setStatusError(resultStrArray[aResultCode]);
	}
}