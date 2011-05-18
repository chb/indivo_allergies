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
    
    params['offline'] = 1
    
    # request a request token
    request_token = parse_token_from_response(client.post_request_token(data=params))
    
    # store the request token in the session for when we return from auth
    request.session['request_token'] = request_token
    
    # redirect to the UI server
    return HttpResponseRedirect(settings.INDIVO_UI_SERVER_BASE + '/oauth/authorize?oauth_token=%s' % request_token['oauth_token'])

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
    
    # create the client
    params = {'oauth_verifier' : oauth_verifier}
    access_token = parse_token_from_response(client.post_access_token(data=params))
    
    # store stuff in the session
    request.session['access_token'] = access_token
    
    if access_token.has_key('xoauth_indivo_record_id'):
        request.session['record_id'] = access_token['xoauth_indivo_record_id']
    else:
        if request.session.has_key('record_id'):
            del request.session['record_id']
        request.session['carenet_id'] = access_token['xoauth_indivo_carenet_id']
    
    # now get the long-lived token using this access token
    client= get_indivo_client(request)
    try:
        long_lived_token = parse_token_from_response(client.get_long_lived_token())
        
        request.session['long_lived_token'] = long_lived_token
    except:
        pass
    return index(request)

def index(request):
    """pass the record_id to JMVC and use the JSON/REST api from there"""

    return render_to_response(
        settings.JS_HOME+'/'+settings.SUBMODULE_NAME+'.html',
        {'SUBMODULE_NAME': settings.SUBMODULE_NAME,
         'INDIVO_UI_APP_CSS': settings.INDIVO_UI_SERVER_BASE+'/jmvc/ui/resources/css/ui.css'}
    )

def allergies(request):
    limit = int(request.GET.get('limit', 100)) # defaults
    offset = int(request.GET.get('offset', 0))
    client = get_indivo_client(request)
    
    if request.session.has_key('record_id'):
        record_id = request.session['record_id']
        record = parse_xml(client.read_record(record_id = record_id).response['response_data'])
        xml = client.read_allergies(record_id = record_id).response['response_data']
    else:
        print 'FIXME: no client support for labs via carenet. See problems app for an example.. Exiting...'
        return
        
    reports_et = parse_xml(xml)
    reports_et_list = list(reports_et)
    reports = {
      'summary': {
        'total_document_count': reports_et_list[0].attrib['total_document_count'],
        'limit':                reports_et_list[0].attrib['limit'],
        'offset':               reports_et_list[0].attrib['offset'],
        'order_by':             reports_et_list[0].attrib['order_by'],
        'total_pages_count':    int(reports_et_list[0].attrib['total_document_count']) / limit,
        'current_page':         (offset / limit) + 1    # 1-index this
      },
      'reports': []
    }
    
    def _parse_report(report):
      meta = report.find('Meta')
      item = report.find('Item')
      allergy = item[0]
      
      # FIXME: get metadata
      # FIXME: get metadata
      # FIXME: get metadata
      
      return {
        'meta':  str(meta.text).strip(),
        'item': _parse_allergy(allergy)
      }
    
    def _parse_allergy(i):
      result = {}
      for e in i:
        if e.tag == NS+'dateDiagnosed':
          result.update({'dateDiagnosed': e.text})
        elif e.tag == NS+'allergen':
          for e2 in e:
            if e2.tag == NS+'type':
              result.update({'type': e2.text.strip()})
            elif e2.tag == NS+'name':
              result.update({'name': e2.text.strip()})
        elif e.tag == NS+'reaction':
          result.update({'reaction': e.text.strip()})
        elif e.tag == NS+'specifics':
          result.update({'specifics': e.text.strip()})
      return result
    

    # note: we depend on the reports being ordered by date_measured
    # it's ascending by default, hence the reverse()
    reports_for_parsing = list(reports_et.findall('Report'))
    reports_for_parsing.reverse()
    
    for r in reports_for_parsing:
      parsed_report = _parse_report(r)

      if parsed_report:
        reports['reports'].append(parsed_report)
      else:
        continue
        
    # print simplejson.dumps(reports)
    
    return HttpResponse(simplejson.dumps(reports), mimetype='text/plain')
