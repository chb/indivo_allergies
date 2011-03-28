// This is useful for telling ajax requests to go somewhere else.  
(function($){
	if(jQuery.browser.rhino){
        print("\nWARNING! The dom/fixture/overwrite plugin is referencing "+steal.documentLocation+"\n")
    }
	var ajax = $.ajax;
    var folder= new steal.File(steal.documentLocation).dir();
	$.ajax = function(settings){
		// convert url from include.options.documentLocation 
        var url =  settings.url;
        settings.url = new steal.File(url).joinFrom(folder);
        return ajax(settings);	
	}

})(jQuery);


