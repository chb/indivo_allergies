/**
 * @tag controllers, home
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 */
$.Controller.extend('Allergies.Controllers.Allergy',
/* @Static */
{
	onDocument: true,
	limit: 25,
	details_p: false
},
/* @Prototype */
{
	ready: function() {
		if (!$("#allergy").is('*')) {
			$(document.body).append($('<div/>').attr('id','allergy'));
		}
		$('#allergy').html(this.view('loading'));
	},
	
	load: function() {
		Allergies.Models.Allergy.findAll({}, this.callback('list'));
	},
	
	list: function(allergies) {
		// we can use a callback here if we need strict ordering (e.g. for iframe resize)
		var _this = this;
		var callback = function() {
			$('#loading').hide();
		};
		var _show = function(callback) {
			$('#allergy').html(_this.view('init',
				{
					'reports':	allergies,
					'summary':	allergies.summary
				}));
			if (callback) {
				callback();
			}
		};
		_show(callback);
	},
	
	
	// ** Show details
	'.allergy_details click': function(link) {
	    if ($('#one_allergy').is('*')) {
	        return;
	    }
        
	    // find the allergy object
	    var allerg = link.model();
	    if (!allerg) {
	        $(link).text('Error');
	        return;
	    }
	    
	    // adjust buttons and links
	    var allergy_table = $('#allergy_list');
	    allergy_table.css('opacity', 0.5).css('opacity', 0.5).find('.allergy_details').addClass('disabled');
		link.removeClass('disabled').addClass('active');
		$('#add_allergy').attr('disabled', 'disabled');
	    
	    // add the view, get its height and position accordingly. No worries about width and x-position, should always fit on desktop browsers
	    var det = $(this.view('details', allerg));
	    var ref_elem = $('#add_allergy');
		ref_elem.before(det);
		
		// try to align the midline of the link with the midlines of the view's close button
		var desired_offset = link.offset().top + (link.height() / 2) - ref_elem.offset().top;        // link's midline offset relative to ref_elem
		var det_buttons = det.find('.bottom_buttons');
		var det_button = det_buttons.find('input[type="button"]').first();
		var button_offset = det_buttons.position().top + det_button.position().top + (det_button.height() / 1.5);
		var min = 0;
		var max = allergy_table.position().top + $('#allergy_list').outerHeight() - det.outerHeight() - min;
		
		det.css('top', Math.round(Math.min(Math.max(desired_offset - button_offset, min), max)));
		
		// load history
		allerg.loadHistory(this.callback('showHistory'));
	},
	
	showHistory: function() {
	    
	},
	
	
	// ** Add an allergy
	'#add_allergy click': function(button) {
	    if ($('#allergy_form').is('*')) {
	        return;
	    }
	    
	    // adjust buttons
	    $('#allergy_list').css('opacity', 0.5).find('.allergy_details').addClass('disabled');
		button.attr('disabled', 'disabled');
        
	    // add the form to the view, get its height and position accordingly. No worries about width and x-position, should always fit on desktop browsers
	    var form = $(this.view('form'));
		button.before(form);
	},
	
	'form submit': function(form, event) {
	    form.find('input').removeClass('error')
		form.find('input[type="submit"]').attr('disabled', 'disabled');
		var id = form.find('input[name="id"]').val();
		var params = form.serializeArray();
		
		Allergies.Models.Allergy.update(id, params, this.callback('formReturn'));	// "update" will call "create" if no id is given
	},
	
	'.start_editing click': function(link) {
	    if ($('#allergy_form').is('*')) {
	        return;
	    }
	    
	    // adjust buttons
	    var allergy_table = $('#allergy_list');
	    allergy_table.css('opacity', 0.5).css('opacity', 0.5).find('.allergy_details').addClass('disabled');
		link.removeClass('disabled').addClass('active');
		$('#add_allergy').attr('disabled', 'disabled');
	    
	    // add the form to the view, get its height and position accordingly. No worries about width and x-position, should always fit on desktop browsers
	    var form = $(this.view('form'));
	    var ref_elem = $('#add_allergy');
		ref_elem.before(form);
		
		// try to align the midline of the link with the midlines of the form's cancel/submit buttons
		var desired_offset = link.offset().top + (link.height() / 2) - ref_elem.offset().top;        // link's midline offset relative to ref_elem
		var pos_buttons = form.find('.bottom_buttons');
		var pos_button = pos_buttons.find('input[type="button"').first();
		var button_offset = pos_buttons.position().top + pos_button.position().top + (pos_button.height() / 1.5);
		var min = 0;
		var max = allergy_table.position().top + $('#allergy_list').outerHeight() - form.outerHeight() - min;
		
		form.css('right', 80).css('top', Math.round(Math.min(Math.max(desired_offset - button_offset, min), max)));
	},
	
	// handle form returns
	formReturn: function(data, status) {        // this is the success callback, 'status' will always be "success", look in 'data'
		if ('success' == data) {
			this.load();
			return;
		}
		
		// there was an error; parse it
		if (data && data.length > 0) {
		    if (data.match(/problem processing allergy report/i)) {
		        var form = $('#allergy_form');
		        
		        // find all erroneous fields
		        var reg = /column\s+"([^"]+)"/gi;
		        var cols = reg.exec(data);
		        for (var i = 1; i < cols.length; i += 2) {
		            form.find('input[name="' + cols[i] + '"]').addClass('error');
		        }
		    }
		}
		else {
    		alert("There was an error, please try again\n\n-> " + data);
    	}
		$('#allergy_form').find('input[type="submit"]').removeAttr('disabled');
	},
	
	// UI processing
	'#floating_close mouseover': function(elem) {
	    $(elem).attr('src', "jmvc/allergies/resources/close_hover.png");
	},
	'#floating_close mouseout': function(elem) {
	    $(elem).attr('src', "jmvc/allergies/resources/close.png");
	},
	'.cancel_editing click': function(button) {
	    var div = $('#one_allergy').is('*') ? $('#one_allergy') : $('#allergy_form');
	    div.remove();
	    //if (!div.parent()) {
            button.attr('disabled', 'disabled');
            $('#add_allergy').removeAttr('disabled');
            $('#allergy_list').css('opacity', 1).find('.allergy_details').removeClass('disabled');
    	    $('.allergy_details').removeClass('active');
		//}
	},
});