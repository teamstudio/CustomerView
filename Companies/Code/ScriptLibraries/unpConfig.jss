function initConfig() {
	
	if (!applicationScope.init) {
		
		dBar.debug("init application scope");

		applicationScope.init = true;
	
		applicationScope.put("thisDbUrl", ( isUnpluggedServer() ? "" : "/.ibmxspres/domino") + "/" + @ReplaceSubstring(database.getFilePath(), "\\", "/") );
		
		var vwConfig:NotesView = database.getView("unpConfig");
		var docConfig:NotesDocument = vwConfig.getFirstDocument();
		
		if (null != docConfig) {
			
			applicationScope.put("dbActivitiesPath", docConfig.getItemValueString("dbActivitiesPath") );
			applicationScope.put("dbContactsPath", docConfig.getItemValueString("dbContactsPath") );
			
		}
		
	}

	if (!sessionScope.init) {

		dBar.debug("init session scope");

		sessionScope.init = true;
	
		var ua = @LowerCase( context.getUserAgent().getUserAgent() );
		
		sessionScope.put("isPhoneSupported", !@Contains( ua, "ipad") && !@Contains( ua, "ipod") );
		//sessionScope.put("isPhoneSupported", true);
		
		updateStats();
		
	}
	
}

function updateStats() {
	
	sessionScope.put("numCompanies", database.getView("unpCompanies").getEntryCount() );
	sessionScope.put("numContacts", database.getView("unpContacts").getEntryCount() );

}

initConfig();

function getIcon( type:String ) {
	
	switch (type) {
	
	case "company":
		return "building";
	case "contact":
		return "user";
	case "document":
		return "paperclip";
	case "letter":
		return "file";
	case "ticket":
		return "hospital";
	case "phone":
		return "phone_alt";
	case "opportunity":
		return "charts";
	case "visit":
		return "group";
	case "info":
		return "circle_info";
	case "mail":
		return "edit";
	case "offer":
		return "file";
	default:
		return "file";
	}
	
}

function saveDocument() {
	
	dBar.debug("in save document function");
	
	var response = "Started";
	
	try {
		
		var doc = null;
		var form = context.getUrlParameter("formname");
		var unid = context.getUrlParameter("unid");
		var targetDbPath = context.getUrlParameter("dbname");
		var parentunid = context.getUrlParameter("parentunid");	
		
		dBar.debug("> form: " + form + ", unid: " + unid + ", target database: " + targetDbPath);
		
		var dbTarget = null;
		
		if (!isEmpty(targetDbPath) ) {
			dbTarget = session.getDatabase("", targetDbPath);
		} else {
			dbTarget = database;
		}
		
		if (dbTarget.isOpen() ) {
			dBar.debug("target db opened");
		}
		
		if (!isEmpty(unid) ) {
			try{
				doc = dbTarget.getDocumentByUNID(unid);
			}catch(e){
				response = "error getting doc with unid " + unid;
			}
		} else {
			if ( isEmpty(form) ) {
				response = "no form name set";
				throw(response);
			}
		}
		
		if (doc == null){
			response = "Creating doc";
			//dBar.debug("create document");
			doc = dbTarget.createDocument();
			doc.replaceItemValue("Form", form);
		}
		
		response = "getting parentunid: " + parentunid;
		
		if ( !isEmpty(parentunid) ){
			dBar.debug("get parent document with unid " + parentunid );	
		
			try {
				var parent:NotesDocument = database.getDocumentByUNID(parentunid);
			} catch (pnf) {
				dBar.error("parent not found");
			}
			
			var parentIds = [];
			parentIds.push( parent.getItemValueString("ID") );
			
			if (parent.getItemValueString("form") == "frmContact" ) {
				parentIds.push( parent.getItemValueString("parentIDs") )	//adds ID of the parent company too
			}
			
			//creating a document with a parent: set parentid
			doc.replaceItemValue("parentIDs", parentIds );
			doc.replaceItemValue("Company", parent.getItemValueString("Company") );
		}
		
		response = "setting dateformat";
		var dateformat = /^(19|20)\d\d[- \/.](0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])$/;
		
		dBar.debug("getting keyset");
		var keys = param.keySet().iterator();
		dBar.debug("starting iterator loop");
		while(keys.hasNext()){
			var key = keys.next();
			//dBar.debug("Processing " + key);
			var value = unescape(param.get(key));
			if (dateformat.test(value)){
				value = value.split("-");
				value = session.createDateTime(@Date(parseInt(value[0], 10), parseInt(value[1], 10), parseInt(value[2], 10)));
			}
			if (@Left(key, 2) == "$$"){
				//Ignore, this is a system field
			}else if(key.indexOf(":") > -1){
				var fieldnames = key.split(":");
				var fieldname = fieldnames[fieldnames.length - 1];
				if (fieldname.indexOf("__") > -1){
					//This needs to be a multi value field
					fieldnames = fieldname.split("__");
					//dBar.debug("start fieldname = " + fieldname);
					fieldname = fieldnames[fieldnames.length - 1]
					response = "new fieldname = " + fieldname;
					response = "value = " + value;
					value = @Explode(value, ",");
				}
				doc.replaceItemValue(fieldname, value);
				//dBar.debug(fieldname + ": " + value);
			}else{
				doc.replaceItemValue(key, value);
				//dBar.debug(key + ": " + value);
			}
		}
		
		//dBar.debug("all fields processed");
		
		if (doc.isNewNote() ) {
			doc.replaceItemValue("ID", @Unique() );
			doc.replaceItemValue("DisplayDate", @Now() );
		}
		
		//ml: calculate details
		var f = doc.getItemValueString("Form");
		var type = doc.getItemValueString("type");
				
		if (f == "frmCompany") {
			
			doc.replaceItemValue("Details", @Trim( doc.getItemValueString("City")  + " " + doc.getItemValueString("ZipCode") ) );
			
		} else if (f == "frmContact") {
			
			//calculate Name field
			var firstName = doc.getItemValueString("FirstName");
			var lastName = doc.getItemValueString("LastName");
			
			doc.replaceItemValue("Name", lastName + ( !isEmpty(firstName) ? ", "  + firstName : "") ); 
			
		}
		
		doc.replaceItemValue("Icon", getIcon(type) );
		
		if ( doc.save() ) {
			response = doc.getUniversalID();
		}
				
	} catch ( e ) {
		
		dBar.error("error:");
		dBar.error(e);
		response = "Error: " + e;
		
	}
	
	return response;
	
}