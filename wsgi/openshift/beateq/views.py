#from gevent import monkey
#monkey.patch_all(socket=True, dns=True, time=True, select=True,thread=False, os=True, ssl=True, httplib=False, aggressive=True)

from django.shortcuts import render_to_response
from django.core.context_processors import csrf
from django.template import RequestContext, loader
from django.http import StreamingHttpResponse, HttpResponse
from django.db import models
from django.utils.timezone import utc

from beateq.models import Playlist
from threading import Event
#from gevent.event import Event
from collections import defaultdict
from random import randint

try: import simplejson as json
except ImportError: import json



#longpolling setup
def event_setup():
	event = Event()
	event.clear()
	return event

events = defaultdict(event_setup)

# 0 = already created, 1 = successfully created
def create_playlist(request):
	try:
		data = json.loads(request.body)
		if len(Playlist.objects.filter(name = data['playlist'])) < 1:
			new_playlist = Playlist(blacklist = json.dumps([""]),
				admins = json.dumps([request.session.session_key]),
				songs = json.dumps([]),
				name = data['playlist'],
				password = data['password'])
			new_playlist.save()
		else:
			return HttpResponse(json.dumps(0), content_type = "application/json")
	except:
		return HttpResponse(status=400)
	return HttpResponse(json.dumps(1), content_type = "application/json")

def add_song(request):
	songKey = 0
	if 'username' not in request.session: request.session['username'] = "guest"+str(randint(1,999999))
	try:
		data = json.loads(request.body)
		if len(Playlist.objects.filter(name = data['playlist'])) == 1:
			playlist = Playlist.objects.get(name = data['playlist'])
			if request.session.session_key not in json.loads(playlist.blacklist):
				songs = json.loads(playlist.songs)
				while (True):
					songKey = randint(1,999999999)
					for song in songs:
						if song[0] == songKey: continue
					break
				songs.append([songKey, data['songId'], request.session['username'] , request.session.session_key])
				playlist.songs = json.dumps(songs)
				playlist.save()

				#longpoll
				events[data['playlist']+"-song"].set()
				events[data['playlist']+"-song"] = event_setup()
			else:
				return HttpResponse(json.dumps("blocked"), content_type = "application/json")
	except:
		return HttpResponse(status=400)
	return HttpResponse(json.dumps(""), content_type = "application/json")

def delete_song(request):
	try:
		data = json.loads(request.body)
		if len(Playlist.objects.filter(name = data['playlist'])) == 1:
			playlist = Playlist.objects.get(name = data['playlist'])
			if request.session.session_key not in json.loads(playlist.blacklist):
				songs = json.loads(playlist.songs)
				for song in songs:
					if str(song[0]) == data['songKey']:
						songs.remove(song)
				playlist.songs = json.dumps(songs)
				playlist.save()

				#longpoll
				events[data['playlist']+"-song"].set()
				events[data['playlist']+"-song"] = event_setup()
			else:
				return HttpResponse(json.dumps("blocked"), content_type = "application/json")
	except:
		return HttpResponse(status=400)
	return HttpResponse(json.dumps(""), content_type = "application/json")

def get_song(request):	
	try:
		data = json.loads(request.body)
		if len(Playlist.objects.filter(name = data['playlist'])) == 1:
			if not data['timeout']: return HttpResponse(Playlist.objects.get(name = data['playlist']).songs ,content_type = "application/json")
			events[data['playlist']+"-song"].wait()
			return HttpResponse(Playlist.objects.get(name = data['playlist']).songs ,content_type = "application/json")
	except:
		return HttpResponse(status=404)

def update_username(request):
	if 'username' not in request.session: request.session['username'] = "guest"+str(randint(1,999999))
	try:
		data = json.loads(request.body)
		if data['update'] != "":
			request.session["username"] = data['update']
			request.session["username_changed"] = True
		return HttpResponse(json.dumps([request.session["username"],("username_changed" in request.session)]) ,content_type = "application/json")
	except:
		return HttpResponse(status=400)

