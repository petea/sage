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
		try{
			this.httpReq.send(null);
		}catch(e){
				// FAILURE
			this.httpReq.abort();
			this.checking = false;
		}
	},
	
	httpReadyStateChange: function(){
		if(GetRssTitle.httpReq.readyState == 2){
			try{
				GetRssTitle.httpReq.status;
			}catch(e){
					// URL NOT AVAILABLE
				GetRssTitle.httpReq.abort();
				GetRssTitle.checking = false;
			}
		}
	},
	
	httpLoaded: function(){
		this.checking = false;
		
		var xmlDoc = GetRssTitle.httpReq.responseXML;
		var rootNodeName = xmlDoc.documentElement.localName.toLowerCase();
		var rssTitle = "";

		switch(rootNodeName){
			case "rss":	// RSS
			case "rdf":
				var channelNode = xmlDoc.getElementsByTagName("channel")[0];
				var titleNode = channelNode.getElementsByTagName("title")[0];
				rssTitle = CommonFunc.getInnerText(titleNode);
				break;
			case "feed": // ATOM
				for(var i = xmlDoc.documentElement.firstChild; i!=null; i=i.nextSibling){
					if(i.nodeType != i.ELEMENT_NODE) continue;
					if(i.localName == "title") rssTitle = CommonFunc.getInnerText(i);
				}
				break;
			default:
				return;
				break;
		}
		if(!rssTitle) return;
		
		var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
						.getService(Components.interfaces.nsIPromptService);
		var resultValue = { value: rssTitle };
		var result = prompt.prompt(window, "RSS Reader Panel", "New Title", resultValue, null, {});

		if(result){
			CommonFunc.setBMDSProperty(GetRssTitle.res,
							CommonFunc.BM_NAME, resultValue.value);
		}
	}
}