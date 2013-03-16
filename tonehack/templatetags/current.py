from django.core.urlresolvers import resolve
from django import template
register = template.Library()

@register.filter
def urlname(url):
    return resolve(url).url_name
