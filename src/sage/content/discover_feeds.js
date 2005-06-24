
var strRes;
var feedTree;
var dataSource;
var rdf;
var ds;
var rdfService;
var schema;
var document_host;
var bookmarksTree;
var progressMeter;
var fetch_total;
var fetch_done;
var statusDeck;
var statusMessage;
var feeds_found_local;
var feeds_found_external;
var possibleFeeds;

function init() {
	var discoveryMode = CommonFunc.getPrefValue(CommonFunc.FEED_DISCOVERY_MODE, "str", "exhaustive");

	initServices();
	initBMService();

	strRes = document.getElementById("strRes");
	statusDeck = document.getElementById("statusDeck");
	statusMessage = document.getElementById("statusMessage");
	progressMeter = document.getElementById("progress");
	feedTree = document.getElementById("feedTree");

	dataSource = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"];
	rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"];

	rdfService = rdf.getService(Components.interfaces.nsIRDFService);

	ds = dataSource.createInstance(Components.interfaces.nsIRDFInMemoryDataSource);
	feedTree.database.AddDataSource(ds);

	schema = "http://sage.mozdev.org/FeedData#";

	ds = feedTree.database.GetDataSources();
	ds = ( ds.getNext(), ds.getNext() );
	ds = ds.QueryInterface(Components.interfaces.nsIRDFDataSource);

	var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	var browserWindow = windowManager.getMostRecentWindow("navigator:browser").document.getElementById("content");

	bookmarksTree = window.arguments[0];

	var current_document = browserWindow.contentDocument;

	document_host = current_document.location.host;
	if(document_host.match(/^www\./i)) {
		document_host = document_host.substring(4, document_host.length);
	}

	possibleFeeds = new Array();

	var links, c;
	// Allowing file: might not seem good but the XMLHttpRequest will prevent
	// access to the file system if needed.
	var uriSchemeRe = /^(http|https|ftp|file):$/;

	links = current_document.getElementsByTagName("a");

	if(discoveryMode == "exhaustive") {
		for(c = 0; c < links.length; c++) {
			if(uriSchemeRe.test(links[c].protocol) && links[c].href.match(/xml$|rss|rdf|atom|feed|syndicate/i)) {
				possibleFeeds[links[c].href] = Array(links[c].href, "implicit");
			}
		}
	} else {
		for(c = 0; c < links.length; c++) {
			if(uriSchemeRe.test(links[c].protocol) &&
					links[c].href.match(/xml$|rss|rdf|atom|feed|syndicate/i) &&
					links[c].host.match(new RegExp(document_host, "i"))) {
				possibleFeeds[links[c].href] = Array(links[c].href, "implicit");
			}
		}
	}

	links = current_document.getElementsByTagName("link");
	for(c = 0; c < links.length; c++) {
		if(links[c].rel == "alternate" && (links[c].type == "text/xml" || links[c].type == "application/atom+xml" || links[c].type == "application/rss+xml")) {
			possibleFeeds[links[c].href] = Array(links[c].href, "explicit");
		}
	}

	fetch_total = 0;
	fetch_done = 0;
	feeds_found_local = 0;
	feeds_found_external = 0;

	for(entry in possibleFeeds) {
		fetch_total++;
	}

	if(fetch_total == 0) {
		progressUpdate();
	}

	logMessage("found " + fetch_total + " potential feed URI(s) in " + current_document.location);

	var httpReq;
	for(entry in possibleFeeds) {
		httpReq = new XMLHttpRequest();
		httpReq.onload = httpLoaded;
		httpReq.onerror = httpError;
		try {
			httpReq.open("GET", possibleFeeds[entry][0], true);
			httpReq.setRequestHeader("User-Agent", CommonFunc.USER_AGENT);
			httpReq.overrideMimeType("application/xml");
			httpReq.send(null);
		} catch(e) {
			httpReq.abort();
			progressUpdate();
		}
	}
}

function progressUpdate() {
	fetch_done++;
	progressMeter.value = Math.round((fetch_done/fetch_total) * 100);
	if(fetch_done >= fetch_total) {
		if((feeds_found_local + feeds_found_external) == 0) {
			statusMessage.value = strRes.getString("discovery_status_none_found") + ".";
		} else {
			var message = "";
			if(feeds_found_local > 1) message += feeds_found_local + " " + strRes.getString("discovery_status_site_feeds");
			if(feeds_found_local == 1) message += feeds_found_local + " " + strRes.getString("discovery_status_site_feed");
			if(feeds_found_local > 0 && feeds_found_external > 0) message += " " + strRes.getString("discovery_status_and") + " ";
			if(feeds_found_external > 1) message += feeds_found_external + " " + strRes.getString("discovery_status_external_feeds");
			if(feeds_found_external == 1) message += feeds_found_external + " " + strRes.getString("discovery_status_external_feed");
			statusMessage.value = strRes.getString("discovery_status_discovered") + " " + message + ":";
		}
		statusDeck.selectedIndex = 1;
	}
}

