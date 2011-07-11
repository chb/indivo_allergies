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


def new_allergy(request):
    """
    Creates an allergy XML from POSTed values and submits the document to Indivo server
    """
    if 'POST' != request.method:
        return HttpResponse('error')
    
    # parse the data
    params = _allergy_params_from_post(request.POST)
    new_xml = render_raw('allergy', params, type='xml')
    
    # add the allergy
    client = get_indivo_client(request)
    res = client.post_document(record_id = request.session['record_id'], data=new_xml)
    
    # we always return a 200 HttpResponse, let's deal with errors in the controller
    status = res.response['response_status']
    if 200 == int(status):
        status = 'success'
    else:
        status = res.response['response_data'] if res.response['response_data'] else status
    
    return HttpResponse(status)


def replace_allergy(request, allergy_id):
    """
    Creates an allergy XML from POSTed values and submits it as replacement of an existing document
    """
    if 'POST' != request.method:
        return HttpResponse('error')
    
    # parse the data
    params = _allergy_params_from_post(request.POST)
    new_xml = render_raw('allergy', params, type='xml')
    
    # add the allergy
    client = get_indivo_client(request)
    res = client.replace_document(record_id = request.session['record_id'], document_id = allergy_id, data=new_xml)
    
    # we always return a 200 HttpResponse, let's deal with errors in the controller
    status = res.response['response_status']
    if 200 == int(status):
        status = 'success'
    else:
        status = res.response['response_data'] if res.response['response_data'] else status
    
    return HttpResponse(status)


def one_allergy(request):
    return HttpResponse('["not implemented"]')
    #return HttpResonse(simplejson.dumps(reports))


def allergy_history(request, allergy_id):
    """
    Fetches allergy document versions and document status history and
    sorts them by createdAt
    """
    
    client = get_indivo_client(request)
    record_id = request.session['record_id']
    
    # 1: fetch history
    xml = client.read_document_status_history(record_id = record_id, document_id = allergy_id).response['response_data']
    history_etree = parse_xml(xml)
    history = _parse_status(history_etree.findall('DocumentStatus'))
    
    # 2: fetch versions
    xml = client.read_document_versions(record_id = record_id, document_id = allergy_id).response['response_data']
    version_etree = parse_xml(xml)
    versions = []
    for v in version_etree.findall('Document'):
        versions.append(_parse_meta(v))
    
    # mix and sort
    history.extend(versions)
    history.sort(key=lambda x: datetime.datetime.strptime(x['createdAt'], '%Y-%m-%dT%H:%M:%SZ'), reverse=True)
    
    return HttpResponse(simplejson.dumps(history), mimetype='text/plain')


def set_allergy_status(request, allergy_id):
    ret = {}
    if 'POST' != request.method:
        ret = { 'status': 'error', 'data': 'method not allowed' }
    else:
        client = get_indivo_client(request)
        record_id = request.session['record_id']
        data = { 'status': request.POST.get('status', ''), 'reason': request.POST.get('reason', '') }
        res = client.set_document_status(record_id = record_id, document_id = allergy_id,  data = data)
        
        # we always return a 200 HttpResponse, let's deal with errors in the controller
        status = res.response['response_status']
        if 200 == int(status):
            
            # success, give us back the document
            meta_xml = client.read_document_meta(record_id = record_id, document_id = allergy_id).response['response_data']
            meta = parse_xml(meta_xml)
            doc_xml = client.read_document(record_id = record_id, document_id = allergy_id).response['response_data']
            doc = parse_xml(doc_xml)
            report = {
                'meta': _parse_meta(meta),
                'item': _parse_allergy(doc)
            }
            ret = { 'status': 'success', 'data': [ report ] }
        else:
            ret = { 'status': 'error', 'data': res.response['response_data'] if res.response['response_data'] else status }
    
    return HttpResponse(simplejson.dumps(ret))


