const WIZ_MODE_IMPORT = 0;
const WIZ_MODE_EXPORT = 1;

var wizMode = WIZ_MODE_IMPORT;

	// XUL Object
var winMain;
var txtImportFile;
var txtExportFile;
var strRes;


function init() {
		// Bookmarks Service
	initServices();
	initBMService();

	strRes = document.getElementById("strRes");

	winMain = document.getElementById("winMain");
	txtImportFile = document.getElementById("txtImportFile");
	txtExportFile = document.getElementById("txtExportFile");
}

function finish() {
	if(wizMode == WIZ_MODE_IMPORT) {
		if(!checkFilePath(txtImportFile.value, true)) return false;
		if(!importOPML()) return false;
		alert(strRes.getString("opml_import_done"));
	} else {
		if(!checkFilePath(txtExportFile.value, false)) return false;
		exportOPML();
		alert(strRes.getString("opml_export_done"));
	}
	
	return true;
}


function browseImportFile() {
	var fpicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	fpicker.init(window, "Select OPML File", fpicker.modeOpen);
	fpicker.appendFilter("OPML File(*.xml, *.opml)", "*.xml;*.opml");
	fpicker.appendFilters(fpicker.filterAll);

	var showResult = fpicker.show();
	if(showResult == fpicker.returnOK) {
		txtImportFile.value = fpicker.file.path;	
	}
}

function browseExportFile() {
	var fpicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	fpicker.init(window, strRes.getString("opml_select_file"), fpicker.modeSave);
	fpicker.appendFilter(strRes.getString("opml_opml_file") + "(*.xml, *.opml)", "*.xml;*.opml");
	fpicker.appendFilters(fpicker.filterAll);
	fpicker.defaultString = "export.opml";

	var showResult = fpicker.show();
	if(showResult == fpicker.returnOK || showResult == fpicker.returnReplace) {
		txtExportFile.value = fpicker.file.path;	
	}
}



function checkFilePath(aFilePath, aExistCheck) {
	if(!aFilePath) {
		alert(strRes.getString("opml_path_blank"));
		return false;
	}
	
	var tmpFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
	try {
		tmpFile.initWithPath(aFilePath);
		if(aExistCheck) {
			if(!tmpFile.exists()) {
					// ファイルが存在しない
				alert(strRes.getString("opml_path_nofile"));
				return false;
			}
		}
	} catch(e) {
			// 不正なファイルパス
		alert(strRes.getString("opml_path_invalid"));
		return false;
	}
	
	return true;
}



// ********** ********** Import OPML ********** **********

function importOPML() {
	var uriFixup = Components.classes['@mozilla.org/docshell/urifixup;1'].getService(Components.interfaces.nsIURIFixup);
	var opmlUrl = uriFixup.createFixupURI(txtImportFile.value, uriFixup.FIXUP_FLAG_ALLOW_KEYWORD_LOOKUP);

	var httpReq = new XMLHttpRequest();
	try {
		httpReq.open("GET", opmlUrl.spec, false);
		httpReq.overrideMimeType("application/xml");
		httpReq.send(null);
	} catch(e) {
		alert(strRes.getString("opml_import_fail"));
		return false;
	}
	
	opmlDoc = httpReq.responseXML;
	if(opmlDoc.documentElement.localName != "opml") {
		alert(strRes.getString("opml_import_badfile"));
		return false;
	}
	var rssReaderFolderID = CommonFunc.getPrefValue(CommonFunc.RSS_READER_FOLDER_ID, "str", "NC:BookmarksRoot");

	var folderName = "OPML Import";
	var opmlTitles = opmlDoc.getElementsByTagName("title");
	if(opmlTitles.length > 0) {
		var opmlTitle = CommonFunc.getInnerText(opmlTitles[0]);
		folderName += " - " + opmlTitle;
	}
	var rootFolder = BMSVC.createFolderInContainer(folderName, RDF.GetResource(rssReaderFolderID), 1);

	var treeWalker = opmlDoc.createTreeWalker(opmlDoc, NodeFilter.SHOW_ELEMENT, outlineFilter, true);

	while(treeWalker.nextNode()) {
		var cNode = treeWalker.currentNode;
		var pNode = cNode.parentNode;
		var parentFolder = ("_folder" in pNode) ? pNode._folder : rootFolder;
		if(cNode.hasChildNodes()) {
			var title = cNode.getAttribute("title");
			if(!title) title = cNode.getAttribute("text");
			if(!title) title = "folder";
			cNode._folder = BMSVC.createFolderInContainer(title, parentFolder, null);
		} else {
			createRssItem(cNode, parentFolder);
		}
	}

		// ブックマークの保存
	BookmarksUtils.flushDataSource();

	return true;
}

function outlineFilter(aNode) {
	if(aNode.localName == "outline") {
		return NodeFilter.FILTER_ACCEPT;
	} else {
		return NodeFilter.FILTER_SKIP;
	}
}

