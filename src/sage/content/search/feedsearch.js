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

var FeedSearch = {
	RRP_NS: "http://sage.mozdev.org/#",
	SEARCH_ENGINE_RDF: "chrome://sage/content/search/searchEngine.rdf",

	RDF: Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService),

	txtSearchValue: null,
	imgSearchEngine: null,
	popSearchEngine: null,

	rdfDS: null,
	searchEngine: "",
	searchEngineName: "",
	query: "",
	charset: "",

	init: function(){
		this.txtSearchValue = document.getElementById("txtSearchValue");
		this.imgSearchEngine = document.getElementById("imgSearchEngine");
		this.popSearchEngine = document.getElementById("popSearchEngine");

		// init Search Engine RDF DataSource
		this.rdfDS = this.RDF.GetDataSource(this.SEARCH_ENGINE_RDF);
		var remote = this.rdfDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
		if(remote.loaded) {
			this.initRdfDataSource();
		} else {
			var sink = this.rdfDS.QueryInterface(Components.interfaces.nsIRDFXMLSink);
			sink.addXMLSinkObserver(this.sinkObserver);
		}
	},

	initRdfDataSource: function() {
		this.popSearchEngine.database.AddDataSource(this.rdfDS);
		this.popSearchEngine.builder.rebuild();
		var tmpSearchEngine = this.txtSearchValue.getAttribute("searchengine");
		if(!tmpSearchEngine)
			tmpSearchEngine = this.getRdfProperty("urn:rrp:searchengine:default", this.RRP_NS + "site");
		this.setSearchEngine(tmpSearchEngine);
	},

	search: function() {
		var searchValue = this.txtSearchValue.value;
		if(searchValue == "") return;

		var searchName = this.searchEngineName + " - " + searchValue;

		var formHistory = Components.classes["@mozilla.org/satchel/form-history;1"].getService(Components.interfaces.nsIFormHistory);
		formHistory.addEntry("q", searchValue);

		var textToSubURI = Components.classes["@mozilla.org/intl/texttosuburi;1"].getService(Components.interfaces.nsITextToSubURI);
		searchValue = textToSubURI.ConvertAndEscape(this.charset, searchValue);

		lastResource = {
			res: null,
			db: null,
			name: searchName,
			url: this.query + searchValue
		};
		setStatusLoading();
		feedLoader.loadURI(lastResource.url);
	},

	setSearchEngine: function(aSearchEngine) {
		this.searchEngine = aSearchEngine;
		this.searchEngineName = this.getRdfProperty(aSearchEngine, this.RRP_NS + "name");
		this.query = this.getRdfProperty(aSearchEngine, this.RRP_NS + "query");
		this.charset = this.getRdfProperty(aSearchEngine, this.RRP_NS + "charset");

		this.txtSearchValue.setAttribute("searchengine", this.searchEngine);
		this.imgSearchEngine.src = this.getRdfProperty(aSearchEngine, this.RRP_NS + "icon");
	},

	popSearchEngineClick: function(aEvent) {
		var menuitemNode = aEvent.originalTarget;
		if(menuitemNode.nodeName != "menuitem") return;

		this.setSearchEngine(menuitemNode.value);
	},

	getRdfProperty: function(aRes, aProperty) {
		if(typeof(aRes) == "string") aRes = this.RDF.GetResource(aRes);
		if(typeof(aProperty) == "string") aProperty = this.RDF.GetResource(aProperty);
		var target = this.rdfDS.GetTarget(aRes, aProperty, true);
		try {
			return target.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
		} catch(e) {
			return target.QueryInterface(Components.interfaces.nsIRDFResource).Value;
		}
	},

	sinkObserver: {
		onBeginLoad: function(aSink) {},
		onInterrupt: function(aSink) {},
		onResume: function(aSink) {},
		onEndLoad: function(aSink) { FeedSearch.initRdfDataSource() },
		onError: function(aSink, aStatus, aErrorMsg) {}
	}
}
