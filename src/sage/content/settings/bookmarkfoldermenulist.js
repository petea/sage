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

function BookmarkFolderMenuList(aMenulistID, aRootFolderID) {
	this.menuList = document.getElementById(aMenulistID);
	this.menupopup = this.menuList.menupopup;
	this.rootFolder = aRootFolderID ? aRootFolderID : "NC:BookmarksRoot";
	this.init();
}

BookmarkFolderMenuList.prototype = {

	RDF: Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService),
	RDFC: Components.classes["@mozilla.org/rdf/container;1"].getService(Components.interfaces.nsIRDFContainer),
	RDFCU: Components.classes["@mozilla.org/rdf/container-utils;1"].getService(Components.interfaces.nsIRDFContainerUtils),
	BMDS: null,


	set rootFolderID(aValue) {
		this.rootFolder = aValue;
		this.init();
		return this.rootFolder;
	},
	get rootFolderID() {
		return this.rootFolder;
	},

	set currentFolderID(aValue) {
		return this.menuList.value = aValue;
	},
	get currentFolderID() {
		return this.menuList.value;
	},

	init: function() {
		this.BMDS = this.RDF.GetDataSource("rdf:bookmarks");
		
		while (this.menupopup.hasChildNodes()) {
			this.menupopup.removeChild(this.menupopup.firstChild);
		}

		var menuitemNode = document.createElement("menuitem");
		menuitemNode.setAttribute("label", "Root");
		menuitemNode.setAttribute("value", this.rootFolder);
		this.menupopup.appendChild(menuitemNode);
		this.createMenuItem(this.RDF.GetResource(this.rootFolder), 1);
		
		this.menuList.selectedIndex = 0;
	},

	createMenuItem: function(aFolder, aDepth) {
		this.RDFC.Init(this.BMDS, aFolder);
		var children = this.RDFC.GetElements();
		while (children.hasMoreElements()) {
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
