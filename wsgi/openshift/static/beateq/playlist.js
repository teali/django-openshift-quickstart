Array.prototype.diff = function(other) {
	var inOther = {};
	for (var i = 0; i < other.length; ++i)
		inOther[JSON.stringify(other[i])] = true;
	// inOther is anything in other
	var ret = [];
	for (var i = 0; i < this.length; ++i)
		if (!inOther.hasOwnProperty(JSON.stringify(this[i])))
			ret.push(this[i]);
	return ret;
};

function toMinutes(seconds){
	return Math.floor(seconds/60).toString()+":"+((seconds%60)<10?"0":"")+Math.floor(seconds%60).toString();
}

function songDiff(oldList, newList){
	var addSongs = newList.diff(oldList);
	var deleteSongs = oldList.diff(newList);
	for (i = 0; i < addSongs.length; i++){
		(function(i){
			$.getJSON("https://api.soundcloud.com/tracks/"
				+addSongs[i][1]
				+".json?client_id=7b56e7d11d264d0f34c0358846603a8f",function(track){		
				addSong(
					(track["artwork_url"] != null ? track["artwork_url"] : defaultArtUrl),
					track["title"],
					track["user"]["username"],
					addSongs[i][2],
					addSongs[i][1],
					addSongs[i][0],
					addSongs[i][3]);
				if (totalSong == 0){
					$(".song:eq(0)").addClass("playing");
					playSong("https://api.soundcloud.com/tracks/"+addSongs[i][1]+"/stream.format?client_id=7b56e7d11d264d0f34c0358846603a8f&allow_redirects=False",
						(track["artwork_url"] != null ? track["artwork_url"] : defaultArtUrl),
						track["title"],
						track["user"]["username"]);
				}
				totalSong +=1;
				if (totalSong > 0){$(".search_hint").fadeOut(200);}
				else {$(".search_hint").fadeIn(200);}
				$(".current_songs").text(totalSong.toString());
			});

		})(i)		
	}
	for (i = 0; i < deleteSongs.length; i++){
		var curDelete = $("#" + deleteSongs[i][0]);
		if ($(curDelete).parent().index()-1 == curSong){
			$(".song:eq("+curSong+")").removeClass("playing");
			curSong = (curSong+1) % totalSong;
			
			var curTrack = $(".song:eq("+curSong+")");
			curTrack.addClass("playing");
			playSong("https://api.soundcloud.com/tracks/"+curTrack.attr("id")+"/stream.format?client_id=7b56e7d11d264d0f34c0358846603a8f&allow_redirects=False",
			curTrack.find(".song_album_art").attr("src"),
			curTrack.find(".song_item_name").text(),
			curTrack.find(".song_item_artist").text());
		}
		curDelete.parent().slideUp(300).fadeOut({duration:300,queue:false}).promise().done(function(){
			$(curDelete).parent().remove();
		});
		if ($(curDelete).parent().index() < $(".song:eq("+curSong+")").index()){
			curSong -=1;
		}else if ($(curDelete).parent().index() == $(".song:eq("+curSong+")").index()){
			$(".play i").removeClass("fa-pause");
			$(".play i").addClass("fa-play");
			isPlay=false;
		}		
		totalSong -=1;
		if (totalSong > 0){$(".search_hint").fadeOut(200);}
				else {$(".search_hint").fadeIn(200);}
		$(".current_songs").text(totalSong.toString());
	}	
}

var curSong = 0;
var totalSong = 0;
var isPlay = false;
var songList = [];
var url = 'https://api.soundcloud.com/tracks.json?client_id=7b56e7d11d264d0f34c0358846603a8f';
var isAdmin = false;
var userChanged = false;

