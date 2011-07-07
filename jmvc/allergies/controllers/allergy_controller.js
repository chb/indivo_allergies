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
	    if ($(link).hasClass('disabled')) {
	        return;
	    }
        
	    // find the allergy object
	    var allergy = link.model();
	    if (!allergy) {
	        $(link).text('Error');
	        return;
	    }
	    
	    // add the view, get its height and position accordingly. No worries about width and x-position, should always fit on desktop browsers
	    var det = $(this.view('details', allergy));
	    var ref_elem = $('#add_allergy');
		ref_elem.before(det);
	    
	    // adjust buttons/links and align
	    this.floatingDivWillShow(link);
	    this.alignFloatingDivTo(det, link);
		
		// load history
		allergy.loadHistory(this.callback('showHistory'));
	},
	
	showHistory: function(data, textStatus, xhr) {
	    //alert('History: ' + data);
	},
	
	'#start_editing click': function(elem) {
	    $('#action_panel').show();
	    $(elem).fadeTo(0, 0);            // can't use hide() here as the parent div will collapse otherwise. We need the button in the layout
	},
	'#cancel_editing click': function() {
	    this.hideActionButtons();
	},
	'.action_button click': function(elem) {
	    var but = $(elem);
	    this.actionButtonAction(but, but.model(), but.attr('data'));
	},
	actionButtonAction: function(button, allergy, action) {
	    if (!allergy || !allergy.item) {
	        alert("Error in actionButtonAction(): Received no suitable allergy object!");
	        return;
	    }
	    
	    switch (action) {
	        case 'edit':
	            this.showFormFor(button, allergy);
	            break;
	        case 'archive':
	            break;
	        case 'void':
	            this.askToVoid(allergy);
	            break;
	        default:
	            alert("Unknown actionButtonAction '" + action + '"');
	            break;
	    }
	},
	hideActionButtons: function() {
	    $('#action_panel').fadeOut('fast');
	    $('#start_editing').fadeTo('fast', 1);
	},
	indicateAction: function(text) {
	    $('#action_panel').find('input').attr('disabled', 'disabled');
	    $('#action_area').show();
	    $('#action_text').text(text);
	},
	actionDone: function() {
	    $('#action_panel').find('input').removeAttr('disabled');
	    $('#action_area').hide();
	    $('#action_text').text('');
	},
	
	
	// ** Handling actions
	askToVoid: function(allergy) {
	    var warning = "Reason to void this allergy?";
	    this.askForConfirmation(allergy, warning, true, "Void", this.callback('voidAllergy'));
	},
	voidAllergy: function(allergy, reason) {
	    if (!allergy || !reason) {
	        alert("You must specify a reason when voiding");
    	}
    	else {
    	    this.hideConfirmation();
    	    this.indicateAction('Voiding...');
    	    allergy.setStatus('void', reason, this.callback('didVoidAllergy'));
    	}
	},
	didVoidAllergy: function(data, textStatus) {
	    if ('success' == textStatus) {
	        var details = $(this.view('details', data));
	        $('#one_allergy').html(details.html());
	        this.hideActionButtons();
	    }
	    else {
    	    alert('Failed to void the allergy: ' + data);
    	}
	    this.actionDone();
	},
	
	
	// ** Allergy edit form
	'#add_allergy click': function(button) {
	    if ($('#allergy_form').is('*')) {
	        return;
	    }
	    this.showFormFor();
	},
	
	'form submit': function(form, event) {
	    form.find('input').removeClass('error')
		form.find('input[type="submit"]').attr('disabled', 'disabled');
		var id = form.find('input[name="id"]').val();
		var params = form.serializeArray();
		
		Allergies.Models.Allergy.update(id, params, this.callback('formReturn'));	// "update" will call "create" if no id is given
	},
	
	showFormFor: function(link, allergy) {
	    if ($('#allergy_form').is('*')) {
	        return;
	    }
	    
        var form = $(this.view('form', allergy));
        
	    // details pane is shown, just replace that
	    if ($('#one_allergy').is('*')) {
	        this.formHideWillShowDetails = true;
	        var details = $('#one_allergy');
	        form.css('right', details.css('right'));
	        details.replaceWith(form);
	        link = $('#allergy_list').find('a.active').first();
	    }
	    
	    // show the form
	    else {
	        this.formHideWillShowDetails = false;
	        if (link && link.attr('id') != "add_allergy") {
    	        form.css('right', 80);
    	    }
            $('#add_allergy').before(form);
            
            this.floatingDivWillShow(link);
		}
		
		form.find('input[name="allergen_name"]').focus();
        this.alignFloatingDivTo(form, link);
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
	
	
	// ** Handling the floating div
	floatingDivWillShow: function(from_link) {
	    $('#allergy_list').css('opacity', 0.5).css('opacity', 0.5).find('.allergy_details').addClass('disabled');
	    if (from_link) {
    		from_link.removeClass('disabled').addClass('active');
    	}
		$('#add_allergy').attr('disabled', 'disabled');
	},
	dismissFloatingDiv: function(button) {
	    this.formHideWillShowDetails = false;
	    var div = $('#one_allergy').is('*') ? $('#one_allergy') : $('#allergy_form');
	    div.remove();
	    
	    button.attr('disabled', 'disabled');
        $('#add_allergy').removeAttr('disabled');
        $('#allergy_list').css('opacity', 1).find('.allergy_details').removeClass('disabled').removeClass('active');
	},
	alignFloatingDivTo: function(div, to_link) {
	    var ref_elem = div.parent().find('#add_allergy');
	    
	    // try to align the midline of the link with the midlines of the view's close button
		var desired_offset = to_link ? (to_link.offset().top + (to_link.height() / 2) - ref_elem.offset().top) : 0;        // link's midline offset relative to ref_elem
		var div_buttons = div.find('.bottom_buttons');
		var div_button = div_buttons.find('input[type="submit"]').first();
		var button_offset = div_buttons.position().top + div_button.position().top + (div_button.height() / 1.5);
		var min = 0;
		var max = $('#allergy_list').position().top + $('#allergy_list').outerHeight() - div.outerHeight() - min;
		
		div.css('top', Math.round(Math.min(Math.max(desired_offset - button_offset, min), max)));
	},
	
	'#floating_close mouseover': function(elem) {
	    $(elem).attr('src', "jmvc/allergies/resources/close_hover.png");
	},
	'#floating_close mouseout': function(elem) {
	    $(elem).attr('src', "jmvc/allergies/resources/close.png");
	},
	'.dismiss_floating click': function(button) {
	    if (this.formHideWillShowDetails) {
	        this.formHideWillShowDetails = false;
	        var allergy = button.model();
	        
	        // we don't want to dismiss, we want to go back to the details view
	        if (allergy) {
    	        var details = $(this.view('details', allergy));
    	        var form = $('#allergy_form');
                details.css('right', form.css('right'));
                form.replaceWith(details);
                var link = $('#allergy_list').find('a.active').first();
                this.alignFloatingDivTo(details, link);
                return;
	        }
	    }
	    this.dismissFloatingDiv(button);
	},
	
	
	/*
	 * Confirmation dialogs
	 * 
	 * Used to confirm an action to be applied to an object.
	 * The confirm-callback gets the object as first argument and text entered as second argument
	 * The decline-callback gets no arguments and if omitted, the confirmatino dialog will be hidden
	 **/
	confirmation: {},
	askForConfirmation: function(obj, text, show_input, confirm_text, confirm, decline) {
	    var parent = $('#one_allergy').is('*') ? $('#one_allergy') : ($('#allergy_form').is('*') ? $('#allergy_form') : null);
	    if (parent && confirm && 'function' == typeof(confirm)) {
	        this.confirmation.confirm = confirm;
	        this.confirmation.decline = decline;
	        this.confirmation.object = obj;
	        
	        var dialog = $(this.view('confirm', {'text': text, 'confirm_text': confirm_text }));
	        parent.append(dialog);
	        if (show_input) {
	            $('#confirm_input').show().focus();
	        }
	        var box = $('#confirm_box');
	        var m_top = (dialog.innerHeight() - box.outerHeight()) / 2;
	        box.css('margin-top', m_top + 'px');
	    }
	},
	'#confirm_box input[type="submit"] click': function() {
	    if (this.confirmation.confirm && 'function' == typeof(this.confirmation.confirm)) {
	        this.confirmation.confirm(this.confirmation.object, $('#confirm_input').val());
	    }
	    else {
	        alert("Programming error: No action defined for confirmation!");
	    }
	},
	'#confirm_box input[type="reset"] click': function() {
	    if (this.confirmation.decline && 'function' == typeof(this.confirmation.decline)) {
	        this.confirmation.decline();
	        this.didHideConfirmation();
	    }
	    else {
	        this.hideConfirmation();
	    }
	},
	hideConfirmation: function() {
	    $('#confirm').fadeOut('fast', function() { $(this).remove(); });
	    this.didHideConfirmation();
	},
	didHideConfirmation: function() {
	    this.confirmation = {};
	},
});