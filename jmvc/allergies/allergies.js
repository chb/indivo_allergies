steal.plugins(
  'jquery/controller',
  // 'jquery/controller/subscribe',
  'jquery/view/ejs',
  // 'jquery/model/store',
  'jquery/model'
  // 'jquery/dom/fixture',
  // 'jquery/dom/form_params'
)
.resources(
  // don't add .js to file names (it's flakey on jmvc alpha 10)
  // oh, and don't add jquery here... duh!
  "underscore-min"
)
.models('allergy')
.controllers('allergy')
.views()