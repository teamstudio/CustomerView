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