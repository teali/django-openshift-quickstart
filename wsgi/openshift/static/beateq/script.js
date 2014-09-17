var search = "";
var overlay = false;
var searchOpen = false;
var isPlaylist = false;
var defaultArtUrl = "http://127.0.0.1:8000/static/beateq/art_Default.jpg"
function pxEm(a,b){
    b = typeof b !== 'undefined' ? b : 'body';
    return a / parseFloat($(b).css("font-size"));
}

$(function(){
	//django ajax setup
	function getCookie(name) {
		var cookieValue = null;
		if (document.cookie && document.cookie != '') {
			var cookies = document.cookie.split(';');
			for (var i = 0; i < cookies.length; i++) {
				var cookie = jQuery.trim(cookies[i]);
				if (cookie.substring(0, name.length + 1) == (name + '=')) {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}
	var csrftoken = getCookie('csrftoken');
	function csrfSafeMethod(method) {
		// these HTTP methods do not require CSRF protection
		return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
	}
	$.ajaxSetup({
		beforeSend: function(xhr, settings) {
			if (!csrfSafeMethod(settings.type)) {
				xhr.setRequestHeader("X-CSRFToken", csrftoken);
			}
		}
	});

	$(".create_playlist").click(function(){
		$(".overlay_create").css({"display":"block"});
		$(".overlay_create").animate({"opacity":"1"},500);
		overlay = true;
		$("input:first").focus();
	});

	$("div.form_button").click(function(){
		$(".overlay_create").animate({"opacity":"0"},500,function(){
			$(".overlay_create").css({"display":"none"});
		});	
		overlay = false;
	});

	$(".loading_results").css({"display":"none"});

	SC.initialize({
	    client_id: "7b56e7d11d264d0f34c0358846603a8f",
  	});
  	//allow_redirects=False
  	/*
  	$.get('https://api.soundcloud.com/tracks/63965313/stream.format?client_id=ac21691e06c61fb5b73cb06789c7244c&allow_redirects=False', function (data,textStatus,jqXHR){
  		//console.log(data);
  	});
  	*/
  	var url = 'https://api.soundcloud.com/tracks.json?client_id=7b56e7d11d264d0f34c0358846603a8f';

  	$(".search").click(function(){
  		$(".search_result_container").css({"display":"block"});
  		searchOpen = true;
  		if (isPlaylist) playlistResize();
  		search = "";
  		$(".search_type").text(search);
  	});
  	console.log(isPlaylist);
	$( "body" ).keydown(function( event ) {
		if (isPlaylist && $.inArray(event.which, [8]) != -1){event.preventDefault()};
		if (!overlay && userChanged){
			if ((event.which >= 65 && event.which <=90) || event.which == 32 || (event.which >=48 && event.which <=57) || (event.which >=96 && event.which <=105)){
				$(".search_result_container").css({"display":"block"});
				searchOpen = true;
				if (isPlaylist) playlistResize();
				search += String.fromCharCode((event.which >=96 && event.which <=105)?event.which-48:event.which);
				$(".search_type").text(search); 
			}
			if ( event.which == 8 ) {
				search = search.substring(0,search.length-1);
				$(".search_type").text(search); 
			}
			if ( event.which == 13 ) {
				$(".search_results").empty();
				$(".loading_results").css({"display":"block"});
				$.getJSON(url+"&q="+search/*+"&license=cc-by-sa"*/, function(tracks) {
					cols =Math.floor(pxEm($("body").width())/15);
					$(".search_results").empty();
					loop1:
					for (i = 0; i < Math.ceil(tracks.length/3); i++){
						var curCol = "<div class=\"search_column\" style=\"opacity:0;\">";
						loop2:
						for (j = 0; j < 3; j++){
							index = i*3+j;
							if (index >= tracks.length){break loop1;}
							curCol += "<div class=\"result_entry\" id=\""+tracks[index]["id"].toString()+"\">";
							if (tracks[index]["artwork_url"] != null){
								curCol += "<img class=\"album_art\" src=\""+tracks[index]["artwork_url"]+"\">";
							}else{
								curCol += "<img class=\"album_art\" src=\""+defaultArtUrl+"\">";
							}
							curCol += "<p class=\"song_name\">"+tracks[index]["title"]+"</p>";
							curCol += "<p class=\"song_artist\">"+tracks[index]["user"]["username"]+"</p>";
							curCol += "</div>";
						}
						curCol += "</div>";
						$(".search_results").append(curCol);
						$(".search_column").last().animate({opacity:1},500);
					}
					$(".loading_results").css({"display":"none"});
				});
			}
			if ( event.which == 27 ) {
				//event.preventDefault();
				$(".search_result_container").css({"display":"none"});
				searchOpen = false;
				if (isPlaylist) playlistResize();
				$(".search_results").empty();
				search = "";
			}
		}
	});

	$(".search_container").click(function(){
		$(".search_result_container").css({"display":"block"});
		searchOpen = true;
		if (isPlaylist) playlistResize();
	});

	$(".submit").submit(function(e){return false;});

	var currentCreatedPlaylist = "";
	$(".submit").click(function(e){
		e.preventDefault();
		var playlistData = {"playlist" : $("input").val(),
						"password" : $(".password").val()};
		$.ajax({
	    	url: 'createplaylist',
			type: 'POST',
			data: JSON.stringify(playlistData),
			contentType: 'application/json',
			dataType: 'json',
			success: function(data) {
				if (data == 1){
					window.location.replace("http://127.0.0.1:8000/p/"+playlistData["playlist"]);
				}else{
					$(".created").html("<p>The playlist <span style=\"font-weight:bold\">"+playlistData["playlist"]+"</span> has already been created, click here to go to it.</p>")
					currentCreatedPlaylist = "http://127.0.0.1:8000/p/"+playlistData["playlist"];
					$(".created").fadeIn(200);
				}

			}
		});
	});

	$(".created").click(function(){
		window.location.replace(currentCreatedPlaylist);
	});
});

function playlistResize(){
	if (!searchOpen){
		$(".song_container").height($("body").height()-70-$(".search_container").height());
	}else{
		$(".song_container").height($("body").height()-70-$(".search_result_container").height());
	}
}