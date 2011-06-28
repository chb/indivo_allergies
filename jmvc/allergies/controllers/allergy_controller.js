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
		$('#allergy').html(this.view('form'));
	},
	'form submit': function(form, event) {
	    form.find('input[type="submit"]').attr('disabled', 'disabled');
	    var id = form.find('input[name="id"]').val();
	    var params = form.serializeArray();
	    
	    Allergies.Models.Allergy.update(id, params, this.callback('formReturn'));       // "update" will call "create" if no id is given
	},
	'.cancel_editing click': function() {
		this.load();
	},
	
	// Handle form returns
	formReturn: function(ret, textStatus) {
	    //alert(textStatus + "\n" + ret);
	    if ('success' == textStatus) {
	        this.load();
	    }
	    $('#allergy_form').find('input[type="submit"]').removeAttr('disabled');
	},
});