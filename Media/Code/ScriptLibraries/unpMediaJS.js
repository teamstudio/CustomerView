/*
 * short/ long tap implementation
 * 
 * usage: add 2 events to the event you want to use a long press on:
 * - onclick with an event.preventDefault()  call
 * - on touch end: call the onTouchEnd() function below with 2 callback functions: the first for
 * the click event, the 2nd for the long press event
 * 
 */
var touchStart;
var touchMoved = false;
var touchDelay = 450		//ms
var touchStartX = 0;		//area of the screen covered with the touch
var touchStartY = 0;		//area of the screen covered with the touch

window.addEventListener('touchstart',function(event) {
	touchStart = new Date().getTime(); 
	touchMoved = false;  
	touchStartX = event.changedTouches[0].pageX;
	touchStartY = event.changedTouches[0].pageY;
	
}, false);

window.addEventListener('touchmove',function(event) {
	touchMoved = true;
},false);


function touchEnd( clickCallBack, longPressCallBack ) {
	var touchedFor = (new Date().getTime()) - touchStart;
	
	if (touchMoved) {
		
		//check length of move: if the length is larger than
		//a pre-set margin we assume a drag event and do nothing
		var lenX = event.changedTouches[0].pageX - touchStartX;
		var lenY = event.changedTouches[0].pageY - touchStartY;
				
		if (lenX < 4 && lenY < 4 && touchedFor > touchDelay) {
			longPressCallBack.call(event); 
		}
		
	} else if( touchedFor > touchDelay ) {
		
		//$(event.target).addClass("toggle");
		
		longPressCallBack.call(event);  
	} else {
		clickCallBack.call(event);
	}
    
}

function hviewEmailSendMedia(xpage, unid, to) {
	var url = xpage + "?send=email&action=openDocument&documentId=" + unid + "&to=" + to;
	$("#hviewitemcontent").load(
		url.replace(" ", "%20") + " #results",
		function(data) {
		
			alert("The file has been shared with " + to);
			
			//close the dialog
			closeDialog('hviewPopup');
			
		}

	);
	
	
	
}

/* functions for the File Sync API */

function openMediaDialog(xpage, source, unid) {
	if (xpage.indexOf(".xsp") == -1) {
		xpage += ".xsp";
	}
	
	
	//we first check if this file has been downloaded/queued already
	$.ajax({
		dataType: "json",
		url: getFileAPIUrl("getStatus", unid),
		
		success: function(data) {
		
			var url = xpage + "?action=openDocument&documentId=" + unid;
		
			if (data != null) {		//only process files that have been downloaded previously
				
				if (data.status == "Complete") {
					
					if (data.localUrl == null) {
					
						//why does this happen? a completed file without a local url
						console.log("File " + data.fileName + " cannot be opened\n\n(error: path not found)");
					
					} else {
						
						url += "&islocal=true";

					}
					
				} else if (data.status == "Queued") {
					
					url += "&islocal=true";
					
				} else if (data.status == "InProgress") {
					
					url += "&islocal=true";
					
				} else if (data.status == "Error") {
					
					url += "&islocal=true";
					
					//console.log("This file cannot be opened due to an error.\n\nError: " + data.errorMsg);
					
				}
			}

			$("#hviewitemcontent").load(url.replace(" ", "%20") + " #" + source,
					function(data) {
						openDialog("hviewPopup");
						return false;
					});
		
		},
		error : function() { 
		
			console.log("An error occurred");
		
		}
		
	});
	
}

