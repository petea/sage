
var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);

function logMessage(message) {
	aConsoleService.logStringMessage("Sage: " + message);
}

function dateFormat(date, twelveHourClock, format) {
	function padout(number) { return (number < 10) ? '0' + number : number; }

	if(!format) {
		format = 0;
	}

	var dayOfMonth = date.getDate();

	var day;
	switch (date.getDay()) {
		case 0: day = strRes.getString("date_sunday_short"); break
		case 1: day = strRes.getString("date_monday_short"); break
		case 2: day = strRes.getString("date_tuesday_short"); break
		case 3: day = strRes.getString("date_wednesday_short"); break
		case 4: day = strRes.getString("date_thursday_short"); break
		case 5: day = strRes.getString("date_friday_short"); break
		case 6: day = strRes.getString("date_saturday_short"); break
	}

	var month, monthNum;
	monthNum = date.getMonth() + 1;
	switch (monthNum) {
		case 1: month = strRes.getString("date_january_short"); break
		case 2: month = strRes.getString("date_february_short"); break
		case 3: month = strRes.getString("date_march_short"); break
		case 4: month = strRes.getString("date_april_short"); break
		case 5: month = strRes.getString("date_may_short"); break
		case 6: month = strRes.getString("date_june_short"); break
		case 7: month = strRes.getString("date_july_short"); break
		case 8: month = strRes.getString("date_august_short"); break
		case 9: month = strRes.getString("date_september_short"); break
		case 10: month = strRes.getString("date_october_short"); break
		case 11: month = strRes.getString("date_november_short"); break
		case 12: month = strRes.getString("date_december_short"); break
	}

	var year = date.getYear() + 1900;

	var date_str;
	switch(format) {
		case 0:
			date_str = day + ", " + month + " " + dayOfMonth + ", " + year;
			break
		case 1:
			date_str = monthNum + "/" + dayOfMonth + "/" + year;
			break
	}

	var hours = date.getHours(), minutes = padout(date.getMinutes()), seconds = padout(date.getSeconds());
	var adjhours, time_str;
	if(twelveHourClock) {
		adjhours = (hours == 0) ? 12 : ((hours < 13) ? hours : hours-12);
		time_str = adjhours + ":" + minutes + ((hours < 12) ? " AM" : " PM");
	} else {
		time_str = hours + ":" + minutes;
	}
	return date_str + " " + time_str;
}



var CommonFunc = {

	RSS_READER_FOLDER_ID: "sage.folder_id",
	USER_AGENT: "Mozilla/5.0 (Sage)",

	USER_CSS_ENABLE: "sage.user_css.enable",
	USER_CSS_PATH: "sage.user_css.path",
	ALLOW_ENCODED_CONTENT: "sage.allow_encoded_content",
	AUTO_FEED_TITLE: "sage.auto_feed_title",
	RENDER_FEEDS: "sage.render_feeds",
	TWELVE_HOUR_CLOCK: "sage.twelve_hour_clock",
	FEED_ITEM_ORDER: "sage.feed_item_order",
	FEED_DISCOVERY_MODE: "sage.feed_discovery_mode",


// ++++++++++ ++++++++++ Bookmark RDF ++++++++++ ++++++++++

	BM_LAST_VISIT: 		"http://home.netscape.com/WEB-rdf#LastVisitDate",
	BM_LAST_MODIFIED:	"http://home.netscape.com/WEB-rdf#LastModifiedDate",
	BM_DESCRIPTION:		"http://home.netscape.com/NC-rdf#Description",
	BM_NAME:					"http://home.netscape.com/NC-rdf#Name",
	BM_URL:						"http://home.netscape.com/NC-rdf#URL",
	BM_FEEDURL:				"http://home.netscape.com/NC-rdf#FeedURL",

	RDF_TYPE:					"http://www.w3.org/1999/02/22-rdf-syntax-ns#type",

	STATUS_UPDATE: "updated",
	STATUS_NO_UPDATE: "no-updated",
	STATUS_UNKNOWN: "unknown",
	STATUS_ERROR: "error",
	STATUS_NO_CHECK: "no-check",

	setBMDSProperty: function(aInput, aArcURI, aNewValue) {
		var changed = false;
		var aOldValue = this.getBMDSTargetByURL(aInput, aArcURI);
		if(typeof(aInput) == "string") {
			aInput = RDF.GetResource(aInput);
		}
		if(typeof(aArcURI) == "string") {
			aArcURI = RDF.GetResource(aArcURI);
		}

		if(typeof(aNewValue) == "string") {
			aNewValue = RDF.GetLiteral(aNewValue);
		} else if(typeof(aNewValue) == "number") {
			aNewValue = RDF.GetIntLiteral(aNewValue);
		}

		if(aArcURI && (aOldValue || aNewValue) && aOldValue != aNewValue) {
			if(aOldValue && !aNewValue) {
				BMDS.Unassert(aInput, aArcURI, aOldValue);
			} else if(!aOldValue && aNewValue) {
				BMDS.Assert(aInput, aArcURI, aNewValue, true);
			} else /* if(aOldValue && aNewValue) */ {
				BMDS.Change(aInput, aArcURI, aOldValue, aNewValue);
			}
			changed = true;
		}
		return changed;
	},

	getBMDSProperty: function(aInput, aArcURI) {
		if(typeof(aInput) == "string") {
			aInput = RDF.GetResource(aInput);
		}
		if(typeof(aArcURI) == "string") {
			aArcURI = RDF.GetResource(aArcURI);
		}
		return this.getBMDSTargetByURL(aInput, aArcURI).Value;
	},
	
	getBMDSTargetByURL: function(aInput, aArcURI) {
		if(typeof(aArcURI) == "string") {
			aArcURI = RDF.GetResource(aArcURI);
		}
		var node = BMDS.GetTarget(aInput, aArcURI, true);
		try {
			return node.QueryInterface(kRDFRSCIID);
		} catch(e) {
			try {
				return node.QueryInterface(Components.interfaces.nsIRDFDate);
			} catch(e) {
				return node? node.QueryInterface(kRDFLITIID) : RDF.GetLiteral("");
			}
		}
	},

	getBMDSCChildren: function(aResource) {
		if(typeof(aResource) == "string") {
			aResource = RDF.GetResource(aResource);
		}

		var rdfContainer = Components.classes["@mozilla.org/rdf/container;1"].getService(Components.interfaces.nsIRDFContainer);
		rdfContainer.Init(BMDS, aResource);
		var containerChildren = rdfContainer.GetElements();

		var resultArray = new Array();
		while(containerChildren.hasMoreElements()) {
			var res = containerChildren.getNext().QueryInterface(kRDFRSCIID);
			if(RDFCU.IsContainer(BMDS, res)) {
				if(BMDS.HasAssertion(res, RDF.GetResource("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), RDF.GetResource("http://home.netscape.com/NC-rdf#Livemark"), true)) {
					resultArray.push(res);
				} else {
					resultArray = resultArray.concat(this.getBMDSCChildren(res));
				}
			} else {
				resultArray.push(res);
			}
		}
		return resultArray;
	},



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
		return aNode.textContent.replace(/^\s+|\s+$/g, "");
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
	}


}