$(function(){
	isPlaylist = true;
	isPlaylist = true;

	var playlistName = $(".playlist_name").text();
	playlistResize();

	$(window).resize(function(){
		playlistResize();
	});

	//player
	audio = $('audio').get(0);

	//ajax

	//init playlist
	$.ajax({
		url: window.location.protocol + "//" + window.location.host + "/getsong",
		type: 'POST',
		data: JSON.stringify({"playlist" : playlistName,
							"password" : $(".password").val(),
							"timeout" : false}),
		contentType : 'application/json',
		dataType: 'json',
		success: function(data){
			songDiff(songList,data);
			songList = data;
		},
		error : function(){
		}
	});

	var getSongData = {"playlist" : playlistName,
						"password" : $(".password").val(),
						"timeout" : true};
	var addSongData = {}

	getSong = function(){
		$.ajax({
			url: window.location.protocol + "//" + window.location.host + "/getsong",
			type: 'POST',
			data: JSON.stringify(getSongData),
			contentType : 'application/json',
			dataType: 'json',
			success: function(data){
				songDiff(songList,data);
				songList = data;
				getSong();
			},
			error : function(){
				window.setTimeout(function(){getSong()},5000);
			}
		});
	}	
	getSong();
	//add song

	//admin ajax
	//admin polling
	var getAdminData = {"playlist" : playlistName,
						"password" : $(".password").val()};
	getAdmin = function(){
		$.ajax({
			url: window.location.protocol + "//" + window.location.host + "/getadminrequest",
			type: 'POST',
			data: JSON.stringify(getSongData),
			contentType : 'application/json',
			dataType: 'json',
			success: function(data){
				if (data == "not admin"){
					isAdmin = false;
				}else{
					alertify.log("<span style=\"font-weight:bold;\">" 
						+ data 
						+"</span> is asking to be an admin.");
					getAdmin();
				}
			},
			error : function(){
				window.setTimeout(function(){getAdmin()},5000);
			}
		});
	}	

	var usernameData = {"update" : ""};
	$.ajax({
		url: window.location.protocol + "//" + window.location.host + "/username",
		type: 'POST',
		data: JSON.stringify(usernameData),
		contentType : 'application/json',
		dataType: 'json',
		success: function(data){
			userChanged = data[1];
			if (userChanged){
				$(".overlay_username").css({"display":"none"})
			}else{
				$(".input_username").focus();
			}
		}
	});
	//block 
	$("body").on("click",".user_block",function(e){
		var banUserData = {"playlist" : playlistName,
						"password" : $(".password").val(),
						"bad_user" : $(this).parent().attr("id")};
		$.ajax({
			url: window.location.protocol + "//" + window.location.host + "/banuser",
			type: 'POST',
			data: JSON.stringify(banUserData),
			contentType : 'application/json',
			dataType: 'json',
			success: function(data){
				
			}
		});
	});

	$(".input_username").on("input",function(){
		$(".username_prompt").fadeIn("slow");
	})

	$(document).keypress(function(event){ 
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13' && userChanged == false){
			var usernameData = {"update" : $(".input_username").val()};
			$.ajax({
				url: window.location.protocol + "//" + window.location.host + "/username",
				type: 'POST',
				data: JSON.stringify(usernameData),
				contentType : 'application/json',
				dataType: 'json',
				success: function(data){
					
				}
			}).done(function(){
				$(".overlay_username").fadeOut("slow");
				userChanged = true;	
			});
			
		}	 
	});

	//admin
	$("body").on("click",".user_admin",function(e){
		var adminUserData = {"playlist" : playlistName,
						"password" : $(".password").val(),
						"good_user" : $(this).parent().attr("id")};
		$.ajax({
			url: window.location.protocol + "//" + window.location.host + "/allowadmin",
			type: 'POST',
			data: JSON.stringify(adminUserData),
			contentType : 'application/json',
			dataType: 'json',
			success: function(data){
				 if (data == "not admin"){
				 	alertify.log("You're not an admin.");
				 }else if (data == "already admin"){
				 	alertify.log("This user is already an admin.");
				 }
			}
		});
	});

	//song results
	$("body").on("click",".result_entry",function(){
		var thisEntry = $(this);
		$.ajax({
		url: "https://api.soundcloud.com/tracks/"
			+ thisEntry.attr("id") 
			+ "/stream.format?client_id=7b56e7d11d264d0f34c0358846603a8f&allow_redirects=False",
		dataType: 'text',
		type: 'HEAD',
		statusCode : {
			200 : function(){
				addSongData = {
				'playlist' : playlistName,
				'songId' : thisEntry.attr("id")};
				$.ajax({
					url: window.location.protocol + "//" + window.location.host + "/addsong",
					type: 'POST',
					data: JSON.stringify(addSongData),
					contentType : 'application/json',
					dataType: 'json'
				});
			},
			404 : function(){
				alertify.log("This song doesn't seem to work.");
			}}		
		});		
	});

	//playlist item
	$("body").on("click",".song",function(){
		$(".song:eq("+curSong+")").removeClass("playing");
		curSong = $(this).index()-1;
		$(this).addClass("playing");
		playSong("https://api.soundcloud.com/tracks/"+$(this).attr("id")+"/stream.format?client_id=7b56e7d11d264d0f34c0358846603a8f&allow_redirects=False",
			$(this).find(".song_album_art").attr("src"),
			$(this).find(".song_item_name").text(),
			$(this).find(".song_item_artist").text());
	});

	//close song
	$("body").on("click",".song_close",function(e){
		e.stopPropagation();
		deleteSongData = {
			'playlist' : playlistName,
			'songKey' : $(this).parent().children(".playlist_id").attr("id")};
		$.ajax({
			url: window.location.protocol + "//" + window.location.host + "/deletesong",
			type: 'POST',
			data: JSON.stringify(deleteSongData),
			contentType : 'application/json',
			dataType: 'json',
			success: function(data){
			}
		});	
	});
	
	$(".play").click(function(){
		if (!isPlay){
			audio.play();
			$(".play i").removeClass("fa-play");
			$(".play i").addClass("fa-pause");
		}else{
			audio.pause();
			$(".play i").removeClass("fa-pause");
			$(".play i").addClass("fa-play");
		}
		isPlay = !isPlay;		
	})

	$(".previous").click(function(){
		$(".song:eq("+curSong+")").removeClass("playing");
		curSong = (curSong-1) % totalSong;
		curTrack = $(".song:eq("+curSong+")");
		curTrack.addClass("playing");
		playSong("https://api.soundcloud.com/tracks/"+curTrack.attr("id")+"/stream.format?client_id=7b56e7d11d264d0f34c0358846603a8f&allow_redirects=False",
			curTrack.find(".song_album_art").attr("src"),
			curTrack.find(".song_item_name").text(),
			curTrack.find(".song_item_artist").text());
	});

	$(".forward").click(function(){
		$(".song:eq("+curSong+")").removeClass("playing");
		curSong = (curSong+1) % totalSong;
		
		var curTrack = $(".song:eq("+curSong+")");
		curTrack.addClass("playing");
		playSong("https://api.soundcloud.com/tracks/"+curTrack.attr("id")+"/stream.format?client_id=7b56e7d11d264d0f34c0358846603a8f&allow_redirects=False",
			curTrack.find(".song_album_art").attr("src"),
			curTrack.find(".song_item_name").text(),
			curTrack.find(".song_item_artist").text());
	});

	audio.addEventListener('ended', function(){
		$(".song:eq("+curSong+")").removeClass("playing");
		curSong = (curSong+1) % totalSong;
		
		var curTrack = $(".song:eq("+curSong+")");
		curTrack.addClass("playing");
		playSong("https://api.soundcloud.com/tracks/"+curTrack.attr("id")+"/stream.format?client_id=7b56e7d11d264d0f34c0358846603a8f&allow_redirects=False",
			curTrack.find(".song_album_art").attr("src"),
			curTrack.find(".song_item_name").text(),
			curTrack.find(".song_item_artist").text());
	}, false);

	loadingIndicator = $('.seek_load');
	if ((audio.buffered != undefined) && (audio.buffered.length != 0)) {
	  $(audio).bind('progress', function() {
	    var loaded = parseInt(((audio.buffered.end(0) / audio.duration)));
	    loadingIndicator.css({width: loaded*416 + "px"});
	  });
	}
	else {
	  loadingIndicator.remove();
	}

	//volume
	var startX,initMarkerX,initProgressX;
	var isSeekDrag = false;
	var dragToken = false;
	$(".volume_marker").on("mousedown",function(e){
		isSeekDrag = false;
		dragToken = true;
		startX = e.pageX;
		initMarkerX = parseInt($(".volume_marker").css("margin-left").replace("px",""));
		initProgressX = parseInt($(".volume_progress").css("width").replace("px",""));
		$("body").css({"-webkit-touch-callout":"none",
			"-webkit-user-select":"none",
			"-khtml-user-select":"none",
			"-moz-user-select":"none",
			"-ms-user-select":"none",
			"user-select":"none"})
		$(window).mousemove(function(e1) {
			var curPos = Math.min(Math.max(initMarkerX + e1.pageX - startX,-2),58);
			var curMarkerX = (curPos).toString()+"px";
			var curProgressX = (curPos+2).toString()+"px";
			$(".volume_marker").css({"margin-left":curMarkerX});
			$(".volume_progress").css({"width":curProgressX}); 
			audio.volume = (curPos+2)/60;
    	});
	});

	//seekbar
	$(".seek_marker").on("mousedown",function(e){
		isSeekDrag = true;
		dragToken = true;
		startX = e.pageX;
		initMarkerX = parseInt($(".seek_marker").css("margin-left").replace("px",""));
		initProgressX = parseInt($(".seek_progress").css("width").replace("px",""));
		$("body").css({WebkitTouchCallout:"none",
			"-webkit-user-select":"none",
			"-khtml-user-select":"none",
			"-moz-user-select":"none",
			"-ms-user-select":"none",
			"user-select":"none"})
		$(window).mousemove(function(e1) {
			var curPos = Math.min(Math.max(initMarkerX + e1.pageX - startX,-2),413);
			var curMarkerX = (curPos).toString()+"px";
			var curProgressX = (curPos+2).toString()+"px";
			$(".seek_marker").css({"margin-left":curMarkerX});
			$(".seek_progress").css({"width":curProgressX});
    	});
	});

	//drag
	$(document).on("mouseup",function(){
		if (dragToken){
			if (isSeekDrag){
				audio.currentTime = audio.duration*$(".seek_progress").width()/$(".seek_bg").width();
			}

			$(window).unbind("mousemove");
			$("body").css({"-webkit-touch-callout":"text",
				"-webkit-user-select":"text",
				"-khtml-user-select":"text",
				"-moz-user-select":"text",
				"-ms-user-select":"text",
				"user-select":"text"});
		}
		dragToken = false;
		isSeekDrag = false;
	});

	//seekbar duration
	window.setInterval(function(){
		if (!isSeekDrag){
			$(".seek_progress").width(audio.currentTime*415/audio.duration);
		$(".seek_marker").css({"margin-left":((audio.currentTime*415/audio.duration)-2).toString()+"px"});
		}
	},33);

	//time left
	window.setInterval(function(){
		var curMinusTime = toMinutes(audio.duration-audio.currentTime);
		if (curMinusTime.indexOf("NaN") > -1){
			curMinusTime = "-:--";
		}
		$(".seek_time").text("-"+curMinusTime);
	},33);
	var toggle = 0;
	//user options
	$("body").on("click",".upload_user",function(e){
		e.stopPropagation();
		if (toggle == 0){
			$(this).animate({"width":"0px"},{"queue":false,"duration":200})
			$(this).find(".user").fadeOut(200,function(){
				$(this).parent().animate({"width":"68px"},{"queue":false,"duration":200})
				$(this).parent().find(".user_block,.user_admin,.user_divider")			
				.fadeIn(200,function(){
					
				});
			});
		}else{
			$(this).animate({"width":"0px"},{"queue":false,"duration":200});
			$(this).find(".user_block,.user_divider,.user_admin").fadeOut(200,function(){
				$(this).parent().animate({"width":($(this).parent()
														 .find(".user")
														 .text()
														 .width("10px 'Open Sans'")+5)
														 .toString()+"px"},{"queue":false,"duration":200})
				$(this).parent().find(".user").fadeIn(200);
			});
		}
		toggle = 1-toggle;		
	});
});

