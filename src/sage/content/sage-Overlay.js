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
	var prefService = Components.classes["@mozilla.org/preferences;1"].getService(Components.interfaces.nsIPrefService);
	var prefBranch = prefService.getBranch("sage.");
	if (!prefBranch.prefHasUserValue("last_version")) {  // new user
		var new_folder = BMSVC.createFolderInContainer("Sage Feeds", RDF.GetResource("NC:BookmarksRoot"), null);
		prefBranch.setCharPref("folder_id", new_folder.Value);
		if (BMSVC.createBookmarkInContainer.length == 7) { // firefox 0.8 and lower
			BMSVC.createBookmarkInContainer("BBC News | News Front Page | World Edition", "http://news.bbc.co.uk/rss/newsonline_world_edition/front_page/rss091.xml", null, "updated", null, new_folder, null);
			BMSVC.createBookmarkInContainer("Yahoo! News - Sports", "http://rss.news.yahoo.com/rss/sports", null, "updated", null, new_folder, null);
			BMSVC.createBookmarkInContainer("Sage Project News", "http://sage.mozdev.org/rss.xml", null, "updated", null, new_folder, null);
		} else {
			BMSVC.createBookmarkInContainer("BBC News | News Front Page | World Edition", "http://news.bbc.co.uk/rss/newsonline_world_edition/front_page/rss091.xml", null, "updated", null, null, new_folder, null);
			BMSVC.createBookmarkInContainer("Yahoo! News - Sports", "http://rss.news.yahoo.com/rss/sports", null, "updated", null, null, new_folder, null);
			BMSVC.createBookmarkInContainer("Sage Project News", "http://sage.mozdev.org/rss.xml", null, "updated", null, null, new_folder, null);
		}
		addSageButton();
		prefBranch.setCharPref("last_version", "1.3.7");
	} else { // check for upgrade
		var lastVersion = prefBranch.getCharPref("last_version");
		alert(lastVersion);
		if (lastVersion != "1.3.7") { // upgrade
			addSageButton();
			prefBranch.setCharPref("last_version", "1.3.7");
		}
	}
}

window.addEventListener("load", function() { setTimeout(sageInit, 500); }, false);