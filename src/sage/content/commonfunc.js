var CommonFunc = {

	RSS_READER_FOLDER_ID: "sage.folder_id",
	USER_AGENT: "Mozilla/5.0 (Sage)",



// ++++++++++ ++++++++++ Bookmark RDF ++++++++++ ++++++++++

	BM_LAST_VISIT: 		"http://home.netscape.com/WEB-rdf#LastVisitDate",
	BM_LAST_MODIFIED:	"http://home.netscape.com/WEB-rdf#LastModifiedDate",
	BM_DESCRIPTION:		"http://home.netscape.com/NC-rdf#Description",
	BM_NAME:			"http://home.netscape.com/NC-rdf#Name",
	BM_URL:				"http://home.netscape.com/NC-rdf#URL",

	STATUS_UPDATE: "updated",
	STATUS_NO_UPDATE: "no-updated",
	STATUS_UNKNOWN: "unknown",
	STATUS_ERROR: "error",
	STATUS_NO_CHECK: "no-check",

	setBMDSProperty: function(aInput, aArcURI, aNewValue){
		var changed = false;
		var aOldValue = this.getBMDSTargetByURL(aInput, aArcURI);		
		if(typeof(aInput) == "string"){
			aInput = RDF.GetResource(aInput);
		}
		if(typeof(aArcURI) == "string"){
			aArcURI = RDF.GetResource(aArcURI);
		}

		if(typeof(aNewValue) == "string"){
			aNewValue = RDF.GetLiteral(aNewValue);
		}else if(typeof(aNewValue) == "number"){
			aNewValue = RDF.GetIntLiteral(aNewValue);		
		}

		
		if(aArcURI && (aOldValue || aNewValue) && aOldValue != aNewValue) {
			if(aOldValue && !aNewValue){
				BMDS.Unassert(aInput, aArcURI, aOldValue);
			}else if (!aOldValue && aNewValue){
				BMDS.Assert(aInput, aArcURI, aNewValue, true);
			}else /* if (aOldValue && aNewValue) */ {
				BMDS.Change(aInput, aArcURI, aOldValue, aNewValue);
			}
			changed = true;
		}
		return changed;
	},

	getBMDSProperty: function(aInput, aArcURI){
		if(typeof(aInput) == "string"){
			aInput = RDF.GetResource(aInput);
		}
		if(typeof(aArcURI) == "string"){
			aArcURI = RDF.GetResource(aArcURI);
		}
		return this.getBMDSTargetByURL(aInput, aArcURI).Value;
	},
	
	getBMDSTargetByURL: function(aInput, aArcURI){
		if(typeof(aArcURI) == "string"){
			aArcURI = RDF.GetResource(aArcURI);
		}
		var node = BMDS.GetTarget(aInput, aArcURI, true);
		try{
			return node.QueryInterface(kRDFRSCIID);
		}catch(e){
			try{
				return node.QueryInterface(Components.interfaces.nsIRDFDate);
			}catch(e){
				return node? node.QueryInterface(kRDFLITIID) : RDF.GetLiteral("");
			}
		}	
	},

	getBMDSCChildren: function(aResource){
		if(typeof(aResource) == "string"){
			aResource = RDF.GetResource(aResource);
		}
	
		var rdfContainer = Components.classes["@mozilla.org/rdf/container;1"]
								.getService(Components.interfaces.nsIRDFContainer);
		rdfContainer.Init(BMDS, aResource);
	   	var containerChildren = rdfContainer.GetElements();

	   	var resultArray = new Array();
	   	while(containerChildren.hasMoreElements()){
		   	var res = containerChildren.getNext().QueryInterface(kRDFRSCIID);
	   	
		   	if(RDFCU.IsContainer(BMDS, res)){
		   		resultArray = resultArray.concat(this.getBMDSCChildren(res));
		   	}else{
			   	resultArray.push(res);
			}
	   	}
		return resultArray;
	},



// ++++++++++ ++++++++++ CharCode ++++++++++ ++++++++++

	convertCharCodeFrom: function(aString, aCharCode){
		var UConvID = "@mozilla.org/intl/scriptableunicodeconverter";
		var UConvIF  = Components.interfaces.nsIScriptableUnicodeConverter;
		var UConv = Components.classes[UConvID].getService(UConvIF);
		
		var tmpString = "";
		try{
			UConv.charset = aCharCode;
			tmpString = UConv.ConvertFromUnicode(aString);
		}catch(e){
			tmpString = null;
		}
		return tmpString;
	},



	// node 内のテキストを返す
	getInnerText: function(aNode) {
		if(!aNode.hasChildNodes()) return "";
	
		var resultArray = new Array();
		var currentNode;
		var walker = aNode.ownerDocument.createTreeWalker(aNode,
						NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_TEXT, null, false);
		while(currentNode = walker.nextNode()) resultArray.push(currentNode.nodeValue);
		return resultArray.join('').replace(/^\s+|\s+$/g, "");
	},


	loadText: function(aURI){
		var	URI = Components.classes["@mozilla.org/network/standard-url;1"]
					.createInstance(Components.interfaces.nsIURI);
		URI.spec = aURI;
	
		var IOService = Components.classes['@mozilla.org/network/io-service;1']
							.getService(Components.interfaces.nsIIOService);
		var channel = IOService.newChannelFromURI(URI);
		var stream	= channel.open();
		var scriptableStream = Components.classes['@mozilla.org/scriptableinputstream;1']
									.createInstance(Components.interfaces.nsIScriptableInputStream);
		scriptableStream.init(stream);

		var fileContents = scriptableStream.read(scriptableStream.available());

		scriptableStream.close();
		stream.close();

		return fileContents;
	},

// ++++++++++ ++++++++++ preferences ++++++++++ ++++++++++


		// 	preferences の値を書き込む
	setPrefValue : function(aPrefString, aPrefType, aValue){
		var nsISupportsString = Components.interfaces.nsISupportsString;
		var xpPref = Components.classes["@mozilla.org/preferences;1"]
						.getService(Components.interfaces.nsIPrefBranch);

		var prefType = xpPref.getPrefType(aPrefString);

		try{
			switch (aPrefType){
				case "wstr":
					var string = Components.classes['@mozilla.org/supports-string;1']
									.createInstance(nsISupportsString);
					string.data = aValue;
					return xpPref.setComplexValue(aPrefString, nsISupportsString, string);
					break;
				case "str":
					return xpPref.setCharPref(aPrefString, aValue);
					break;
				case "int":
					aValue = parseInt(aValue); // 文字列を整数値に変換
					return xpPref.setIntPref(aPrefString, aValue);
					break;
				case "bool":
				default:
					if(typeof(aValue) == "string"){
						aValue = (aValue == "true"); // 文字列を真偽値に変換
					}
					return xpPref.setBoolPref(aPrefString, aValue);
					break;
			}
		}catch(e){
		}
		return null;
	},

		// 	preferences の値を読み込む
	getPrefValue : function(aPrefString, aPrefType, aDefault){
		var nsISupportsString = Components.interfaces.nsISupportsString;
		var xpPref = Components.classes["@mozilla.org/preferences;1"]
						.getService(Components.interfaces.nsIPrefBranch);
		
		if(xpPref.getPrefType(aPrefString) == xpPref.PREF_INVALID){
			return aDefault;
		}
		try{
			switch (aPrefType){
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
		}catch(e){
		}
		return aDefault;
	},

		// preferences の内容を消去
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
	
		// 監視を開始する
	addPrefListener: function(aPrefString, aFunc){
		var prefObserver;
		try {
			prefObserver = {
				domain: aPrefString,
				observe: aFunc
			};
			
			var pbi = Components.classes["@mozilla.org/preferences-service;1"]
							.getService(Components.interfaces.nsIPrefBranchInternal);
			pbi.addObserver(prefObserver.domain, prefObserver, false);
		} catch(e){
			alert(e);
			prefObserver = null; 
		}
		
		return prefObserver;
	},

	// 監視を終了する
	removePrefListener: function(aObserver){
		var prefObserver;
		try {
			var pbi = Components.classes["@mozilla.org/preferences-service;1"]
							.getService(Components.interfaces.nsIPrefBranchInternal);
			pbi.removeObserver(aObserver.domain, aObserver);
		} catch(e) {
			alert(e)
		}
	}


}