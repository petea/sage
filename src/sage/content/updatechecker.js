var UpdateChecker = {
	checking: false,
	checkList: null,
	httpReq: null,
	lastResource: null,

	startCheck: function(aCheckFolderId) {
		if(this.checking) return;

		var resourceList = CommonFunc.getBMDSCChildren(aCheckFolderId);
		this.checkList = new Array();

			// Delete separator and updeed resource
		for(var i = 0; i < resourceList.length; i++) {
			var url = CommonFunc.getBMDSProperty(resourceList[i], CommonFunc.BM_URL);
			var desc = CommonFunc.getBMDSProperty(resourceList[i], CommonFunc.BM_DESCRIPTION);
			var status = desc.split(" ")[0];
			if(url && !(status == CommonFunc.STATUS_UPDATE || status == CommonFunc.STATUS_NO_CHECK)) {
				this.checkList.push(resourceList[i]);
			}
		}

		logMessage("checking " + this.checkList.length + " feed(s)");
		
		this.checking = true;
		this.check();
	},

	done: function() {
		if(this.checking) {
			this.httpReq.abort();
		}
	},

	check: function() {
		this.lastResource = this.checkList.shift();
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

	httpError: function(e) {
		logMessage("HTTP Error: " + e.target.status + " - " + e.target.statusText);
		UpdateChecker.httpReq.abort();
		UpdateChecker.checkResult(false, 0);
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

		try {
			var feed = new Feed(UpdateChecker.httpReq.responseXML);
		} catch(e) {
			UpdateChecker.checkResult(false, 0);
			return;
		}

		if(feed.hasLastPubDate()) {
			lastModified = feed.getLastPubDate().getTime();
		}
		
		UpdateChecker.checkResult(true, lastModified, feed);
	},

	checkResult: function(aSucceed, aLastModified, feed) {
		var name = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_NAME);
		var url = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_URL);
		var status = 0;

		var lastVisit = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_LAST_VISIT);
		if(!lastVisit) {
			lastVisit = 0;
		} else {
			lastVisit /= 1000;
		}

		if(aSucceed) {
			var sig = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_DESCRIPTION).match(/\[.*\]/);
			if(aLastModified) {
				if((aLastModified > lastVisit) && (sig != feed.getSignature())) {
					status = CommonFunc.STATUS_UPDATE;
				} else {
					status = CommonFunc.STATUS_NO_UPDATE;
				}
			} else {
				if(sig != feed.getSignature()) {
					//logMessage("signature mismatch: " + feed.getTitle() + "; old sig: " + sig + "  new sig: " + feed.getSignature());
					status = CommonFunc.STATUS_UPDATE;
				} else {
					status = CommonFunc.STATUS_NO_UPDATE;
				}
			}
		} else {
			status = CommonFunc.STATUS_ERROR;
		}

		CommonFunc.setBMDSProperty(this.lastResource, CommonFunc.BM_DESCRIPTION, status + " " + CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_DESCRIPTION).match(/\[.*\]/));
		
		if(this.checkList.length == 0) {
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