function openFile( key, dlgXPage, sourceDiv ) {
	
	console.log("check status for file with key: " + key);
	
	var apiUrl = getFileAPIUrl("getStatus", key);
	
	//console.log("url: " + apiUrl);
	
	$.ajax({
		dataType: "json",
		url: apiUrl,
		success: function(data) {
		
			if (data == null) {		//not queued yet, show dialog
				
				console.log("no data found in response");
				
				openMediaDialog(dlgXPage, sourceDiv, key);
				return; 
			}
			
			if (data.status == "Complete") {
				
				if (data.localUrl == null) {
				
					console.log("completed file without a local url");
					
					//why does this happen? a completed file without a local url
					//alert("File " + data.fileName + " cannot be opened\n\n(error: path not found)" + data.remoteUrl);
					
					//queue it again
					downloadFile( data.key, data.fileName, data.remoteUrl );
				
				} else {
					
					window.location.href = data.localUrl;
				
				}
				
			} else if (data.status == "Queued") {
				
				
				$("[unid='" + data.key + "']")
					.find("span.badge-downloading")
					.show();
				alert("This file has been queued for download. You need to synchronize first.");
			
			} else if (data.status == "InProgress") {
				
				alert("This file is currently being downloaded.\n\nRemaining time: " + data.progressTimeRemaining + " seconds.");
				
			} else if (data.status == "Error") {
				
				alert("This file cannot be opened due to an error.\n\nError: " + data.errorMsg);
				
			}
		
		},
		error : function() { 
		
			alert("An error occurred");
		
		}
		
	});
	
}

//mark/unmark a file as a favorite
function toggleFavorite(isFavorite, xpage, unid, fileName, remoteUrl) {
	
	if (xpage.indexOf(".xsp") == -1) {
		xpage += ".xsp";
	}
	var favoriteUrl = xpage + "?favorite=toggle&action=openDocument&documentId=" + unid;
	
	if (getURLParameter("islocal") == "true") { url += "&islocal=true"; }
	
	if (isFavorite) {		//already marked as a favorite: unmark it
		
		$("#hviewitemcontent").load(
			favoriteUrl.replace(" ", "%20") + " #results",
			function() {
				$("[unid='" + unid + "'] .badge-favorite").toggle();
				closeDialog('hviewPopup');
			}
		);
		
	} else {		//not marked yet: mark and schedule for download
		
		$.ajax( {
			url : getFileAPIUrl("addFile", unid),
			type : "POST",
			data : { 
				'immediate': false,
				'fileName' : fileName,
				'remoteUrl' : remoteUrl
			},
			success : function() {
				
				//mark this file as a favorite
				$("#hviewitemcontent").load( favoriteUrl.replace(" ", "%20") + " #results",
					function() {
						$("[unid='" + unid + "'] .badge-favorite").toggle();
						
						updateLocalFileStatus(unid);
						closeDialog('hviewPopup');
						
					}
				);
				
			},
			
			error : function() {
				alert("An error occurred. Please try again.");
				
			}
		});
		
	}
	
}

//add a file to the download queue
function downloadFile( key, fileName, remoteUrl, immediate) {
	
	var apiUrl = getFileAPIUrl("addFile", key);
	
	//console.log("mark for download at : " + apiUrl);
	
	$.ajax( {
		url : apiUrl,
		type : "POST",
		data : { 
			'immediate': immediate,
			'fileName' : fileName,
			'remoteUrl' : remoteUrl
		},
		success : function() {
			
			//file queued for immediate download
			updateLocalFileStatus(key);
			closeDialog('hviewPopup');
			
		},
		error : function() {
			
			alert("An error occurred");
			
			closeDialog('hviewPopup');
		}
	});
	
	
}

function removeLocalFile(key) {
	
	if ( confirm("Are you sure?") ) {
	
		$.getJSON(
			getFileAPIUrl("removeFile", key), 
			function(data) {
	
				updateLocalFileStatus(key);
				closeDialog('hviewPopup');
			}
		);
	}
}

function getQueue() {
	$.getJSON(getFileAPIUrl("getStatusAll"), function(data) {
		writeEntries(data, "fileEntries");
	});
	
}

//checks the local status for an individual item
function updateLocalFileStatus(key) {
	var $this = $("[unid='"  + key + "']");
	updateItemStatus(key, $this);
}

//checks the local status for all files
function updateLocalFileList() {
	
	$(".js-viewitem").each( function(index, value) {
	
		var key = $(this).attr("unid");
		var $this = $(this);
		updateItemStatus(key, $this);
	})
	
}