function createRssItem(aOutlineNode, aRssFolder) {
	var type = aOutlineNode.getAttribute("type");
	var title = aOutlineNode.getAttribute("title");
	if(!title) title = aOutlineNode.getAttribute("text");
	if(aOutlineNode.hasAttribute("xmlUrl")) {
		var xmlUrl = aOutlineNode.getAttribute("xmlUrl");
	} else {
		var xmlUrl = aOutlineNode.getAttribute("xmlurl");
	}

	if(type!="rss" && !title && xmlUrl) return;

	if(BMSVC.createBookmarkInContainer.length == 7) { // firefox 0.8 and lower
		BMSVC.createBookmarkInContainer(title, xmlUrl, null, "no-updated", null, aRssFolder, null);
	} else {
		BMSVC.createBookmarkInContainer(title, xmlUrl, null, "no-updated", null, null, aRssFolder, null);
	}
	
}




// ********** ********** Export OPML ********** **********

function exportOPML() {
	var opmlSource = createOpmlSource();
	opmlSource = CommonFunc.convertCharCodeFrom(opmlSource, "UTF-8");

	var tmpFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
	try {
		tmpFile.initWithPath(txtExportFile.value);
		if(tmpFile.exists()) {
			tmpFile.remove(true);
		}
		tmpFile.create(tmpFile.NORMAL_FILE_TYPE, 0666);
		var stream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
		stream.init(tmpFile, 2, 0x200, false); // open as "write only"
		stream.write(opmlSource, opmlSource.length);
		stream.flush();
		stream.close();
	} catch(e) {
		alert(strRes.getString("opml_export_nocreate"));
	}
}


function createOpmlSource() {
	var rssReaderFolderID = CommonFunc.getPrefValue(CommonFunc.RSS_READER_FOLDER_ID,"str", "NC:BookmarksRoot");
	var rssReaderFolderRes = RDF.GetResource(rssReaderFolderID);
	
	var srcTemplate =  '<?xml version="1.0" encoding="UTF-8"?>';
	srcTemplate += '<opml version="1.0">';
	srcTemplate += '<head><title>RSS Reader Panel Export OPML</title></head>';
	srcTemplate += '<body/></opml>';
	
	var opmlDoc = new DOMParser().parseFromString(srcTemplate, "text/xml");
	var opmlBody = opmlDoc.getElementsByTagName("body")[0];
	
	opmlBody.appendChild(createOpmlOutline(opmlDoc, rssReaderFolderRes));
	xmlIndent(opmlDoc);
	
	var opmlSource = new XMLSerializer().serializeToString(opmlDoc);
	return opmlSource;
}


function createOpmlOutline(aOpmlDoc, aRssItem) {
	var url = CommonFunc.getBMDSProperty(aRssItem, CommonFunc.BM_URL);
	var title = CommonFunc.getBMDSProperty(aRssItem, CommonFunc.BM_NAME);
	var isContainer = RDFCU.IsContainer(BMDS, aRssItem);
	var outlineNode = aOpmlDoc.createElement("outline");

	if(isContainer) {
		outlineNode.setAttribute("text", title);
		
		var rdfContainer = Components.classes["@mozilla.org/rdf/container;1"].getService(Components.interfaces.nsIRDFContainer);
		rdfContainer.Init(BMDS, aRssItem);
		var containerChildren = rdfContainer.GetElements();

		while(containerChildren.hasMoreElements()) {
			var res = containerChildren.getNext().QueryInterface(kRDFRSCIID);
			outlineNode.appendChild(createOpmlOutline(aOpmlDoc, res));
		}
	} else {
		outlineNode.setAttribute("type", "rss");
		outlineNode.setAttribute("text", title);
		outlineNode.setAttribute("title", title);
		outlineNode.setAttribute("xmlUrl", url);
	}
	return outlineNode;
}



	// XML ソースのインデント
function xmlIndent(aDoc) {
	var treeWalker = aDoc.createTreeWalker(aDoc, NodeFilter.SHOW_ELEMENT, null, true);
	aDoc._depth = 0;
	while(treeWalker.nextNode()) {
		var cNode = treeWalker.currentNode;
		var pNode = cNode.parentNode;
		var tmpTextNode;

		if(pNode) {
			cNode._depth = pNode._depth + 1;
			if(cNode == aDoc.documentElement) continue;
			tmpTextNode = aDoc.createTextNode("\n" + getIndent(cNode._depth));
			pNode.insertBefore(tmpTextNode, cNode);
		}
		if(!cNode.nextSibling) {
			tmpTextNode = aDoc.createTextNode("\n" + getIndent(cNode._depth - 1));
			pNode.appendChild(tmpTextNode);
		}
	}
	function getIndent(aDepth) {
		var result = new Array(aDepth);
		return result.join("\t");
	}
}