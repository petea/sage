var UpdateChecker = {
	checking: false,
	resourceList: null,
	httpReq: null,
	lastResource: null,

	startCheck: function(aCheckFolderId) {
		if(this.checking) return;
	
		this.resourceList = CommonFunc.getBMDSCChildren(aCheckFolderId);
		
			// Delete separator and updeed resource
		for(var i=0; i<this.resourceList.length; i++) {
			var url = CommonFunc.getBMDSProperty(this.resourceList[i], CommonFunc.BM_URL);
			var desc = CommonFunc.getBMDSProperty(this.resourceList[i], CommonFunc.BM_DESCRIPTION);
			if(!url || desc == CommonFunc.STATUS_UPDATE || desc == CommonFunc.STATUS_NO_CHECK) {
				this.resourceList.splice(i,1);
			}
		}
		
		this.checking = true;
		this.check();
	},

	done: function() {
		if(this.checking) {
			this.httpReq.abort();
		}
	},

	check: function() {
		this.lastResource = this.resourceList.shift();
		var name = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_NAME);
		var url = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_URL);

		if(!url) {
			this.checkResult(false, 0);
		}

		if(this.httpReq) {
			this.httpReq.abort();
		}
		
		this.httpReq = new XMLHttpRequest();
		this.httpReq.parent = this;

		this.httpReq.open("GET", url);

		this.httpReq.onload = this.httpLoaded;
		this.httpReq.onerror = this.httpError;
		this.httpReq.onreadystatechange = this.httpReadyStateChange;

		try {
			this.httpReq.setRequestHeader("User-Agent", USER_AGENT);
			this.httpReq.overrideMimeType("application/xml");
			this.httpReq.send(null);
			this.onCheck(name, url);
		} catch(e) {
				// FAILURE
			this.httpReq.abort();
			this.checkResult(false, 0);
		}
	},

	httpError: function() {
		logMessage("HTTP Error");
	},

	httpReadyStateChange: function() {
		if(UpdateChecker.httpReq.readyState == 2) {
			try {
				UpdateChecker.httpReq.status;
			} catch(e) {
					// URL NOT AVAILABLE
				UpdateChecker.httpReq.abort();
				UpdateChecker.checkResult(false, 0);
			}
		}
	},

	httpLoaded: function(e) {
		var lastModified = 0;
		var gettingLastModified = false;

		try {
			var feed = new Feed(UpdateChecker.httpReq.responseXML);
		} catch(e) {
			UpdateChecker.checkResult(false, 0);
			return;
		}

		if(feed.hasLastPubDate()) {
			lastModified = feed.getLastPubDate().getTime();
		} else {
			try {
				lastModified = UpdateChecker.httpReq.getResponseHeader("Last-modified");
				lastModified = new Date(lastModified).getTime();
			} catch(e) {}
		}
		
		UpdateChecker.checkResult(true, lastModified);
	},

	checkResult: function(aSucceed, aLastModified) {
		var name = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_NAME);
		var url = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_URL);
		var status = 0;

		var lastVisit = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_LAST_VISIT);
		if(!lastVisit) {
			lastVisit = 0;
		} else {
			lastVisit /= 1000;
		}

		if(aLastModified) {
			if(aLastModified > lastVisit) {
				status = CommonFunc.STATUS_UPDATE;
			} else {
				status = CommonFunc.STATUS_NO_UPDATE;
			}
		} else {
			if(aSucceed) {
				status = CommonFunc.STATUS_UNKNOWN;
			} else {
				status = CommonFunc.STATUS_ERROR;
			}
		}

		CommonFunc.setBMDSProperty(this.lastResource, CommonFunc.BM_DESCRIPTION, status);
		
		if(this.resourceList.length == 0) {
			this.checking = false;
			this.onChecked(name, url);
			return;
		} else {
			this.check();
		}
	},


	onCheck: function(aName, aURL) {},
	onChecked: function(aName, aURL) {}

}