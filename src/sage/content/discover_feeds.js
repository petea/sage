
var strRes;
var feedTree;
var dataSource;
var rdf;
var feeds;
var ds;
var rdfService;
var schema;
var document_host;

function init() {
	strRes = document.getElementById("strRes");
	feedTree = document.getElementById("feedTree");

	dataSource = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"];
	rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"];

	rdfService =	rdf.getService(Components.interfaces.nsIRDFService);

	ds = dataSource.createInstance(Components.interfaces.nsIRDFInMemoryDataSource);
	feedTree.database.AddDataSource(ds);

	schema = "http://sage.mozdev.org/FeedData#";

	ds = feedTree.database.GetDataSources();
	ds = ( ds.getNext(), ds.getNext() );
	ds = ds.QueryInterface(Components.interfaces.nsIRDFDataSource);

	ds.Assert(rdfService.GetResource(schema + "Feeds"), rdfService.GetResource(schema + "child"), rdfService.GetResource(schema + "LocalFeeds"), true);
	ds.Assert(rdfService.GetResource(schema + "LocalFeeds"), rdfService.GetResource(schema + "Title"), rdfService.GetLiteral("Site Feeds"), true);
	ds.Assert(rdfService.GetResource(schema + "Feeds"), rdfService.GetResource(schema + "child"), rdfService.GetResource(schema + "ExternalFeeds"), true);
	ds.Assert(rdfService.GetResource(schema + "ExternalFeeds"), rdfService.GetResource(schema + "Title"), rdfService.GetLiteral("External Feeds"), true);

	var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	var window = windowManager.getMostRecentWindow("navigator:browser").document.getElementById("content");
	var current_document = window.contentDocument;

	document_host = current_document.location.host;
	logMessage("host: " + document_host);

	var possible_feeds = new Object();

	var links = current_document.getElementsByTagName("link");
	for(var c = 0; c < links.length; c++) {
		if(links[c].rel == "alternate" && (links[c].type == "text/xml" || links[c].type == "application/atom+xml" || links[c].type == "application/rss+xml")) {
			possible_feeds[links[c].href] = links[c].href;
			logMessage("Found: " + links[c].href);
		}
	}

	links = current_document.getElementsByTagName("a");
	for(c = 0; c < links.length; c++) {
		if(links[c].href.match(/xml$|rss$|rdf$/i)) {
			possible_feeds[links[c].href] = links[c].href;
			logMessage("Found: " + links[c].href);
		}
	}

	feeds = new Array();
	var httpReq;
	for(url in possible_feeds) {
		httpReq = new XMLHttpRequest();
		httpReq.onload = httpLoaded;
		httpReq.open("GET", url, true);
		httpReq.setRequestHeader("User-Agent", CommonFunc.USER_AGENT);
		httpReq.overrideMimeType("application/xml");
		try {
			httpReq.send(null);
		} catch(e) {
				// FAILURE
			httpReq.abort();
		}
	}

}

function doOK() {
  return true;
}

function doCancel() {
  return true;
}

function httpLoaded(e) {
	var httpReq = e.target;
	var uri = httpReq.channel.originalURI;
	try {
		var feed = new Feed(httpReq.responseXML);
		addFeed(uri, feed);
	} catch(e) { }
}

function addFeed(uri, feed) {
	var feedClass, lastPubDate, itemCount;
	if(uri.host == document_host) {  // feed is local
		feedClass = "LocalFeeds";
	} else {  // feed is external
		feedClass = "ExternalFeeds";
	}
	var twelveHourClock = CommonFunc.getPrefValue(CommonFunc.TWELVE_HOUR_CLOCK, "bool", false);
	lastPubDate = "N/A";
	if(feed.hasLastPubDate()) {
		lastPubDate = dateFormat(feed.getLastPubDate(), twelveHourClock, 1);
	}
	itemCount = feed.getItemCount()
	
	ds.Assert(rdfService.GetResource(schema + feedClass), rdfService.GetResource(schema + "child"), rdfService.GetResource(schema + uri.spec), true);
	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "Title"), rdfService.GetLiteral(feed.getTitle()), true);
	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "Format"), rdfService.GetLiteral(feed.getFormat()), true);
	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "URL"), rdfService.GetLiteral(uri.spec), true);
	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "LastPubDate"), rdfService.GetLiteral(lastPubDate), true);
	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "ItemCount"), rdfService.GetLiteral(itemCount), true);
	
	logMessage("Parsed and added: " + uri.spec);
}