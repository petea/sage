
var sageFolderID;

var chkUserCssEnable;
var txtUserCssPath;
var chkAllowEContent;
var chkAutoFeedTitle;
var chkRenderFeeds;

var gList;
var gNameArc;
var strRes // stringbundle オブジェクト

function init() {
	initServices();
	initBMService();

	strRes = document.getElementById("strRes");

  sageFolderID = CommonFunc.getPrefValue(CommonFunc.RSS_READER_FOLDER_ID, "str", "NC:BookmarksRoot");
	gNameArc = RDF.GetResource(NC_NS + "Name");
	gList = document.getElementById("select-menu");

	chkUserCssEnable = document.getElementById("chkUserCssEnable");
	chkUserCssEnable.checked = CommonFunc.getPrefValue(CommonFunc.USER_CSS_ENABLE, "bool", false);

	txtUserCssPath = document.getElementById("txtUserCssPath");
	txtUserCssPath.value = CommonFunc.getPrefValue(CommonFunc.USER_CSS_PATH, "wstr", "");

	chkAllowEContent = document.getElementById("chkAllowEContent");
	chkAllowEContent.checked = CommonFunc.getPrefValue(CommonFunc.ALLOW_ENCODED_CONTENT, "bool", true);

	chkAutoFeedTitle = document.getElementById("chkAutoFeedTitle");
	chkAutoFeedTitle.checked = CommonFunc.getPrefValue(CommonFunc.AUTO_FEED_TITLE, "bool", true);

	chkRenderFeeds = document.getElementById("chkRenderFeeds");
	chkRenderFeeds.checked = CommonFunc.getPrefValue(CommonFunc.RENDER_FEEDS, "bool", true);

	setDisabled();

	setTimeout(fillSelectFolderMenupopup, 0);
}

function accept() {
	CommonFunc.setPrefValue(CommonFunc.RSS_READER_FOLDER_ID, "str", sageFolderID);
	CommonFunc.setPrefValue(CommonFunc.USER_CSS_ENABLE, "bool", chkUserCssEnable.checked);
	CommonFunc.setPrefValue(CommonFunc.USER_CSS_PATH, "wstr", txtUserCssPath.value);
	CommonFunc.setPrefValue(CommonFunc.ALLOW_ENCODED_CONTENT, "bool", chkAllowEContent.checked);
	CommonFunc.setPrefValue(CommonFunc.AUTO_FEED_TITLE, "bool", chkAutoFeedTitle.checked);
	CommonFunc.setPrefValue(CommonFunc.RENDER_FEEDS, "bool", chkRenderFeeds.checked);
}

function uninstall() {
	var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

	var checkValue = { value: true };
	
	if(!prompt.confirmCheck(window,
		strRes.getString("UNINST_TITLE"),
		strRes.getString("UNINST_TEXT"),
		strRes.getString("UNINST_CHECKMSG"), checkValue)) {
		
		return;
	}

		// RSS Reader Panel が開いていた場合は閉じる
	var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	var windowEnum = windowManager.getEnumerator("navigator:browser");
	while(windowEnum.hasMoreElements()) {
		var browserWin = windowEnum.getNext();
		browserWin.QueryInterface(Components.interfaces.nsIDOMWindowInternal);

		var elt = browserWin.document.getElementById("viewSageSidebar");
		if(elt.getAttribute("checked") == "true") {
			var sidebarTitle = browserWin.document.getElementById("sidebar-title");
			var sidebarBox = browserWin.document.getElementById("sidebar-box");
			var sidebarSplitter = browserWin.document.getElementById("sidebar-splitter");
			elt.removeAttribute("checked");
			sidebarBox.setAttribute("sidebarcommand", "");
			sidebarTitle.setAttribute("value", "");
			sidebarBox.hidden = true;
			sidebarSplitter.hidden = true;
		}
	}

	// Remove preferences if requested
	if(checkValue.value) {
		CommonFunc.removePrefs();
	}

	var unreg = new exUnregisterer(
		'chrome://sage/content/contents.rdf',
		'jar:%chromeFolder%sage.jar!/skin/classic/contents.rdf',
		'jar:%chromeFolder%sage.jar!/locale/en-US/contents.rdf',
		'jar:%chromeFolder%sage.jar!/locale/ja-JP/contents.rdf');

	unreg.unregister();
	
	alert("Uninstall Completed");
	window.close();
}


function selectFolder(aEvent){
	sageFolderID = aEvent.target.id;
}


function setDisabled() {
	txtUserCssPath.disabled = !chkUserCssEnable.checked;
	document.getElementById("btnBrowseCss").disabled = !chkUserCssEnable.checked;
}


function browseCss() {
	var fpicker = Components.classes["@mozilla.org/filepicker;1"]
					.createInstance(Components.interfaces.nsIFilePicker);
	fpicker.init(window, "Select CSS File", fpicker.modeOpen);
	fpicker.appendFilter("CSS File(*.css)", "*.css");
	fpicker.appendFilters(fpicker.filterAll);

	var showResult = fpicker.show();
	if(showResult == fpicker.returnOK) {
		txtUserCssPath.value = fpicker.file.path;	
	}
}

function fillSelectFolderMenupopup () {
	var popup = document.getElementById("select-folder");

	// clearing the old menupopup
	while (popup.hasChildNodes()) {
		popup.removeChild(popup.firstChild);
	}

	// to be removed once I checkin the top folder
	var element = document.createElementNS(XUL_NS, "menuitem");
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
	while (children.hasMoreElements()){
		var curr = children.getNext();
		if (RDFCU.IsContainer(BMDS, curr)) {
			curr = curr.QueryInterface(Components.interfaces.nsIRDFResource);
			var element = document.createElementNS(XUL_NS, "menuitem");
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
