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
					'reports':	allergies.reports,
					'summary':	allergies.summary
				}));
			if (callback) {
				callback();
			}
		};
		_show(callback);
	},
	
	// Bind events
	'#add_allergy click': function() {
	    var button = $('#add_allergy');
	    
	    // add form to view
	    var form = $(this.view('form'));
		button.attr('disabled', 'disabled').before(form);
		
		// get its height and position accordingly. No worries about width and x-position, should always fit on desktop browsers
		var desired_offset = form.find('.bottom_buttons').position().top;
		form.css('top', -1 * Math.round(Math.min(desired_offset, button.offset().top - 40)));
	},
	'form submit': function(form, event) {
		form.find('input[type="submit"]').attr('disabled', 'disabled');
		var id = form.find('input[name="id"]').val();
		var params = form.serializeArray();
		
		Allergies.Models.Allergy.update(id, params, this.callback('formReturn'));		// "update" will call "create" if no id is given
	},
	'.cancel_editing click': function() {
    	$('#add_allergy').removeAttr('disabled');
		$('#allergy_form').detach();
	},
	'.update_allergy click': function() {
	    alert("Nah, I don't work just yet");
	},
	
	// Handle form returns
	formReturn: function(data, status) {        // this is the success callback, 'status' will always be "success", look in 'data'
		if ('success' == data) {
			this.load();
			return;
		}
		
		alert(data);
		
		$('#allergy_form').find('input[type="submit"]').removeAttr('disabled');
	},
});