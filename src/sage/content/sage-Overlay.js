function addSageButton() {
	var toolbox = document.getElementById("navigator-toolbox");
	var toolboxDocument = toolbox.ownerDocument;
    
	var hasSageButton = false;
	for (var i = 0; i < toolbox.childNodes.length; ++i) {
		var toolbar = toolbox.childNodes[i];
		if (toolbar.localName == "toolbar" && toolbar.getAttribute("customizable") == "true") {
			if (toolbar.currentSet.indexOf("sage-button") > -1) {
				hasSageButton = true;
			}
    	}
    }

	if(!hasSageButton) {
		for (var i = 0; i < toolbox.childNodes.length; ++i) {
			toolbar = toolbox.childNodes[i];
			if (toolbar.localName == "toolbar" &&  toolbar.getAttribute("customizable") == "true" && toolbar.id == "nav-bar") {
				var newSet = "";
				var child = toolbar.firstChild;
				while (child) {
					if(!hasSageButton && child.id == "urlbar-container") {
						newSet += "sage-button,";
						hasSageButton = true;
					}
					newSet += child.id + ",";
					child = child.nextSibling;
				}
				newSet = newSet.substring(0, newSet.length - 1);
				toolbar.currentSet = newSet;
				toolbar.setAttribute("currentset", newSet);
				toolboxDocument.persist(toolbar.id, "currentset");
				try {
					BrowserToolboxCustomizeDone(true);
				} catch (e) {}
				break;
			}
		}
	}
}

function sageInit() {
	var localstore = RDF.GetDataSource("rdf:local-store");
	var prefService = Components.classes["@mozilla.org/preferences;1"].getService(Components.interfaces.nsIPrefService);
	var prefBranch = prefService.getBranch("sage.");
	if (!prefBranch.prefHasUserValue("last_version")) {  // new user
		var new_folder = BMSVC.createFolderInContainer("Sage Feeds", RDF.GetResource("NC:BookmarksRoot"), null);
		prefBranch.setCharPref("folder_id", new_folder.Value);
		BMSVC.createBookmarkInContainer("BBC News | News Front Page | World Edition", "http://news.bbc.co.uk/rss/newsonline_world_edition/front_page/rss091.xml", null, "updated", null, null, new_folder, null);
		BMSVC.createBookmarkInContainer("Yahoo! News - Sports", "http://rss.news.yahoo.com/rss/sports", null, "updated", null, null, new_folder, null);
		BMSVC.createBookmarkInContainer("Sage Project News", "http://sage.mozdev.org/rss.xml", null, "updated", null, null, new_folder, null);
		addSageButton();
		localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul"), RDF.GetResource("http://home.netscape.com/NC-rdf#persist"), RDF.GetResource("chrome://sage/content/sage.xul#chkShowSearchBar"), true);
		localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul#chkShowSearchBar"), RDF.GetResource("checked"), RDF.GetLiteral("false"), true);
		localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul"), RDF.GetResource("http://home.netscape.com/NC-rdf#persist"), RDF.GetResource("chrome://sage/content/sage.xul#chkShowTooltip"), true);
		localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul#chkShowTooltip"), RDF.GetResource("checked"), RDF.GetLiteral("true"), true);
		localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul"), RDF.GetResource("http://home.netscape.com/NC-rdf#persist"), RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemList"), true);
		localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemList"), RDF.GetResource("checked"), RDF.GetLiteral("true"), true);
		localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul"), RDF.GetResource("http://home.netscape.com/NC-rdf#persist"), RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemListToolbar"), true);
		localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemListToolbar"), RDF.GetResource("checked"), RDF.GetLiteral("true"), true);
		prefBranch.setCharPref("last_version", "1.3.8");
	} else { // check for upgrade
		var lastVersion = prefBranch.getCharPref("last_version");
		if (lastVersion.substring(0, 3) != "1.3") {
			localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul"), RDF.GetResource("http://home.netscape.com/NC-rdf#persist"), RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemListToolbar"), true);
			localstore.Assert(RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemListToolbar"), RDF.GetResource("checked"), RDF.GetLiteral("true"), true);
		}
		if (lastVersion != "1.3.7" && lastVersion != "1.3.8") {
			addSageButton();
			prefBranch.setCharPref("last_version", "1.3.8");
		}
	}
}

window.addEventListener("load", function() { setTimeout(sageInit, 250); }, false);