function addSong(artUrl,name,artist,uploader,songId, id, sessionId){
	$(".song_container .block:last").before("<div style=\"display:none;\"class=\"song\" id=\""+songId+"\">\
												<div class=\"playlist_id\" id =\""+id+"\"></div>\
												<img class=\"song_album_art\" src=\""+artUrl+"\">\
												<div class=\"song_info\">\
													<p class=\"song_item_name\">"+name+"</p>\
													<p class=\"song_item_artist\">"+artist+"</p>\
												</div>\
												<img class=\"song_close\" src=\"" + window.location.protocol + "//" + window.location.host + "/static/beateq/cross.jpg\">\
												<div class=\"upload_user\" id=\""+sessionId+"\">\
													<p class=\"user\">"+uploader+"</p>\
													<p class=\"user_block\" style=\"display:none;\">Block</p>\
													<p class=\"user_divider\" style=\"display:none;\">|</p>\
													<p class=\"user_admin\" style=\"display:none;\">Admin</p>\
												</div>\
											</div>");
	$(".song_container .song:last").fadeIn();
}

function playSong(url,artwork,name,artist){
	audio.src=url;
	audio.load();
	$(".bqplayer .album_art").attr("src",artwork);
	$(".title").text(name);
	$(".artist").text(artist);
	$(".play i").removeClass("fa-play");
	$(".play i").addClass("fa-pause");
	audio.play();
	isPlay = true;
}

String.prototype.width = function(font) {
  var f = font || '12px arial',
      o = $('<div>' + this + '</div>')
            .css({'position': 'absolute', 'float': 'left', 'white-space': 'nowrap', 'visibility': 'hidden', 'font': f})
            .appendTo($('body')),
      w = o.width();

  o.remove();
  return w;
}

