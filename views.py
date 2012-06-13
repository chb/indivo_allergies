""" 
Arjun Sanyal arjun.sanyal@childrens.harvard.edu

TODO: use lxml here. which is a lot more pythonic. See http://codespeak.net/lxml/tutorial.html

"""

DEBUG = True

from utils import *
from django.utils import simplejson
from xml.etree import ElementTree
from django.shortcuts import render_to_response
import settings # app local

NS = '{http://indivo.org/vocab/xml/documents#}'
XSI = '{http://www.w3.org/2001/XMLSchema-instance}'


def start_auth(request):
    """
    begin the oAuth protocol with the server
    
    expects either a record_id or carenet_id parameter,
    now that we are carenet-aware
    """
    # create the client to Indivo
    client = get_indivo_client(request, with_session_token=False)
    
    # do we have a record_id?
    record_id = request.GET.get('record_id', None)
    carenet_id = request.GET.get('carenet_id', None)
    
    # prepare request token parameters
    params = {'oauth_callback':'oob'}
    if record_id:
        params['indivo_record_id'] = record_id
    if carenet_id:
        params['indivo_carenet_id'] = carenet_id
    
    # request a request token
    req_token = client.fetch_request_token(params)

    # store the request token in the session for when we return from auth
    request.session['request_token'] = req_token
    
    # redirect to the UI server
    return HttpResponseRedirect(client.auth_redirect_url)

def after_auth(request):
    """
    after Indivo authorization, exchange the request token for an access token and store it in the web session.
    """
    # get the token and verifier from the URL parameters
    oauth_token, oauth_verifier = request.GET['oauth_token'], request.GET['oauth_verifier']
    
    # retrieve request token stored in the session
    token_in_session = request.session['request_token']
    
    # is this the right token?
    if token_in_session['oauth_token'] != oauth_token:
        return HttpResponse("oh oh bad token")
    
    # get the indivo client and use the request token as the token for the exchange
    client = get_indivo_client(request, with_session_token=False)
    client.update_token(token_in_session)
    access_token = client.exchange_token(oauth_verifier)
    
    # store stuff in the session
    request.session['access_token'] = access_token
    
    if access_token.has_key('xoauth_indivo_record_id'):
        request.session['record_id'] = access_token['xoauth_indivo_record_id']
        if request.session.has_key('carenet_id'):
            del request.session['carenet_id']
    else:
        if request.session.has_key('record_id'):
            del request.session['record_id']
        request.session['carenet_id'] = access_token['xoauth_indivo_carenet_id']
    
    return index(request)

def index(request):
    """pass the record_id to JMVC and use the JSON/REST api from there"""

    return render_to_response(
        settings.JS_HOME+'/'+settings.SUBMODULE_NAME+'.html',
        {'SUBMODULE_NAME': settings.SUBMODULE_NAME,
         'INDIVO_UI_APP_CSS': settings.INDIVO_UI_SERVER_BASE+'/jmvc/ui/resources/css/ui.css'}
    )

def allergies(request):
    limit = int(request.GET.get('limit', 100))
    offset = int(request.GET.get('offset', 0))
    query_params = {
        'limit': limit,
        'offset': offset,
        'order_by': 'severity_title',
        }
    client = get_indivo_client(request)
    
    if request.session.has_key('record_id'):
        record_id = request.session['record_id']
        resp, content = client.record(record_id=record_id)
        if resp['status'] != '200':
            # TODO: handle errors
            raise Exception("Error reading Record info: %s"%content)
        record = parse_xml(content)

        resp, content = client.generic_list(record_id=record_id, data_model="Allergy", body=query_params)
        if resp['status'] != '200':
            # TODO: handle errors
            raise Exception("Error reading allergies: %s"%content)
        allergies = simplejson.loads(content)

        resp, content = client.generic_list(record_id=record_id, data_model="AllergyExclusion")
        if resp['status'] != '200':
            # TODO: handle errors
            raise Exception("Error reading allergy exclusions: %s"%content)
        exclusions = simplejson.loads(content)
    else:
        print 'FIXME: no client support for labs via carenet. See problems app for an example.. Exiting...'
        return
        
    reports = {
      'summary': {
            'total_document_count': len(allergies),
            'limit': limit,
            'offset': offset,
            'total_pages_count': len(allergies) / limit,
            'current_page': (offset / limit) + 1    # 1-index this
            },
      'reports': allergies,
      'exclusions':exclusions,
      }
    
    return HttpResponse(simplejson.dumps(reports), mimetype='text/plain')
