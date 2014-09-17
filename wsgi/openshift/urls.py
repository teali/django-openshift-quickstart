from django.conf.urls import patterns, include, url
from beateq import views
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'beateq.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),
    url(r'^$',views.front),
    url(r'^p/[\da-zA-z0-9]+',views.playlist),
    url(r'^getsong$',views.get_song),
    url(r'^addsong$',views.add_song),
    url(r'^deletesong$',views.delete_song),
    url(r'^getadminrequest$',views.get_admin_request),
    url(r'^requestadmin$',views.request_admin),
    url(r'^createplaylist$',views.create_playlist),
    url(r'^banuser$',views.ban_user),
    url(r'^allowadmin$',views.allow_admin),
    url(r'^username$',views.update_username),
    url(r'^poll$',views.poll),
    url(r'^update$',views.update),
    url(r'^admin/', include(admin.site.urls)),
)
