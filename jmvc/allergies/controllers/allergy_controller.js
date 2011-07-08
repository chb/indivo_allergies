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
    statusToGet: [ 'active' ],
    
	ready: function() {
		if (!$("#allergy").is('*')) {
			$(document.body).append($('<div/>').attr('id','allergy'));
		}
		$('#allergy').html(this.view('loading'));
	},
	
	load: function() {
		Allergies.Models.Allergy.findAll({ 'status': this.statusToGet.join('+') }, this.callback('list'));
	},
	
	list: function(allergies) {
		// we can use a callback here if we need strict ordering (e.g. for iframe resize)
		var _this = this;
		//this.updateFilterButtons();
		var callback = function() {
			$('#loading').hide();
		};
		var _show = function(callback) {
			$('#allergy').html(_this.view('init',
				{
					'reports':	allergies,
					'summary':	allergies.summary
				}));
			_this.updateFilterButtons(_this.statusToGet);
			if (callback) {
				callback();
			}
		};
		_show(callback);
	},
	
	
	/**
	 * document filter
	 */
	'#filter_buttons input click': function(button) {
	    var stat = button.val();
	    
	    // activate status
	    if (button.get(0).checked) {
	        this.statusToGet.push(stat);
	    }
	    
	    // disable status
	    else {
	        if (this.statusToGet.length <= 1) {
	            button.attr('checked', true);
	            return;
	        }
	        for (var i = 0; i < this.statusToGet.length; i++) {
	            if (this.statusToGet[i] == stat) {
	                this.statusToGet.splice(i, 1);
	                break;
	            }
	        }
	    }
	    
	    // fire off
	    button.replaceWith('<img src="jmvc/allergies/resources/spinner-small.gif" alt="" />');
	    this.statusToGet = _.uniq(this.statusToGet);
	    this.load();
	},
	updateFilterButtons: function(enabled) {
	    if ('object' != typeof(enabled)) {
	        return;
	    }
	    $('#filter_buttons').find('input[type="checkbox"]').each(function(i, elem) {
	                                                                    elem.checked = (enabled.indexOf($(elem).val()) >= 0);
	                                                                });
	},
	
	
	/**
	 * Show details
	 */
	'.one_allergy click': function(div) {
        this.showDetailsFor(div);
	},
	showDetailsFor: function(div) {
	    if (div.find('div.one_allergy_editing').length > 0) {
	        return;
	    }
	    
	    // find the allergy object
	    var allergy = div.model();
	    if (!allergy) {
	        div.find('h2').first().text('Error');
	        return;
	    }
	    
	    // insert detail view
	    div.addClass('one_allergy_active');
	    var details = $(this.view('details', allergy));
	    div.find('div.one_allergy_inner').hide();
	    div.append($('<div/>', { className: 'one_allergy_inner one_allergy_editing' }).html(details));
	    
		// load history
		allergy.loadHistory(this.callback('didLoadHistory', div));
	},
	'.one_allergy .close_button click': function(close, event) {
	    event.stopPropagation();
	    this.hideDetails(close.parent().parent());
	},
	hideDetails: function(div) {
	    div.removeClass('one_allergy_active');
	    div.find('div.one_allergy_editing').remove();
	    div.find('div.one_allergy_inner').show();
	},
	
	didLoadHistory: function(div, data, textStatus, xhr) {
	    if ('success' == textStatus) {
	        if (data.length > 0) {
	            var parent = div.find('div.history');
	            //var hist_row = this.view('history');
	            for (var i = 0; i < data.length; i++) {
	                //parent.append(hist_row.render(data[i]));      // is something like this possible with JMVC?
                    parent.append(this.view('history', data[i]));
	            }
	        }
	    }
	    div.find('div.history_spinner').hide();
	},
	
	
	/**
	 * Actions
	 */
	'.action_button click': function(elem) {
	    this.actionButtonAction(elem, elem.model(), elem.attr('data'));
	},
	actionButtonAction: function(button, allergy, action) {
	    if (!allergy || !allergy.item) {
	        alert("Error in actionButtonAction(): Received no suitable allergy object!");
	        return;
	    }
	    
	    switch (action) {
	        case 'edit':
	            this.showFormFor(this.allergyParentFor(button), allergy);
	            break;
	        case 'archive':
	            break;
	        case 'void':
	            this.askToVoid(button, allergy);
	            break;
	        default:
	            alert("Unknown actionButtonAction '" + action + '"');
	            break;
	    }
	},
	
	
	/**
	 * Voiding
	 */
	askToVoid: function(sender, allergy) {
	    var warning = ('void' == allergy.meta.status) ? "Reason for unvoiding this allergy?" : "Reason to void this allergy?";
	    var button_title = ('void' == allergy.meta.status) ? "Unvoid" : "Void";
	    var div = this.allergyParentFor(sender);
	    this.askForConfirmation(div, allergy, warning, true, button_title, this.callback('voidAllergy'));
	},
	voidAllergy: function(sender, allergy, reason) {
	   if (!allergy || !reason) {
	        alert("You must specify a reason when voiding");
    	}
    	else {
    	    this.indicateActionOn(sender);
    	    var void_status = ('void' == allergy.meta.status) ? 'active' : 'void';
            allergy.setStatus(void_status, reason, this.callback('didVoidAllergy', sender));
    	}
	},
	didVoidAllergy: function(sender, data, textStatus) {
	    if ('success' == textStatus) {
	        var parent = this.allergyParentFor(sender);
	        this.update(parent, data);
	    }
	    else {
    	    alert('Failed to void the allergy: ' + data);
    	    this.actionIsDone(sender);
    	}
	},
	
	
	/**
	 * Allergy edit form
	 */
	'#add_allergy click': function(button) {
	    this.showFormFor(button);
	},
	
	'form submit': function(form, event) {
	    form.find('input').removeClass('error')
		form.find('input[type="submit"]').attr('disabled', 'disabled');
		var id = form.find('input[name="id"]').val();
		var params = form.serializeArray();
		
		Allergies.Models.Allergy.update(id, params, this.callback('formReturn'));	// "update" will call "create" if no id is given
	},
	
	showFormFor: function(button, allergy) {
	    if ($('#form_container').is('*')) {
	        return;
	    }
	    
	    // show the form
	    this.floatingDivWillShow();
        var form = $(this.view('form', allergy));
        $('#allergy').append($('<div/>', { id: 'form_container' }).append(form));
        this.alignFloatingDivTo(form, button);
        
		form.find('input[name="allergen_name"]').focus();
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
		$('#add_allergy').attr('disabled', 'disabled');
		$('#filter_buttons').find('input[type="checkbox"]').attr('disabled', 'disabled');
	},
	dismissFloatingDiv: function(button) {
	    $('#form_container').fadeOut('fast', function() { $('#form_container').remove(); });
	    
	    button.attr('disabled', 'disabled');
        $('#add_allergy').removeAttr('disabled');
        $('#filter_buttons').find('input[type="checkbox"]').removeAttr('disabled');
	},
	alignFloatingDivTo: function(div, to_elem) {
	    if (!div) {
            return;
        }
	    
	    // try to align the top
		var desired_offset = to_elem ? to_elem.offset().top - 20 : 0;
		var min = 28;
		var max = div.parent().outerHeight() - div.outerHeight() - min;
		
		div.css('margin-top', Math.round(Math.max(Math.min(desired_offset, max), min)));
	},
	
	'.close_button mouseover': function(elem) {
	    $(elem).attr('src', "jmvc/allergies/resources/close_hover.png");
	},
	'.close_button mouseout': function(elem) {
	    $(elem).attr('src', "jmvc/allergies/resources/close.png");
	},
	'.dismiss_floating click': function(sender) {
	    this.dismissFloatingDiv(sender);
	},
	
	
	/*
	 * Confirmation dialogs
	 * 
	 * Used to confirm an action to be applied to an object.
	 * The confirm-callback gets the object as first argument and text entered as second argument
	 * The decline-callback gets no arguments and if omitted, the confirmatino dialog will be hidden
	 **/
	askForConfirmation: function(parent, obj, text, show_input, confirm_text, confirm_action) {
	    if (parent && confirm_action && 'function' == typeof(confirm_action)) {
	        var dialog = $(this.view('confirm', {'text': text, 'confirm_text': confirm_text }));
	        parent.append(dialog);
	        if (show_input) {
	            parent.find('.confirm_input').show().first().focus();
	        }
	        
	        // align
	        var box = parent.find('div.confirm_box');
	        var m_top = (dialog.innerHeight() - box.outerHeight()) / 2;
	        box.css('margin-top', m_top + 'px');
	        
	        // bind confirm action
	        self = this;
	        dialog.find('input[type="submit"]').click(function() {
	            var sender = $(this);
	            var model = self.allergyParentFor($(this)).model();
	            var input = sender.parent().parent().find('.confirm_input').val();
	            confirm_action(sender, model, input);
	        });
	    }
	    else if (!parent) {
	        alert("Programming error: No parent element given");
	    }
	    else {
	        alert("Programming error: No confirmation action given");
	    }
	},
	indicateActionOn: function(sender) {
	    sender.parent().parent().find('input').attr('disabled', 'disabled');
	    sender.hide().before('<img class="action_spinner" src="jmvc/allergies/resources/spinner-small.gif" alt="" />');
	},
	actionIsDone: function(button) {
	    button.parent().parent().find('input').removeAttr('disabled');
	    button.show().parent().find('.action_spinner').remove();
	},
	'.confirm_box input[type="reset"] click': function(sender, event) {
	    event.stopPropagation();
	    this.hideConfirmation(sender);
	},
	hideConfirmation: function(sender) {
	    var parent = this.allergyParentFor(sender);
	    parent.find('.confirm').fadeOut('fast', function() { $(this).remove(); });
	},
	
	
	/**
	 * Utilities
	 */
	allergyParentFor: function(elem) {
	    if (!elem) {
	        return null;
	    }
	    return elem.parentsUntil('div.one_allergy').last().parent();
	},
	
	update: function(parent, allergy) {
	    var view = $(this.view('list', allergy));
	    parent.replaceWith(view);
	}
});