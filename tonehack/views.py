from shortcuts import template_response, json_response, html_response, not_found, redirect, now, datetime_to_unix
from django.db.models import Q
from tonehack.models import Instrument
from datetime import datetime
from django.core.urlresolvers import reverse
import re

def index(request):
    presets = Instrument.objects.filter(owner='murat')
    response = {
        'presets': presets,
        'default_instrument': Instrument.objects.get(urlid='default'),
        'name_examples': [
            'Indigo',
            'Paleo party',
            'Zoog',
            'Earpatch',
            'Antimpani',
            'Modem',
            'Kinder surprise',
            'Sound surf',
            'The shriek',
            'Rapmaster',
            'Shallow',
            'Deep',
            'Turtle walk',
            'String box',
            'Wind pipe',
            'Zoomer',
            'Boomer',
            'Cricketmaster 2000',
            'Koo',
            'Bow bow',
            'Bleak',
        ],
    }
    return template_response('index.html', response, request)

def instrument(request, urlid):
    try:
        response = {
            'instrument': Instrument.objects.get(urlid=urlid)
        }
        return template_response('load.html', response, request)
    except:
        return not_found()

def article(request):
    response = {}
    return template_response('article.html', response, request)

def violin(request):
    response = {}
    return template_response('violin.html', response, request)

def browse(request):
    presets = Instrument.objects.all()
    response = {
        'presets': presets
    }
    return template_response('browse.html', response, request)

def about(request):
    response = {}
    return template_response('about.html', response, request)

def save(request):
    if 'waves_json' not in request.POST or 'name' not in request.POST:
        response = {
            'status': 'failed',
            'message': 'waves_json and name arguments must be provied.',
        }
        return json_response(response)

    waves = request.POST['waves_json']
    name = request.POST['name'].strip()
    if name == '':
        name = 'something'
    orig_urlid = re.sub(r'\W+', '-', name)
    urlid = orig_urlid

    i = 1
    while Instrument.objects.filter(urlid=urlid).exists():
        urlid = orig_urlid + "-{i}".format(i=i)
        i += 1

    instrument = Instrument(
        name=name,
        urlid=urlid,
        waves_json=waves,
        owner=request.META['REMOTE_ADDR'],
        date=datetime.utcnow(),
    )

    instrument.save()
    url = 'test'

    response = {
        'status': 'ok',
        'url': request.build_absolute_uri(reverse('instrument', kwargs={'urlid': urlid})),
    }
    return json_response(response)
