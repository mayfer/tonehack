from django.conf.urls.defaults import patterns, include, url
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('tonehack.views',
    url(r'^$', 'index', name='index'),
    url(r'^admin/', include(admin.site.urls)),

    url(r'^save/?$', 'save', name='save'),
    url(r'^article/?$', 'article', name='article'),
    url(r'^violin/?$', 'violin', name='violin'),
    url(r'^browse/?$', 'browse', name='browse'),
    url(r'^about/?$', 'about', name='about'),
    url(r'^i/(?P<urlid>[a-zA-Z0-9_-]+)/?$', 'instrument', name='instrument'),
)
