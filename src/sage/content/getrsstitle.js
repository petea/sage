var GetRssTitle = {
	checking: false,
	httpReq: null,
	res: null,
	url: "",
	
	getRssTitle: function(aBookmrkID){
		if(this.checking) return;
	
		this.res = RDF.GetResource(aBookmrkID);
		this.url = CommonFunc.getBMDSProperty(this.res, CommonFunc.BM_URL);
		
		this.httpReq = new XMLHttpRequest();
		this.httpReq.onload = this.httpLoaded;
		this.httpReq.onreadystatechange = this.httpReadyStateChange;
		this.httpReq.open("GET", this.url);
		this.httpReq.setRequestHeader("User-Agent", USER_AGENT);
		this.httpReq.overrideMimeType("application/xml");
		try {
			this.httpReq.send(null);
		} catch(e) {
				// FAILURE
			this.httpReq.abort();
			this.checking = false;
		}
	},
	
	httpReadyStateChange: function() {
		if(GetRssTitle.httpReq.readyState == 2) {
			try {
				GetRssTitle.httpReq.status;
			} catch(e) {
					// URL NOT AVAILABLE
				GetRssTitle.httpReq.abort();
				GetRssTitle.checking = false;
			}
		}
	},
	
	httpLoaded: function() {
		this.checking = false;
		
		var feed = new Feed(GetRssTitle.httpReq.responseXML);
		var rssTitle = feed.getTitle();

		if(!rssTitle) return;
		
		var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		var resultValue = { value: rssTitle };
		var result = prompt.prompt(window, "Sage", strRes.getString("get_feed_title"), resultValue, null, {});

		if(result) {
			CommonFunc.setBMDSProperty(GetRssTitle.res, CommonFunc.BM_NAME, resultValue.value);
		}
	}
}