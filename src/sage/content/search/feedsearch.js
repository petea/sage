var FeedSearch = {
	RRP_NS: "http://fls.moo.jp/moz/rssreader/#",
	SEARCH_ENGINE_RDF: "chrome://sage/content/search/searchEngine.rdf",

	RDF:Components.classes['@mozilla.org/rdf/rdf-service;1']
			.getService(Components.interfaces.nsIRDFService),

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
		if(remote.loaded){
			this.initRdfDataSource();
		}else{
			var sink = this.rdfDS.QueryInterface(Components.interfaces.nsIRDFXMLSink);
			sink.addXMLSinkObserver(this.sinkObserver);
		}
	},
	
	initRdfDataSource: function(){
		this.popSearchEngine.database.AddDataSource(this.rdfDS);
		this.popSearchEngine.builder.rebuild();
		var tmpSearchEngine = this.txtSearchValue.getAttribute("searchengine");
		if(!tmpSearchEngine)
			tmpSearchEngine = this.getRdfProperty("urn:rrp:searchengine:default", this.RRP_NS + "site");
		this.setSearchEngine(tmpSearchEngine);	
	},
	
	search: function(){
		var searchValue = this.txtSearchValue.value;
		if(searchValue == "") return;

		var searchName = this.searchEngineName + " - " + searchValue;

			// 検索履歴に検索文字列を追加
		var formHistory = Components.classes["@mozilla.org/satchel/form-history;1"]
							.getService(Components.interfaces.nsIFormHistory);
		formHistory.addEntry("q", searchValue);

			// 検索文字列を検索エンジンの文字コードに合わせてエスケープ
		var textToSubURI = Components.classes["@mozilla.org/intl/texttosuburi;1"]
								.getService(Components.interfaces.nsITextToSubURI);
		searchValue = textToSubURI.ConvertAndEscape(this.charset, searchValue);

		lastResource = {
			res: null,
			db: null,
			name: searchName,
			url: this.query + searchValue
		};
		setStatusLoading();
		httpGet(lastResource.url);
	},
	
	setSearchEngine: function(aSearchEngine){
		this.searchEngine = aSearchEngine;
		this.searchEngineName = this.getRdfProperty(aSearchEngine, this.RRP_NS + "name");
		this.query = this.getRdfProperty(aSearchEngine, this.RRP_NS + "query");
		this.charset = this.getRdfProperty(aSearchEngine, this.RRP_NS + "charset");

		this.txtSearchValue.setAttribute("searchengine", this.searchEngine);
		this.imgSearchEngine.src = this.getRdfProperty(aSearchEngine, this.RRP_NS + "icon");
	},
	
	popSearchEngineClick: function(aEvent){
		var menuitemNode = aEvent.originalTarget;
		if(menuitemNode.nodeName != "menuitem") return;
		
		this.setSearchEngine(menuitemNode.value);
	},
	
	getRdfProperty: function(aRes, aProperty){
		if(typeof(aRes) == "string") aRes = this.RDF.GetResource(aRes);
		if(typeof(aProperty) == "string") aProperty = this.RDF.GetResource(aProperty);
		var target = this.rdfDS.GetTarget(aRes, aProperty, true);
		try{
			return target.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
		}catch(e){
			return target.QueryInterface(Components.interfaces.nsIRDFResource).Value;
		}
	},
	
	sinkObserver: {
		onBeginLoad: function(aSink){},
		onInterrupt: function(aSink){},
		onResume: function(aSink){},
		onEndLoad: function(aSink){ FeedSearch.initRdfDataSource() },
		onError: function(aSink, aStatus, aErrorMsg){}
	}
}