def allergies(request):
    """
    Returns a list of allergies for the given record
    """
    
    # process request attributes
    limit = int(request.GET.get('limit', 100)) # defaults
    offset = int(request.GET.get('offset', 0))
    status = request.GET.get('status', 'active')
    stat_arr = status.split('+')
    if len(stat_arr) < 1:
        stat_arr = [ 'active' ]
    client = get_indivo_client(request)
    
    if request.session.has_key('record_id'):
        record_id = request.session['record_id']
    else:
        print 'FIXME: no client support for labs via carenet. See problems app for an example.. Exiting...'
        return
    
    # can only get documents with one status at a time, so loop over the desired status here
    # and collect all reports to be parsed in a set
    num_docs = 0
    all_reports = []
    for stat in stat_arr:
        xml = client.read_allergies(record_id = record_id, parameters = { 'status': stat }).response['response_data']
        reports_et = parse_xml(xml)
        reports_et_list = list(reports_et)
        num_docs += int(reports_et_list[0].attrib['total_document_count'])
        # don't bother about limit, offset, order_by and consort for now...
        
        reports_for_parsing = list(reports_et.findall('Report'))
        all_reports.extend(reports_for_parsing)
    
    # parse all reports
    parsed_reports = []
    for r in all_reports:
        parsed_report = _parse_report(r)
        
        if parsed_report:
            parsed_reports.append(parsed_report)
    
    # sort reports
    
    
    # build response
    reports = {
        'summary': {
            'total_document_count': num_docs,
          # 'limit':                reports_et_list[0].attrib['limit'],
          # 'offset':               reports_et_list[0].attrib['offset'],
          # 'order_by':             reports_et_list[0].attrib['order_by'],
          # 'total_pages_count':    int(reports_et_list[0].attrib['total_document_count']) / limit,
          # 'current_page':         (offset / limit) + 1        # 1-index this
        },
        'data': parsed_reports
    }
    # print simplejson.dumps(reports)
    
    return HttpResponse(simplejson.dumps(reports), mimetype='text/plain')



# Only used by class instances
def _parse_report(report):
    meta = report.find('Meta')
    meta = meta[0] if meta is not None and len(meta) > 0 else None
    allergy = report.find('Item')
    allergy = allergy[0] if allergy is not None and len(allergy) > 0 else None
    
    if allergy is None:
        allergy = report                    # assume we were only given the allergy XML tree
    
    return {
        'meta': _parse_meta(meta),
        'item': _parse_allergy(allergy)
    }


def _parse_meta(tree):
    """
    parses one node of "Document" (metadata) type
    """
    if tree is None:
        return None
    
    result = { 'id': tree.attrib['id'], 'type': 'meta' }
    for node in tree:
        if 'creator' == node.tag:
            creator = {'id': node.attrib['id'], 'name': node.find('fullname').text.strip()}
            result.update({'creator': creator})
        elif 'createdAt' == node.tag:
            #created = datetime.strptime(node.text, '%Y-%m-%dT%H:%M:%SZ')       # doesn't play well with simplejson
            result.update({'createdAt': node.text})
        elif 'original' == node.tag:
            result.update({'original': node.attrib['id']})
        elif 'latest' == node.tag:
            result.update({'latest': node.attrib['id']})
        else:
            result.update({node.tag: node.text.strip() if node.text else ''})
    
    return result
            

def _parse_allergy(tree):
    result = {}
    
    if tree is not None and len(tree) > 0:
        for e in tree:
            if e.tag == NS+'dateDiagnosed':
                result.update({'dateDiagnosed': e.text})
            elif e.tag == NS+'allergen':
                for e2 in e:
                    if e2.tag == NS+'type':
                        result.update({'type': e2.text.strip() if e2.text is not None else '' })
                    elif e2.tag == NS+'name':
                        result.update({'name': e2.text.strip() if e2.text is not None else '' })
            elif e.tag == NS+'reaction':
                result.update({'reaction': e.text.strip() if e.text is not None else '' })
            elif e.tag == NS+'specifics':
                result.update({'specifics': e.text.strip() if e.text is not None else '' })
            elif e.tag == NS+'diagnosedBy':
                result.update({'diagnosedBy': e.text.strip() if e.text is not None else '' })
    
    return result


def _parse_status(node_arr):
    """
    parses an array of DocumentStatus elements into status objects
    """
    if node_arr is None:
        return None
    
    # loop nodes
    entries = []
    for node in node_arr:
        if 'DocumentStatus' == node.tag:
            entry = {
                'type': 'status-history',
                'creator': { 'id': node.attrib['by'], 'name': '' },
                #'date': node.attrib['at'],
                # the 'at' timestamp is not ISO 8601 formatted, so in our server we added another field 'createdAt' which is correctly formatted:
                'createdAt': node.attrib['createdAt'],
                'status': node.attrib['status']
            }
            
            for subnode in node:
                if 'reason' == subnode.tag:
                    entry['reason'] = subnode.text.strip() if subnode.text else ''
            
            entries.append(entry)
    
    return entries


def _allergy_params_from_post(post):
    
    # parse the date (TODO: Really parse human input)
    from datetime import datetime
    date_diag = post['date_onset'] if post.get('date_onset', '') != '' else datetime.now().strftime('%Y-%m-%d')
    
    # get the variables and create an XML
    params = {  'code_abbrev':      '',
                'coding_system':    'snomed',
                'date_diagnosed':   date_diag,
                'allergen_type':    post.get('allergen_type', 'unknown'),
                'allergen_name':    post.get('allergen_name', ''),
                'reaction':         post.get('reaction', 'unknown'),
                'specifics':        post.get('specifics', ''),
                'diagnosed_by' :    post.get('diagnosed_by', '')
            }
    
    return params

    
    