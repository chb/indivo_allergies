//load("jquery/controller/subscribe/test/funcunit/run.js")


//load global selenium settings, change if you want something different
load('settings/selenium.js')

load('steal/rhino/loader.js');
rhinoLoader(function(){
    steal.plugins('jquery/controller/subscribe/test/funcunit');  // load tests
}, true);