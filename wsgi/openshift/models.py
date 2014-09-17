from django.db import models

try: import simplejson as json
except ImportError: import json

class Playlist(models.Model):
	blacklist = models.TextField()
	admins = models.TextField()
	songs = models.TextField()
	name = models.CharField(max_length = 200)
	password = models.CharField(max_length = 128)
	stamp = models.IntegerField(default = 0)
	user_views = models.IntegerField(default = 0)
	total_songs = models.IntegerField(default = 0)
	pending_admin = models.TextField(default = "")
