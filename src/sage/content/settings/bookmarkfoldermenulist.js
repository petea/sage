function BookmarkFolderMenuList(aMenulistID, aRootFolderID){
	this.menuList = document.getElementById(aMenulistID);
	this.menupopup = this.menuList.menupopup;
	this.rootFolder = aRootFolderID ? aRootFolderID : "NC:BookmarksRoot";
	this.init();
}
BookmarkFolderMenuList.prototype = {
	RDF: Components.classes["@mozilla.org/rdf/rdf-service;1"]
				.getService(Components.interfaces.nsIRDFService),
	RDFC: Components.classes["@mozilla.org/rdf/container;1"]
				.getService(Components.interfaces.nsIRDFContainer),
	RDFCU: Components.classes["@mozilla.org/rdf/container-utils;1"]
				.getService(Components.interfaces.nsIRDFContainerUtils),
	BMDS: null,


	set rootFolderID(aValue){
		this.rootFolder = aValue;
		this.init();
		return this.rootFolder;
	},
	get rootFolderID(){
		return this.rootFolder;
	},

	set currentFolderID(aValue){
		return this.menuList.value = aValue;
	},
	get currentFolderID(){
		return this.menuList.value;
	},

	init: function(){
		this.BMDS = this.RDF.GetDataSource("rdf:bookmarks");
		
		while (this.menupopup.hasChildNodes()){
			this.menupopup.removeChild(this.menupopup.firstChild);
		}

		var menuitemNode = document.createElement("menuitem");
		menuitemNode.setAttribute("label", "Root");
		menuitemNode.setAttribute("value", this.rootFolder);
		this.menupopup.appendChild(menuitemNode);
		this.createMenuItem(this.RDF.GetResource(this.rootFolder), 1);
		
		this.menuList.selectedIndex = 0;
	},

	createMenuItem: function(aFolder, aDepth){
		this.RDFC.Init(this.BMDS, aFolder);
		var children = this.RDFC.GetElements();
		while (children.hasMoreElements()){
			var item = children.getNext();
			if(!this.RDFCU.IsContainer(this.BMDS, item)) continue;
			
			item = item.QueryInterface(Components.interfaces.nsIRDFResource);
			var property = this.RDF.GetResource("http://home.netscape.com/NC-rdf#Name");
			var name = this.BMDS.GetTarget(item, property, true);
			name = name.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;

			var Indentation = new Array(aDepth + 1).join("   ");

			var menuitemNode = document.createElement("menuitem");
			menuitemNode.setAttribute("label", Indentation + name);
			menuitemNode.setAttribute("value", item.Value);
			this.menupopup.appendChild(menuitemNode);
			
			this.createMenuItem(item, ++aDepth);
			--aDepth;
		}
	}
}
