module("steal")

test("steal's domain()", function(){
     equals(null,new steal.File("file://C:/Development").domain(),"problems from file" )
     equals('something.com',new steal.File('http://something.com/asfdkl;a').domain(),"something.com is the correct http domain." )
     equals('127.0.0.1:3006',new steal.File('https://127.0.0.1:3006/asdf').domain(),"something.com is the correct https domain." )	
})

test("steal's joinFrom()", function(){
	var result = new steal.File('a/b.c').joinFrom('/d/e');
    equals(result, "/d/e/a/b.c", "/d/e/a/b.c is correctly joined.");
	
	result = new steal.File('a/b.c').joinFrom('d/e');
    equals(result, "d/e/a/b.c", "d/e/a/b.c is correctly joined.");	
	
	result = new steal.File('a/b.c').joinFrom('d/e/');
    equals(result, "d/e/a/b.c", "d/e/a/b.c is correctly joined.");	
	
	result = new steal.File('a/b.c').joinFrom('http://abc.com');
    equals(result, "http://abc.com/a/b.c", "http://abc.com/a/b.c is correctly joined.");	
	
	result = new steal.File('/a/b.c').joinFrom('http://abc.com');
    equals(result, "http://abc.com/a/b.c", "http://abc.com/a/b.c is correctly joined.");		
	
	result = new steal.File('a/b.c').joinFrom('http://abc.com/');
    equals(result, "http://abc.com/a/b.c", "http://abc.com/a/b.c is correctly joined.");
	
	result = new steal.File('/a/b.c').joinFrom('http://abc.com/');
    equals(result, "http://abc.com/a/b.c", "http://abc.com/a/b.c is correctly joined.");		
	
	result = new steal.File('a/b.c').joinFrom('../d/e');
    equals(result, "../d/e/a/b.c", "../d/e/a/b.c is correctly joined.");		
})

test("steal's dir()", function(){
    equals("/a/b/c", new steal.File("/a/b/c/cookbook.html").dir(), "/a/b/c dir is correct.")	
    equals("a/b/c", new steal.File("a/b/c/cookbook.html").dir(), "a/b/c dir is correct.")
    equals("../a/b/c", new steal.File("../a/b/c/cookbook.html").dir(), "../a/b/c dir is correct.")
    equals("http://127.0.0.1:3007", new steal.File("http://127.0.0.1:3007/cookbook.html").dir(), "http://127.0.0.1:3007 dir is correct.")
})

test("steal's File.clean()", function(){
	result = new steal.File('http://abc.com#action').clean();
    equals(result, "http://abc.com", "http://abc.com#action is correctly cleaned.");
	
	result = new steal.File('http://abc.com#action&q=param').clean();
    equals(result, "http://abc.com", "http://abc.com#action&q=param is correctly cleaned.");
	
	result = new steal.File('http://abc.com/#action&q=param').clean();
    equals(result, "http://abc.com/", "http://abc.com/#action&q=param is correctly cleaned.");	
	
	result = new steal.File('a/b/#action&q=param').clean();
    equals(result, "a/b/", "a/b/#action&q=param is correctly cleaned.");	
	
	result = new steal.File('a/b#action&q=param').clean();
    equals(result, "a/b", "a/b#action&q=param is correctly cleaned.");	
})

test("steal's File.protocol()", function(){
	result = new steal.File('http://abc.com').protocol();
    equals(result, "http:", "http://abc.com protocol should be http:.");
	
	result = new steal.File('https://abc.com').protocol();
    equals(result, "https:", "https://abc.com protocol should be https:.");	
	
	result = new steal.File('file://a/b/c').protocol();
    equals(result, "file:", "file://a/b/c protocol should be file:.");	
	
	result = new steal.File('file:///a/b/c').protocol();
    equals(result, "file:", "file:///a/b/c protocol should be file:.");	
})

test("steal's File.join(url)", function(){
	result = new steal.File("http://abc.com").join("/a/b/c");
    equals(result, "http://abc.com/a/b/c", "http://abc.com/a/b/c was joined successfuly.");	
	
	result = new steal.File("http://abc.com/").join("/a/b/c");
    equals(result, "http://abc.com/a/b/c", "http://abc.com/a/b/c was joined successfuly.");
	
	result = new steal.File("http://abc.com/").join("a/b/c");
    equals(result, "http://abc.com/a/b/c", "http://abc.com/a/b/c was joined successfuly.");
	
	result = new steal.File("http://abc.com").join("a/b/c");
    equals(result, "http://abc.com/a/b/c", "http://abc.com/a/b/c was joined successfuly.");	
	
	result = new steal.File("a/b/c").join("d/e");
    equals(result, "a/b/c/d/e", "a/b/c/d/e was joined successfuly.");	
	
	result = new steal.File("a/b/c/").join("d/e");
    equals(result, "a/b/c/d/e", "a/b/c/d/e was joined successfuly.");
	
	result = new steal.File("a/b/c/").join("/d/e");
    equals(result, "/d/e", "/d/e was joined successfuly.");
	
	result = new steal.File("a/b/c").join("/d/e");
    equals(result, "/d/e", "/d/e was joined successfuly.");			
})

