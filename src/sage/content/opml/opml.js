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

// XUL Object
var winMain, txtImportFile, txtExportFile;
var strRes;


var g_errorMesage = "";

function init() {
	// Bookmarks Service
	initServices();
	initBMService();

	strRes = document.getElementById("strRes");

	winMain = document.getElementById("winMain");
	txtImportFile = document.getElementById("txtImportFile");
	txtExportFile = document.getElementById("txtExportFile");

	document.getElementById( "pageExport" ).canAdvance = false;
	document.getElementById( "pageImport" ).canAdvance = false;
}

function finish() {
	return true;
}

function browseImportFile() {
	var fpicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	fpicker.init(window, strRes.getString("opml_select_file"), fpicker.modeOpen);
	fpicker.appendFilter(strRes.getString("opml_opml_file") + " (*.xml, *.opml)", "*.xml;*.opml");
	fpicker.appendFilters(fpicker.filterAll);

	var showResult = fpicker.show();
	if(showResult == fpicker.returnOK) {
		txtImportFile.value = fpicker.file.path;
	}
	canAdvanceImport();
}

function browseExportFile() {
	var fpicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	fpicker.init(window, strRes.getString("opml_select_file"), fpicker.modeSave);
	fpicker.appendFilter(strRes.getString("opml_opml_file") + " (*.xml, *.opml)", "*.xml;*.opml");
	fpicker.appendFilters(fpicker.filterAll);
	fpicker.defaultString = "export.opml";

	var showResult = fpicker.show();
	if(showResult == fpicker.returnOK || showResult == fpicker.returnReplace) {
		txtExportFile.value = fpicker.file.path;
	}
	canAdvanceExport();
}

function checkFilePath(aFilePath, aExistCheck) {
	if(!aFilePath) {
		g_errorMesage = strRes.getString("opml_path_blank");
		return false;
	}

	var tmpFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
	try {
		tmpFile.initWithPath(aFilePath);
		if(aExistCheck) {
			if(!tmpFile.exists()) {
				g_errorMesage = strRes.getString("opml_path_nofile");
				return false;
			}
		}
	} catch(e) {
		g_errorMesage = strRes.getString("opml_path_invalid");
		return false;
	}

	return true;
}

// ********** ********** Import OPML ********** **********

function importOPML() {
	var path = txtImportFile.value;
	if (!checkFilePath(path, true)) {
		reportError(g_errorMesage);
		return false;
	}

	var uriFixup = Components.classes['@mozilla.org/docshell/urifixup;1'].getService(Components.interfaces.nsIURIFixup);
	var opmlUrl = uriFixup.createFixupURI(path, uriFixup.FIXUP_FLAG_ALLOW_KEYWORD_LOOKUP);

	var httpReq = new XMLHttpRequest();
	try {
		httpReq.open("GET", opmlUrl.spec, false);
		httpReq.overrideMimeType("application/xml");
		httpReq.send(null);
	} catch(e) {
		reportError(strRes.getString("opml_import_fail"));
		return false;
	}

	opmlDoc = httpReq.responseXML;
	if(opmlDoc.documentElement.localName != "opml") {
		reportError(strRes.getString("opml_import_badfile"));
		return false;
	}
	var rssReaderFolderID = CommonFunc.getPrefValue(CommonFunc.FEED_FOLDER_ID, "str", "NC:BookmarksRoot");

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
	var path = txtExportFile.value;
	if (!checkFilePath(path, false)) {
		reportError(g_errorMesage);
		return false;
	}

	var opmlSource = createOpmlSource();
	opmlSource = CommonFunc.convertCharCodeFrom(opmlSource, "UTF-8");

	var tmpFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
	try {
		tmpFile.initWithPath(path);
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
		reportError(strRes.getString("opml_export_nocreate"));
		return false;
	}

	return true;
}

function createOpmlSource() {
	var rssReaderFolderID = CommonFunc.getPrefValue(CommonFunc.FEED_FOLDER_ID,"str", "NC:BookmarksRoot");
	var rssReaderFolderRes = RDF.GetResource(rssReaderFolderID);

	var srcTemplate =  '<?xml version="1.0" encoding="UTF-8"?>';
	srcTemplate += '<opml version="1.0">';
	srcTemplate += '<head><title>Sage OPML Export</title></head>';
	srcTemplate += '<body/></opml>';

	var opmlDoc = new DOMParser().parseFromString(srcTemplate, "text/xml");
	var opmlBody = opmlDoc.getElementsByTagName("body")[0];

	opmlBody.appendChild(createOpmlOutline(opmlDoc, rssReaderFolderRes));
	xmlIndent(opmlDoc);

	var opmlSource = new XMLSerializer().serializeToString(opmlDoc);
	return opmlSource;
}

function createOpmlOutline(aOpmlDoc, aRssItem) {
	var type = CommonFunc.getBMDSProperty(aRssItem, CommonFunc.RDF_TYPE);
	var url;
	if(type == NC_NS + "Bookmark") {
		url = CommonFunc.getBMDSProperty(aRssItem, CommonFunc.BM_URL);
	}
	if(type == NC_NS + "Livemark") {
		url = CommonFunc.getBMDSProperty(aRssItem, CommonFunc.BM_FEEDURL);
	}
	var title = CommonFunc.getBMDSProperty(aRssItem, CommonFunc.BM_NAME);
	var outlineNode = aOpmlDoc.createElement("outline");

	if(type == NC_NS + "Folder") {
		outlineNode.setAttribute("text", title);

		var rdfContainer = Components.classes["@mozilla.org/rdf/container;1"].getService(Components.interfaces.nsIRDFContainer);
		rdfContainer.Init(BMDS, aRssItem);
		var containerChildren = rdfContainer.GetElements();

		while(containerChildren.hasMoreElements()) {
			var res = containerChildren.getNext().QueryInterface(kRDFRSCIID);
			var res_type = CommonFunc.getBMDSProperty(res, CommonFunc.RDF_TYPE);
			if(res_type == NC_NS + "Folder" || res_type == NC_NS + "Bookmark" || res_type == NC_NS + "Livemark") {
				outlineNode.appendChild(createOpmlOutline(aOpmlDoc, res));
			}
		}
	} else if(type == NC_NS + "Bookmark" || type == NC_NS + "Livemark") {
		outlineNode.setAttribute("type", "rss");
		outlineNode.setAttribute("text", title);
		outlineNode.setAttribute("title", title);
		outlineNode.setAttribute("xmlUrl", url);
	}
	return outlineNode;
}

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
		// in some weird case this is NaN
		if (aDepth < 0 || isNaN(aDepth))
			return "";
		var result = new Array( aDepth );
		return result.join("\t");
	}
}

function isTextBoxEmpty(el) {
	return /^\s*$/.test(el.value);
}

function canAdvanceImport() {
	winMain.canAdvance = !isTextBoxEmpty(txtImportFile)
}

function canAdvanceExport() {
	winMain.canAdvance = !isTextBoxEmpty(txtExportFile)
}

function reportError(s)
{
	// This should really show an error prompt
	alert(s);
}


// Page initializers
function onPageStartShow() {
	winMain.getButton("cancel").disabled = false;
	winMain.canAdvance = true;
}

function onPageImportShow() {
	winMain.getButton("cancel").disabled = false;
	canAdvanceImport();
}

function onPageExportShow() {
	winMain.getButton("cancel").disabled = false;
	canAdvanceExport();
}

function onPageImportFinishedShow() {
	document.documentElement.getButton("cancel").disabled = true;
}

function onPageExportFinishedShow() {
	document.documentElement.getButton("cancel").disabled = true;
}

