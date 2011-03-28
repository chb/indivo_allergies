//steal/js allergies/scripts/compress.js

load("steal/rhino/steal.js");
steal('//steal/compress/compress',function(){
	steal.compress('allergies/allergies.html',{to: 'allergies'})
})