def ban_user(request):
	try:
		data = json.loads(request.body)
		if len(Playlist.objects.filter(name = data['playlist'])) == 1: 
			playlist = Playlist.objects.get(name = data['playlist'])
			if request.session.session_key in json.loads(playlist.admins) and data['bad_user'] not in json.loads(playlist.admins):				
				blacklist = json.loads(playlist.blacklist)
				blacklist.append(data['bad_user'])
				playlist.blacklist = json.dumps(blacklist)
				playlist.save()
				return HttpResponse(json.dumps("") ,content_type = "application/json")
			elif data['bad_user'] in json.loads(playlist.admins):
				return HttpResponse(json.dumps("no permission") ,content_type = "application/json")
			else:
				return HttpResponse(json.dumps("not admin") ,content_type = "application/json")
	except:
		return HttpResponse(status=400)

def allow_admin(request):
	try:
		data = json.loads(request.body)
		if len(Playlist.objects.filter(name = data['playlist'])) == 1:
			playlist = Playlist.objects.get(name = data['playlist']) 
			if request.session.session_key in json.loads(playlist.admins) and data['good_user'] not in json.loads(playlist.admins):			
				admins = json.loads(playlist.admins)
				admins.append(data['good_user'])
				playlist.admins = json.dumps(admins)
				playlist.save()
				return HttpResponse(json.dumps("") ,content_type = "application/json")
			elif data['good_user'] in json.loads(playlist.admins):	
				return HttpResponse(json.dumps("already admin") ,content_type = "application/json")
			else:
				return HttpResponse(json.dumps("not admin") ,content_type = "application/json")
	except:
		return HttpResponse(status=400)

def request_admin(request):
	if 'username' not in request.session: request.session['username'] = "guest"+str(randint(1,999999))
	try:
		data = json.loads(request.body)
		if len(Playlist.objects.filter(name = data['playlist'])) == 1: 
			playlist = Playlist.objects.get(name = data['playlist']) 
			playlist.pending_admin = json.dumps([request.session.session_key,request.session['username']])
			playlist.save()
			events[data['playlist']+"-admin"].set()
			events[data['playlist']+"-admin"] = event_setup()
	except:
		return HttpResponse(status=404)

def get_admin_request(request):
	try:
		data = json.loads(request.body)
		if len(Playlist.objects.filter(name = data['playlist'])) == 1: 
			playlist = Playlist.objects.get(name = data['playlist']) 
			if request.session.session_key in json.loads(playlist.admins):	
				events[data['playlist']+"-admin"].wait()
				return HttpResponse(Playlist.objects.get(name = data['playlist']).pending_admin ,content_type = "application/json")
			else:
				return HttpResponse(json.dumps("not admin") ,content_type = "application/json")
	except:
		return HttpResponse(status=404)

def playlist(request):
	if len(Playlist.objects.filter(name = request.path.strip("/p/"))) == 1: 
		request.session.set_test_cookie()
		request.META["CSRF_COOKIE_USED"] = True
		template = loader.get_template('beateq/playlist.html')
		context = RequestContext(request, {'playlist_name': request.path.strip("/p/")})
		return HttpResponse(template.render(context))
	else:
		return HttpResponse(status=404)

def front(request):
	request.session.set_test_cookie()
	request.META["CSRF_COOKIE_USED"] = True
	template = loader.get_template('beateq/index.html')
	context = RequestContext(request, {})
	return HttpResponse(template.render(context))

def poll(request):
	try:
		events['index'].wait()
		return HttpResponse(json.dumps(""),content_type = "application/json")
	except Exception,e:
		print str(e)
		return HttpResponse(status=404)

def update(request):
	try:
		events['index'].set()
		events['index'] = event_setup()
	except:
		return HttpResponse(status=404)
	return HttpResponse("")