function doAddFeed() {
	var index = feedTree.view.selection.currentIndex;
	if(index != -1) {
		var url, title;
		if (feedTree.columns) { // columns property introduced in Firefox 1.1
			url = feedTree.view.getCellText(index, feedTree.columns.getNamedColumn("url"));
			title = feedTree.view.getCellText(index, feedTree.columns.getNamedColumn("title"));
		} else {
			url = feedTree.view.getCellText(index, "url");
			title = feedTree.view.getCellText(index, "title");
		}
		if(url) {
			if(title == "") {
				title = "No Title";
			}
			var sage_folder = rdfService.GetResource(CommonFunc.getPrefValue(CommonFunc.FEED_FOLDER_ID, "str", "NC:BookmarksRoot"));
			if(BMSVC.createBookmarkInContainer.length == 7) { // firefox 0.8 and lower
				BMSVC.createBookmarkInContainer(title, url, null, "updated", null, sage_folder, null);
			} else {
				BMSVC.createBookmarkInContainer(title, url, null, "updated", null, null, sage_folder, null);
			}
			logMessage("added feed: '" + title + "' " + url);

			// select new feed in sibebar
			var bm_index = bookmarksTree.treeBoxObject.view.rowCount - 1;
			bookmarksTree.treeBoxObject.ensureRowIsVisible(bm_index);
			bookmarksTree.treeBoxObject.view.selection.select(bm_index);
		}
	}
  return true;
}

function doClose() {
  return true;
}

function httpError() {
	progressUpdate();
}

function httpLoaded(e) {
	var httpReq = e.target;
	var uri = httpReq.channel.originalURI;
	try {
		var feed = new Feed(httpReq.responseXML);
		addDiscoveredFeed(uri, feed);
	} catch(e) { }
	progressUpdate();
}

function addDiscoveredFeed(uri, feed) {
	var feedClass, lastPubDate, itemCount;
	if(uri.host.match(new RegExp(document_host, "i"))) {  // feed is local
		if(feeds_found_local == 0) {
			//ds.Assert(rdfService.GetResource(schema + "Feeds"), rdfService.GetResource(schema + "child"), rdfService.GetResource(schema + "LocalFeeds"), true);
			//ds.Assert(rdfService.GetResource(schema + "LocalFeeds"), rdfService.GetResource(schema + "Title"), rdfService.GetLiteral("Site Feeds"), true);
			//ds.Assert(rdfService.GetResource(schema + "LocalFeeds"), rdfService.GetResource(schema + "Valuation"), rdfService.GetIntLiteral(1), true);
		}
		feedClass = "Feeds";
		feeds_found_local++;
	} else {  // feed is external
		if(feeds_found_external == 0) {
			ds.Assert(rdfService.GetResource(schema + "Feeds"), rdfService.GetResource(schema + "child"), rdfService.GetResource(schema + "ExternalFeeds"), true);
			ds.Assert(rdfService.GetResource(schema + "ExternalFeeds"), rdfService.GetResource(schema + "Title"), rdfService.GetLiteral(strRes.getString("discovery_external_feeds_category")), true);
			ds.Assert(rdfService.GetResource(schema + "ExternalFeeds"), rdfService.GetResource(schema + "Valuation"), rdfService.GetIntLiteral(0), true);
		}
		feedClass = "ExternalFeeds";
		feeds_found_external++;
	}

	var twelveHourClock = CommonFunc.getPrefValue(CommonFunc.TWELVE_HOUR_CLOCK, "bool", false);
	lastPubDate = "N/A";
	if(feed.hasLastPubDate()) {
		lastPubDate = dateFormat(feed.getLastPubDate(), twelveHourClock, 1);
	}
	itemCount = feed.getItemCount();

	// feed valuation
	var valuation = 0;
	if(possibleFeeds[uri.spec][1] == "explicit") valuation += 100;
	if(feedClass == "Feeds") valuation += 10;
	if(feed.hasLastPubDate()) valuation += 1;

	ds.Assert(rdfService.GetResource(schema + feedClass), rdfService.GetResource(schema + "child"), rdfService.GetResource(schema + uri.spec), true);

	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "Title"), rdfService.GetLiteral(feed.getTitle()), true);
	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "Format"), rdfService.GetLiteral(feed.getFormat()), true);
	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "URL"), rdfService.GetLiteral(uri.spec), true);
	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "LastPubDate"), rdfService.GetLiteral(lastPubDate), true);
	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "ItemCount"), rdfService.GetLiteral(itemCount), true);
	ds.Assert(rdfService.GetResource(schema + uri.spec), rdfService.GetResource(schema + "Valuation"), rdfService.GetIntLiteral(valuation), true);

	feedTree.builder.rebuild();

	logMessage("discovered feed: " + uri.spec);
}
