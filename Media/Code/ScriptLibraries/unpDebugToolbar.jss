/**
 * Copyright 2013 Teamstudio Inc 
 * Licensed under the Apache License, Version 2.0 (the "License"); 
 * you may not use this file except in compliance with the License. You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0 
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed 
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for 
 * the specific language governing permissions and limitations under the License
 */

var dBar = {
		
	TYPE_DEBUG : "debug",
	TYPE_INFO : "info",
	TYPE_ERROR : "error",
	TYPE_WARNING : "warning",
	
	_get : function() {
	
		if (sessionScope.containsKey("dBar") ) {
			return sessionScope.get("dBar");
		} else {
			return {
				isCollapsed : false,
				isEnabled : true,
				messages : [],
				isInit : false,
				timerStarted : 0,
				firebugEnabled : false
			};
		}
	
	}, 
	
	init : function( collapsed:boolean ) {
		
		var _dBar = this._get();
		if (!_dBar.isInit) {
			_dBar.isInit = true;
			_dBar.isCollapsed = collapsed;
		}
		sessionScope.put("dBar", _dBar);
		
	},
	
	setCollapsed : function( to:boolean ) {
		
		var _dBar = this._get();
		_dBar.isCollapsed = to;
		sessionScope.put("dBar", _dBar);
		
	},
	
	setEnabled : function( to:boolean ) {
		
		var _dBar = this._get();
		_dBar.isEnabled = to;
		sessionScope.put("dBar", _dBar);
		
	},
	
	setFirebugEnabled : function( to:boolean ) {
		var _dBar = this._get();
		_dBar.firebugEnabled = to;
		sessionScope.put("dBar", _dBar);
		
	},
	
	isFirebugEnabled : function() {
		return this._get().firebugEnabled;
	},
	
	//check if the toolbar is enabled
	isEnabled : function() {
		return this._get().isEnabled;
	},
	
	//returns if the toolbar is in a collapsed or expanded state
	isCollapsed : function() {
		return this._get().isCollapsed;
	},
	
	//retrieve a list of messages 
	getMessages : function() {
		return this._get().messages;
	},
	
	//clears the list of messages & timer start
	clear : function() {
		var _dBar = this._get();
		_dBar.messages = [];
		_dBar.timerStarted = 0;
		sessionScope.put("dBar", _dBar);
	},
		
	//add a message to the toolbar
	//note: this function doesn't do anything if the toolbar is disabled
	addMessage : function(msg, type:String, showTimeSincePrevious:boolean ) {
		
		try {
		
			var _dBar = this._get();
			
			if ( !_dBar.isEnabled ) { return; }
			
			var messages = _dBar.messages;
			
			if (typeof msg != "string") {
				msg = msg.toString();
			}
			
			var now = new Date();
			
			if (showTimeSincePrevious && messages.length > 0) {
				
				var nowMs = now.getTime();
				var timerStarted = _dBar.timerStarted;
				
				if (timerStarted == 0) {
					_dBar.timerStarted = nowMs;
					timerStarted = nowMs;
				}
				
				var prevMessage = messages[0];
				var sincePrev = " (+" + ( nowMs - prevMessage.date.getTime() )  + "ms / " + (nowMs - timerStarted) + " ms)";
				msg += sincePrev;
			}
			
			var m = {
				"text": msg, 
				"date" : now, 
				"type" : type
			};
			
			//messages.unshift( m );
			messages.push( m );
			
			_dBar.messages = messages;
			
			sessionScope.put("dBar", _dBar);
			
		} catch (e) {		//error while logging
			print(e.toString() );
		}

	},
	
	//function to log different types of messages
	debug : function(msg) {
		this.addMessage(msg, this.TYPE_DEBUG, false);	
	},
	info : function(msg) {
		this.addMessage(msg, this.TYPE_INFO, false);	
	},
	error : function(msg) {
		this.addMessage(msg, this.TYPE_ERROR, false);	
	},
	warn : function(msg) {
		this.addMessage(msg, this.TYPE_WARNING, false);	
	},
	time : function(msg) {
		this.addMessage(msg, this.TYPE_DEBUG, true);	
	},
	
	//store all messages in a document in the current app
	save : function() {
		
		var saved = false;
	
		try {
			
			var doc = database.createDocument();
			
			doc.replaceItemValue("Form", "Log");
			doc.replaceItemValue("CreatedBy", @UserName() );
			doc.replaceItemValue("AppTitle", database.getTitle() );
			doc.replaceItemValue("LatestPage", context.getUrl().toString() );
			
			//TODO: would be great to add device info here too
			
			var _dBar = this._get();
			
			var messages = _dBar.messages;
			var messagesArr = [];
			
			for (var i=0; i<messages.length; i++) {
				
				messagesArr.push( @Text( messages[i].date ) + " " + messages[i].text );
			}
			
			doc.replaceItemValue("LogMessages", messagesArr);
			saved = doc.save();
		
		} catch (e) {
			print("error while saving:");
			print(e);
		}
		
		return saved;
	}
		
}