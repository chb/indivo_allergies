from django.conf import settings # top-level setttings

SUBMODULE_NAME = 'allergies'
INDIVO_SERVER_OAUTH = {
  'consumer_key': SUBMODULE_NAME+'@apps.indivo.org',
  'consumer_secret': SUBMODULE_NAME
}
INDIVO_SERVER_LOCATION = settings.INDIVO_SERVER_LOCATION
INDIVO_UI_SERVER_BASE = settings.INDIVO_UI_SERVER_BASE
JMVC_HOME = settings.SERVER_ROOT_DIR + '/apps/'+SUBMODULE_NAME+'/jmvc/'
JS_HOME = JMVC_HOME + SUBMODULE_NAME + '/'
