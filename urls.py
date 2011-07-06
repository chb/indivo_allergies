from django.conf.urls.defaults import *
from views import *
import settings

# all this is under apps/submod
urlpatterns = patterns('',
    # authentication
    (r'^start_auth', start_auth),
    (r'^after_auth', after_auth),
    
    (r'^allergies$', allergies), # can't use "list" obviously
    (r'^allergies/new$', new_allergy),
  # (r'^allergies/(?P<allergy_id>[^/]+)$', one_allergy),
    (r'^allergies/(?P<allergy_id>[^/]+)/history/$', allergy_history),
    (r'^allergies/(?P<allergy_id>[^/]+)/set-status$', set_allergy_status),
    
    (r'^jmvc/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.JMVC_HOME}),
    (r'^(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.JS_HOME})
)


