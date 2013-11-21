function deleteDocument(id, dbPath) {
	
	var url = "UnpDelete.xsp?id=" + id + (dbPath != null ? "&dbPath=" + encodeURI(dbPath) : "");
	
	$.ajax( {
		type : 'GET',
		url : url,
		success : function(data) {
		
			if (data == "ok") {
				history.go(-2);
			} else {
				alert(data);
			}
		}
	} );
	
}