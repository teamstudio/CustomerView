//find the download document in the current database
function getDownloadDoc( db:NotesDatabase, strDownloadId:String ) {

	var docDownload:NotesDocument = null;
	
	try {
		docDownload = db.getDocumentByUNID( strDownloadId );
	} catch (e) {
		
	}
	
	if (docDownload == null) {
		var dc = db.search("Form=\"fDownload\" & downloadId=\"" + strDownloadId + "\"");
	
		if (dc.getCount()==1) {
			docDownload = dc.getFirstDocument();
		}
	}
	
	return docDownload;
	
}

function getFile(response, out) {
	
	var db = sessionAsSigner.getCurrentDatabase();
	
	var strDownloadId = context.getUrlParameter("id");
	var docDownload:NotesDocument = getDownloadDoc( db, strDownloadId) ;
	
	if (docDownload != null) {


		//check if this download didn't expire yet
		if (docDownload.hasItem("expires") ) {
	
			var expiresMs = docDownload.getItemValue("expires").get(0).toJavaDate().getTime();		
			
			if ( new Date().getTime() > expiresMs) {
				throw("This file has expired.");
			}
					
		}
		
		//retrieve original document containing the specified file
		var attachmentDbPath = docDownload.getItemValueString("attachmentDbPath");
		var attachmentSourceUnid = docDownload.getItemValueString("attachmentSourceUnid");
		
		var dbAtt = sessionAsSigner.getDatabase( db.getServer(), attachmentDbPath);
		
		if (dbAtt.isOpen()) {
			
			var docFile = dbAtt.getDocumentByUNID( attachmentSourceUnid);
			
			if (docFile != null) {
				var att = session.evaluate("@AttachmentNames", docFile);
				var fileName = att.get(0);
				
				var eo:NotesEmbeddedObject = docFile.getAttachment(fileName);
				
				if (eo != null) {
	
					//set up header in response
					response.setContentLength( eo.getFileSize() );
					response.setContentType( getContentType( fileName ) );
					
					response.setHeader("Pragma", "private");
					response.setHeader("Cache-Control", "no-cache, no-store");		//no caching of this file at all
					response.setDateHeader("Expires", -1);
					response.setHeader( "Content-Disposition", "attachment; filename=\"" + fileName + "\"" );	
	
					//send the file to the browser
					writeFileOutput(eo, out);
	
				}
			}
		}

	}
	
}

function writeFileOutput(eo, outputStream) {
	
	var buffer = new byte[4 * 1024];	// 4K buffer
	var bytesRead;
	
	var bufferedIS = new java.io.BufferedInputStream( eo.getInputStream());
	
	while ((bytesRead = bufferedIS.read(buffer)) != -1) {
		outputStream.write(buffer, 0, bytesRead);
	}
	
	bufferedIS.close();
	eo.recycle();
	outputStream.close();
	
}

function getContentType( strFile ) {
	
	var strContentType = "application/octet-stream";
	
	//get file extension
	var strExtension = (strFile.lastIndexOf(".") >-1 ? 
		strFile.substring( strFile.lastIndexOf(".")+1 ).toLowerCase() :
		null);
	
	if (strExtension != null) {
		switch (strExtension) {
			case "jpg":
				strContentType = "image/jpeg"; break;
			case "gif":
				strContentType = "image/gif"; break;
			case "png":
				strContentType = "image/png"; break;
			case "pdf":
				strContentType = "application/pdf"; break;
			case "mov":
				strContentType = "video/quicktime"; break;
			case "mpg": case "mpeg":
				strContentType = "video/mpeg"; break;
			case "doc":
				strContentType = "application/msword"; break;
			case "docx":
				strContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
				break;
			case "xlsx":
				strContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
				break;	
			case "pptx":
				strContentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
				break;
			}
	}	
	
	return strContentType;
}

