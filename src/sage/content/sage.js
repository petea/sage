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
var rssItemListPopup;

var rssObject;
var httpReq;
var prefObserverSageFolder;
var responseXML;
var lastResource;
var rssLoading = false;
var sageFolderID = "";
var enableTooltip = true;
var popupTimeoutId=0;

function init(){
	strRes = document.getElementById("strRes");
	bookmarksTree = document.getElementById("bookmarksTree");
	rssItemListBox = document.getElementById("rssItemListBox");
	rssStatusImage = document.getElementById("rssStatusImage");
	rssStatusLabel = document.getElementById("rssStatusLabel");
	rssTitleLabel = document.getElementById("rssTitleLabel");
	rssItemListPopup = document.getElementById("rssItemListPopup");

	resultStrArray = new Array(
		strRes.getString("RESULT_OK_STR"),
		strRes.getString("RESULT_PARSE_ERROR_STR"),
		strRes.getString("RESULT_NOT_RSS_STR"),
		strRes.getString("RESULT_NOT_FOUND_STR"),
		strRes.getString("RESULT_NOT_AVAILABLE_STR"),
		strRes.getString("RESULT_ERROR_FAILURE_STR")
	);

  	// Load Preference
	sageFolderID = CommonFunc.getPrefValue(CommonFunc.RSS_READER_FOLDER_ID, "str", "NC:BookmarksRoot");
  	// observe Preference
  	prefObserverSageFolder = CommonFunc.addPrefListener(CommonFunc.RSS_READER_FOLDER_ID, sageFolderChanged);

	bookmarksTree.tree.setAttribute("ref", sageFolderID);
	bookmarksTree.treeBoxObject.selection.select(0);
	
	FeedSearch.init();
	toggleShowSearchBar();
	toggleShowFeedItemList();
}


	// 更新されたRSSのみ表示
