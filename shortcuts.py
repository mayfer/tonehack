from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
import django.utils.simplejson as json
from datetime import datetime
import calendar

def template_response(template, data, request):
    return HttpResponse(render_to_response(template, data, context_instance=RequestContext(request)))
    
def json_response(data):
	return HttpResponse(json.dumps(data), mimetype='application/javascript')
	
def html_response(response):
	return HttpResponse(response, mimetype='text/html')
	
def redirect(url=None, label=None, args=None, kwargs=None):
	if url:
		return HttpResponseRedirect(url)
	if label:
		return HttpResponseRedirect(reverse(label, args=args))
		
def not_found():
	raise Http404

def datetime_to_unix(date):
    return calendar.timegm(date.utctimetuple())

def now():
    # return UTC Unix timestamp
    return datetime_to_unix(datetime.utcnow())