test("steal's File.joinCurrent()", function(){
	steal.setCurrent("http://abc.com");
	result = new steal.File("d/e").joinCurrent();
    equals(result, "http://abc.com/d/e", "http://abc.com/d/e was joined successfuly.");		
	
	steal.setCurrent("/a/b/");
	result = new steal.File("c/d").joinCurrent();
    equals(result, "/a/b/c/d", "/a/b/c/d was joined successfuly.");		
})

test("steal's File.relative()", function(){
	result = new steal.File("a/b/c").relative();
	ok(result, "a/b/c is relative.")
	
	result = new steal.File("/a/b/c").relative();
	ok(!result, "/a/b/c is NOT relative.")
})

test("steal's File.isLocalAbsolute()", function(){
	result = new steal.File("/a/b/c").isLocalAbsolute();
	ok(result, "/a/b/c is absolute.")
	
	result = new steal.File("a/b/c").isLocalAbsolute();
	ok(!result, "a/b/c is NOT absolute.")	
})

test("steal's File.isDomainAbsolute()", function(){
	result = new steal.File("http://abc.com/d/e").isDomainAbsolute();
	ok(result, "http://abc.com/d/e domain is absolute.")
	
	result = new steal.File("http://abc.com/d/e/").isDomainAbsolute();
	ok(result, "http://abc.com/d/e/ domain is absolute.")
	
	result = new steal.File("https://abc.com/d/e").isDomainAbsolute();
	ok(result, "https://abc.com/d/e domain is absolute.")
	
	result = new steal.File("https://abc.com/d/e/").isDomainAbsolute();
	ok(result, "https://abc.com/d/e/ domain is absolute.")
	
	result = new steal.File("file://a/b/c/d/e").isDomainAbsolute();
	ok(result, "file://a/b/c/d/e domain is absolute.")
	
	result = new steal.File("file://a/b/c/d/e/").isDomainAbsolute();
	ok(result, "file://a/b/c/d/e/ domain is absolute.")
	
	result = new steal.File("file:///a/b/c/d/e").isDomainAbsolute();
	ok(result, "file:///a/b/c/d/e domain is absolute.")
})

test("steal's File.afterDomain()", function(){
	result = new steal.File("http://abc.com/d/e").afterDomain();
    equals(result, "/d/e", "/d/e is the correct after domain result.");
})

test("steal's File.toReferenceFromSameDomain()", function(){
	result = new steal.File("http://abc.com/d/e").toReferenceFromSameDomain("http://abc.com/d/e/f/g/h");
    equals(result, "../../../", "../../../ is the correct reference from same domain result.");	
	
	result = new steal.File("http://abc.com/d/e/x/y").toReferenceFromSameDomain("http://abc.com/d/e/f/g/h");
    equals(result, "../../../x/y", "../../../x/y is the correct reference from same domain result.");
	
	result = new steal.File("a/b/c/x/y").toReferenceFromSameDomain("a/b/c/d/e");
    equals(result, "../../x/y", "../../x/y is the correct reference from same domain result.");			
	
	result = new steal.File("a/b/c/d/e").toReferenceFromSameDomain("a/b/c/d/e");
    equals(result, "", "'' is the correct reference from same domain result.");	
})

test("steal's File.normalize()", function(){
	steal.setCurrent("/a/b/");
	result = new steal.File("c/d").normalize();
    equals(result, "/a/b/c/d", "/a/b/c/d was normalized successfuly.");
	
	steal.setCurrent("/a/b/c");
	result = new steal.File("//d/e").normalize();
    equals(result, "d/e", "d/e was normalized successfuly.");	
	
	steal.setCurrent("/a/b/c");
	result = new steal.File("/d/e").normalize();
    equals(result, "/d/e", "/d/e was normalized successfuly.");	
	
	steal.setCurrent("http://abc.com");
	result = new steal.File("d/e").normalize();
    equals(result, "http://abc.com/d/e", "http://abc.com/d/e was normalized successfuly.");
	
	steal.setCurrent("http://abc.com");
	result = new steal.File("/d/e").normalize();
    equals(result, "http://abc.com/d/e", "http://abc.com/d/e was normalized successfuly.");	
})
