"""
utility functions for the views

Ben Adida (ben.adida@childrens.harvard.edu)
Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
"""

from xml.etree import ElementTree
import cgi
import datetime

from indivo_client_py import IndivoClient

# settings including where to find Indivo
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.core.exceptions import *
from django.core.urlresolvers import reverse
from django.db import transaction
from django.template import Context, loader

import settings # app local settings


def get_indivo_client(request, with_session_token=True):
    server_params = {"api_base": settings.INDIVO_SERVER_LOCATION,
                     "authorization_base": settings.INDIVO_UI_SERVER_BASE}
    consumer_params = settings.INDIVO_SERVER_OAUTH
    token = request.session['access_token'] if with_session_token else None
    client = IndivoClient(server_params, consumer_params, resource_token=token)
    return client

def parse_token_from_response(resp):
    token = cgi.parse_qs(resp.response['response_data'])
    for k, v in token.iteritems():
        token[k] = v[0]
    return token

MIME_TYPES = {'html': 'text/html', 'xml': 'application/xml'}

def render_raw(template_name, vars, type):
  """ rendering a template into a string """
  t_obj = loader.get_template('%s.%s' % (template_name, type))
  c_obj = Context(vars)
  return t_obj.render(c_obj)

def render_template(template_name, vars={}, type="html"):
  """ rendering a template into a Django HTTP response with proper mimetype """

  new_vars = {'INDIVO_UI_SERVER_BASE': settings.INDIVO_UI_SERVER_BASE,
              'CB': datetime.datetime.now().isoformat()}
  new_vars.update(vars)
  content = render_raw(template_name, new_vars, type="html")
  mimetype = MIME_TYPES[type]
  return HttpResponse(content, mimetype=mimetype)

def parse_xml(xml_string):
  return ElementTree.fromstring(xml_string)