function updateItemStatus( key, itemNode ) {
	
	$.ajax({
		dataType: "json",
		url: getFileAPIUrl("getStatus", key),
		
		success: function(data) {
		
			if (data == null) {		//clear badges
				
				itemNode.find(".badge-downloaded").hide();
				itemNode.find(".badge-downloading").hide();
				
			} else {		//only prFocess files that have been downloaded previously
				
				if (data.status == "Complete") {
					
					if (data.localUrl == null) {
					
						//why does this happen? a completed file without a local url
						console.log("File " + data.fileName + " cannot be opened (error: path not found)");
					
					} else {
						
						itemNode.find(".badge-downloaded").show();
					}
					
				} else if (data.status == "Queued") {
					
					itemNode.find(".badge-downloading").show();
					
				} else if (data.status == "InProgress") {
					
					itemNode.find(".badge-downloading").show();
					
				} else if (data.status == "Error") {
					
					console.log("This file cannot be opened due to an error: " + data.errorMsg);
					
				}
			}
		
		},
		error : function() { 
		
			console.log("An error occurred");
		
		}
		
	});
	
}

function writeEntries(array, targetId, showAll) {
	
	console.log("write entries");
		
	//$("#" + targetId).html("");
	if (!array) {
		console.log("none found");
		return;
	}
	var arrayLength = parseInt(array.length);
	
	console.log("found " + arrayLength + " files");
	
	//$("#messages").html("found " + array.length + " entries");

	var numNonNSF = 0;
	
	for (i = 0; i < arrayLength; i++) {
		var entry = array[i];
		
		if (entry.key.indexOf(".nsf")==-1 && entry.key != "login" ) {
			//writeEntry(entry, targetId, showAll);
			
			console.log("- " + entry.key  + " / " + entry.status + " / " + entry.localUrl);
			
			numNonNSF++;
		}
		
	}
	
	console.log("num non nsf = " + numNonNSF);
	
	
}

function writeEntry(entry, targetId, showAll) {
	
	console.log("- " + entry.key  + " / " + entry.status + " / " + entry.localUrl);
	
	/*
	var id = 'queueEntry' + entry.key;
	var progressTarget = "";

	var markup = '<div id="' + id + '_container" class="box"'
			+ 'onclick="showEntry(\'' + entry.key + '\')"' + ' >'
			+ getEntryHtml(entry, id, showAll)
	if (entry.status == "InProgress") {
		progressTarget = entry.key;
		markup += '<div data-key="' + progressTarget + '"></div>';
	}
	markup += '</div>';
	$("#" + targetId).append(markup);

	if ("" !== progressTarget) {
		$("div[data-key='" + progressTarget + "']")
				.progressbar(
						{
							value : (100 * entry.progressCurrentBytes / entry.progressTotalBytes)
						});
	}*/
}

function getFileAPIUrl(type, key) {
	
	var url = "";
	var base = "http://localhost:8311";

	if (type == "addFile") {
		return base + "/api/v1/sync/schedule/" + key;
	} else if (type == "getStatus" ) {
		return base + "/api/v1/sync/" + key + "/status";
	} else if (type == "getStatusAll" ) {
		return base + "/api/v1/sync/files";
	} else if (type == "removeFile") {
		return base + "/api/v1/sync/" + key + "/remove";
	}
	
}

function switchFooterTab( toUrl ) {
	
	toUrl += " #contentwrapper";
	
	var _pushState = true;
	
	var thisArea = $("#content");
	thisArea.load(toUrl, function(data) {

		if (firedrequests != null) {
			firedrequests = new Array();
		}
				
		//extract footer content from ajax request and update footer
		var footerNode = $(data).find(".footer");
		if (footerNode) {
			$(".footer").replaceWith( footerNode );
		}

		unp.storePageRequest(toUrl);
		
		initiscroll();
		initHorizontalView();
		initDeleteable();
		initAutoComplete();
		
		//favorites? hide the menu
		if (toUrl.indexOf("Favorites")>-1) {
			$("#menu").hide();
			$("#content").addClass("pullleft");
			$("#results").css("margin-left", "0");
		} else {
			$("#menu").show();
			$("#content").removeClass("pullleft");
			if ( $(window).width() > 1001 ) {
				$("#results").css("margin-left", "30%");
			}
		}
		
		//check downloaded files
		updateLocalFileList();

	});
	
}