function showOnlyUpdated(){
	if(getCheckboxCheck("chkOnlyUpdate")){
		var findURL = "find:datasource=rdf:bookmarks&match=";
			findURL += CommonFunc.BM_DESCRIPTION;
			findURL += "&method=is&text=updated";
		bookmarksTree.tree.setAttribute("ref", findURL);
	}else{
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
	if(prefObserverSageFolder){
		CommonFunc.removePrefListener(prefObserverSageFolder);
	}

	if(rssLoading) {
		httpReq.abort();
		rssLoading = false;
	}
	UpdateChecker.done();
}

function openOPMLWizard() {
	var dialogURL = "chrome://sage/content/opml/opml.xul";
	window.openDialog(dialogURL, "", "chrome,dialog,modal");
}

function openSettingDialog() {
	var dialogURL = "chrome://sage/content/settings/settings.xul";
	window.openDialog(dialogURL, "", "chrome,dialog,modal");
}

function manageRSSList() {
	var dialogURL = "chrome://browser/content/bookmarks/bookmarksManager.xul";
	window.openDialog(dialogURL, "", "chrome,all,dialog=no", sageFolderID);
}


function updateCheck(aCheckFolderId) {	
	UpdateChecker.onCheck = function(aName, aURL) {
			rssStatusImage.setAttribute("loading", "true");
			rssStatusLabel.value = "Checking: " + aName;
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


function createTreeContextMenu2(aEvent){
	var popup = aEvent.target;
	if(popup.localName != "menupopup") return;

	var selection = bookmarksTree._selection;
	var itemId = selection.item[0].Value;
	var cmdSrc = "";

	if(selection.type == "Bookmark"){
		cmdSrc = "GetRssTitle.getRssTitle('" + itemId + "')";
		var tempMenuItem = document.createElement("menuitem");
		tempMenuItem.setAttribute("label", strRes.getString("GET_RSS_TITLE"));
		tempMenuItem.setAttribute("oncommand", cmdSrc);
		popup.appendChild(document.createElement("menuseparator"));
		popup.appendChild(tempMenuItem);
	}else if(selection.type == "Folder"){
		cmdSrc = "updateCheck('" + itemId + "')";
		var tempMenuItem = document.createElement("menuitem");
		tempMenuItem.setAttribute("label", strRes.getString("CHECK_UPDATE"));
		tempMenuItem.setAttribute("oncommand", cmdSrc);
		popup.appendChild(document.createElement("menuseparator"));
		popup.appendChild(tempMenuItem);
	}
}

function bookmarksTreeClick(aEvent){
	if(aEvent.type == "click"){
		if(aEvent.button == 2 || aEvent.originalTarget.localName != "treechildren"){
			return;
		}
		var obj = {};
		bookmarksTree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, {}, {}, obj);
		if(obj.value == "twisty") return;
	}else if(aEvent.type == "keypress"){
		if(aEvent.originalTarget.localName != "tree"){
			return;
		}
	}
	
	CreateHTML.tabbed = false;
	if(aEvent.button == 1){ CreateHTML.tabbed = true; } // click middle button
	if(aEvent.ctrlKey){ CreateHTML.tabbed = true; } // press Ctrl Key

	const BOOKMARK_TYPE = RDF_NS + "type";
	const BOOKMARK_SEPARATOR = NC_NS + "BookmarkSeparator";
	const BOOKMARK_FOLDER = NC_NS + "Folder"
	var bookmarkType = (BookmarksUtils.getProperty(bookmarksTree.currentResource,
							BOOKMARK_TYPE , bookmarksTree.db))
	if(bookmarkType == BOOKMARK_SEPARATOR || bookmarkType == BOOKMARK_FOLDER){
		return;
	}
	
	bookmarksOpen();
}



function rssItemListBoxClick(aEvent){
	if(aEvent.type == "click"){
		if(aEvent.button == 2 || aEvent.originalTarget.localName != "listitem"){
			return;
		}
	}else if(aEvent.type == "keypress"){
		if(aEvent.originalTarget.localName != "listbox"){
			return;
		}
	}

	var selectedItem = rssItemListBox.selectedItem;
	var link = rssObject.items[selectedItem.value].link;
	var tabbed = false;

	if(aEvent.button == 1){ tabbed = true; } // click middle button
	if(aEvent.ctrlKey){ tabbed = true; } // press Ctrl Key
	
	if(tabbed){
		getContentBrowser().addTab(link);	
	}else{
		getContentBrowser().loadURI(link);
	}
	selectedItem.setAttribute("visited", "true");
}


function rssTitleLabelClick(aNode, aEvent){
	var tabbed = false;
	if(!aNode.hasAttribute("href") || aEvent.button == 2){
		return;
	}

	var link = aNode.getAttribute("href");
	var tabbed = false;

	if(aEvent.button == 1){ tabbed =true; } // click middle button
	if(aEvent.ctrlKey){ tabbed = true; } // press Ctrl Key
	
	if(tabbed){
		getContentBrowser().addTab(link);	
	}else{
		getContentBrowser().loadURI(link);
	}
}


function setStatusLoading(){
	rssStatusImage.setAttribute("loading", "true");
	rssStatusLabel.value = "Loading: " + lastResource.name;
}

function setStatusDone(){
	rssStatusImage.setAttribute("loading", "false");
	rssStatusLabel.value = "";

	if(rssObject){
		rssTitleLabel.value = htmlToText(rssObject.title);
		if(rssObject.link){
			rssTitleLabel.setAttribute("href", rssObject.link);
			rssTitleLabel.tooltipText = rssObject.link;
		}else{
			rssTitleLabel.removeAttribute("href");
			rssTitleLabel.tooltipText = "";
		}
	}
}

function setStatusError(aStatus){
	rssStatusImage.setAttribute("loading", "error");
	rssStatusLabel.value = "Error: " + aStatus;
}


	// ブラウザオブジェクトを返す
function getContentBrowser(){
	var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1']
							.getService(Components.interfaces.nsIWindowMediator);
	var topWindowOfType = windowManager.getMostRecentWindow("navigator:browser");
	if (topWindowOfType) {
		return topWindowOfType.document.getElementById('content');
	}
	return null;
}


	// RSS
function createRssObject(){
	if(!responseXML){ return; }
	
	rssObject = {
		rssURL: lastResource.url,
		title: "",
		link: "",
		description: "",
		charSet: responseXML.characterSet,
		items: new Array()
	}

	var rootNodeName = responseXML.documentElement.localName.toLowerCase();
	if(rootNodeName == "feed"){
		createRssObjectAtom();
		return;
	}

	var channelNode;
	if(responseXML.getElementsByTagName("channel").length != 0){
		channelNode = responseXML.getElementsByTagName("channel")[0];
	}else{
		return;
	}

	for(var i = channelNode.firstChild; i!=null; i=i.nextSibling){
		if(i.nodeType != i.ELEMENT_NODE) continue;
		switch(i.localName){
			case "title":
				rssObject.title = CommonFunc.getInnerText(i);
				break;
			case "link":
				rssObject.link = CommonFunc.getInnerText(i);
				break;
			case "description":
				rssObject.description = CommonFunc.getInnerText(i);
				break;
		}
	}

	var itemNodes = responseXML.getElementsByTagName("item");
	for(i=0; itemNodes.length>i; i++){
		var rssItem = {title:"", link:"", description:"", content:"", pubDate:""};

		for(var j = itemNodes[i].firstChild; j!=null; j=j.nextSibling){
			if(j.nodeType != j.ELEMENT_NODE) continue;
			switch(j.localName){
				case "title":
					rssItem.title = CommonFunc.getInnerText(j);
					break;
				case "link":
					rssItem.link = CommonFunc.getInnerText(j);
					break;
				case "guid":
					if(!rssItem.link){
						rssItem.link = CommonFunc.getInnerText(j);
					}
					break;
				case "description":
					rssItem.description = CommonFunc.getInnerText(j);
					break;
				case "encoded":
					rssItem.content = CommonFunc.getInnerText(j);
					break;
				case "pubDate":
					rssItem.pubDate = new Date(CommonFunc.getInnerText(j));
					break;
				case "date":
					tmp_str = CommonFunc.getInnerText(j);
					tmp_date = new Date();
					tmp_date.setUTCFullYear(tmp_str.substring(0,4));
					tmp_date.setUTCMonth(tmp_str.substring(5,7) - 1);
					tmp_date.setUTCDate(tmp_str.substring(8,10));
					tmp_date.setUTCHours(tmp_str.substring(11,13));
					tmp_date.setUTCMinutes(tmp_str.substring(14,16));
					tmp_date.setUTCSeconds(tmp_str.substring(17,19));
					rssItem.pubDate = new Date(tmp_date);
					break;
			}
		}
			// title が無いときの処理
		if(!rssItem.title) {
			if(rssItem.description) {
				tempStr = rssItem.description.replace(/<.*?>/g,'');
				rssItem.title = tempStr.substring(0, 30) + "...";
			}
		}
			// content が無いときの処理
		if(!rssItem.content) rssItem.content = rssItem.description;
			// description をプレーンテキストにする
		rssItem.description = htmlToText(rssItem.description);

		rssObject.items.push(rssItem);
	}
}


	// ATOM
function createRssObjectAtom(){
	for(var i = responseXML.documentElement.firstChild; i!=null; i=i.nextSibling){
		if(i.nodeType != i.ELEMENT_NODE) continue;
		switch(i.localName){
			case "title":
				rssObject.title = CommonFunc.getInnerText(i);
				break;
			case "link":
				if(rssObject.link){
					if(i.getAttribute("rel") == "alternate"){
						rssObject.link = i.getAttribute("href");
					}
				}else{
					rssObject.link = i.getAttribute("href");
				}
				break;
			case "tagline":
				rssObject.description = CommonFunc.getInnerText(i);
				break;
		}
	}

	var entryNodes = responseXML.getElementsByTagName("entry");
	for(i=0; entryNodes.length>i; i++){
		var rssItem = {title:"", link:"", description:"", content:"", pubDate:""};

		var titleNodes = entryNodes[i].getElementsByTagName("title");
		if(titleNodes.length) rssItem.title = CommonFunc.getInnerText(titleNodes[0]);

		var linkNodes = entryNodes[i].getElementsByTagName("link");
		if(linkNodes.length) {
			for (j = 0; j < linkNodes.length; j++) {
				if (linkNodes[j].getAttribute("rel") == "alternate") {
					rssItem.link = linkNodes[j].getAttribute("href");
					break;
				}
			}
		}


		var issuedNodes = entryNodes[i].getElementsByTagName("issued");
		if(issuedNodes.length) {
			tmp_str = CommonFunc.getInnerText(issuedNodes[0]);
			tmp_date = new Date();
			tmp_date.setUTCFullYear(tmp_str.substring(0,4));
			tmp_date.setUTCMonth(tmp_str.substring(5,7) - 1);
			tmp_date.setUTCDate(tmp_str.substring(8,10));
			tmp_date.setUTCHours(tmp_str.substring(11,13));
			tmp_date.setUTCMinutes(tmp_str.substring(14,16));
			tmp_date.setUTCSeconds(tmp_str.substring(17,19));
			rssItem.pubDate = new Date(tmp_date);
		}

		rssItem.content = getAtomContent(entryNodes[i]);
		rssItem.description = htmlToText(rssItem.content);
		rssObject.items.push(rssItem);
	}
}


function getAtomContent(aEntryNode){
	var contentNodes = aEntryNode.getElementsByTagName("content");
	var contentArray = new Array();
	for(var i=0; i<contentNodes.length; i++){
		var contType = contentNodes[i].getAttribute("type");
		contentArray[contType] = CommonFunc.getInnerText(contentNodes[i]);
	}

	if("application/xhtml+xml" in contentArray) return contentArray["application/xhtml+xml"];
	if("text/html" in contentArray) return contentArray["text/html"];
	if("text/plain" in contentArray) return contentArray["text/plain"];

	var summaryNodes = aEntryNode.getElementsByTagName("summary");
	if(summaryNodes.length) return CommonFunc.getInnerText(summaryNodes[0]);

	return "";
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
	if(!rssObject) return;
	if(document.getElementById("rssItemListBoxBox").hidden) return;

	while(rssItemListBox.getRowCount() != 0){
		rssItemListBox.removeItemAt(0);
	}

	for(var i=0; rssObject.items.length>i; i++){
		var rssItem = rssObject.items[i];
		var itemLabel = rssItem.title ? htmlToText(rssItem.title) : "No Title";
		var listItem = rssItemListBox.appendItem(itemLabel, i);
		
		if(isVisited(rssItem.link)){
			listItem.setAttribute("visited", "true");
		}		
	}
}


 // URL が訪問済みか調べる
function isVisited(aURL){
	try{
		var globalHistory = Components.classes["@mozilla.org/rdf/datasource;1?name=history"]
							.getService(Components.interfaces.nsIGlobalHistory);
			// ドメインの小文字化を nsIURI に任せる 
		var URI = Components.classes['@mozilla.org/network/standard-url;1']
						.createInstance(Components.interfaces.nsIURI);
		URI.spec = aURL;
		return globalHistory.isVisited(URI.spec);
	}catch(e){}
	return false;
}

function getCheckboxCheck(aID){
	var checkboxNode = document.getElementById(aID);
	return checkboxNode.getAttribute("checked") == "true";
}

function showRssItemListPopup(aEvent){
	if(aEvent.originalTarget.localName != "listitem"){
		rssItemListPopup.hidePopup();
		return;
	}
	if(!getCheckboxCheck("chkShowTooltip")){
		rssItemListPopup.hidePopup();
		return;
	}
	
	var description = rssObject.items[aEvent.originalTarget.value].description;
		// 折り返しをするために URLの / の前にゼロ幅スペースを追加
	if(description.indexOf("/") != -1){
		description = description.replace(/\//gm, "/\u200B");
	}
		// description を400文字以内にする
	if(description.length > 400){
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

function hideRssItemListPopup(aEvent){
	clearTimeout(popupTimeoutId);
	rssItemListPopup.hidePopup();
}


function htmlToText(aStr){
	var	formatConverter = Components.classes["@mozilla.org/widget/htmlformatconverter;1"]
								.createInstance(Components.interfaces.nsIFormatConverter);
	var fromStr = Components.classes["@mozilla.org/supports-string;1"]
								.createInstance(Components.interfaces.nsISupportsString);
	fromStr.data = aStr;
	var toStr = { value: null };

	try{
		formatConverter.convert("text/html", fromStr, fromStr.toString().length,
									"text/unicode", toStr, {});
	}catch(e){
		return aStr;
	}
	if(toStr.value){
		toStr = toStr.value.QueryInterface(Components.interfaces.nsISupportsString);
		return toStr.toString();
	}
	return aStr;
}


 // ++++++++++ +++++++++  HTTP	++++++++++ +++++++++ 

function httpGet(aURL){
	if(rssLoading){
		httpReq.abort();
		rssLoading = false;
	}

	responseXML = null;

	httpReq = new XMLHttpRequest();
	httpReq.onload = httpLoaded;	
	httpReq.onerror = httpError;
	httpReq.onreadystatechange = httpReadyStateChange;


	try{
		httpReq.open("GET" , aURL);
		httpReq.setRequestHeader("User-Agent", USER_AGENT);
		httpReq.overrideMimeType("application/xml");
	}catch(e){
		httpGetResult(RESULT_ERROR_FAILURE);
	}

	try{
		httpReq.send(null);
		rssLoading = true;
	}catch(e){
		httpGetResult(RESULT_ERROR_FAILURE);
	}
}

function httpError(e){}
function httpReadyStateChange(){

	if(httpReq.readyState == 2){
		try{
			if(httpReq.status == 404){
				httpGetResult(RESULT_NOT_FOUND);
			}
		}catch(e){
			httpGetResult(RESULT_NOT_AVAILABLE);
			return;
		}
	}else if(httpReq.readyState == 3){}
}

function httpLoaded(e){
	responseXML = httpReq.responseXML;
	var rootNodeName = responseXML.documentElement.localName.toLowerCase();

	switch(rootNodeName){
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

function httpGetResult(aResultCode){
	httpReq.abort();
	rssLoading = false;

	if(aResultCode == RESULT_OK){
		createRssObject();

		if(lastResource.res){
			BMSVC.updateLastVisitedDate(rssObject.rssURL, rssObject.charSet);
			CommonFunc.setBMDSProperty(lastResource.res, CommonFunc.BM_DESCRIPTION, CommonFunc.STATUS_NO_UPDATE);
		}
		setStatusDone();
		setRssItemListBox();
		
		if(getCheckboxCheck("chkOpenHTML")){
			CreateHTML.openHTML(rssObject);
		}
	}else{
		setStatusError(resultStrArray[aResultCode]);
	}
}