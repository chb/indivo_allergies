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
		Allergies.Models.Allergy.findAll({ 'status': this.statusToGet.join('|') }, this.callback('list'));
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
		allergy.loadHistory(this.callback('showHistory'));
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
	
	showHistory: function(data, textStatus, xhr) {
	    //alert('History: ' + data);
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
	            this.showFormFor(button, allergy);
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
	    var warning = "Reason to void this allergy?";
	    var div = this.allergyParentFor(sender);
	    this.askForConfirmation(div, allergy, warning, true, "Void", this.callback('voidAllergy'));
	},
	voidAllergy: function(sender, allergy, reason) {
	   if (!allergy || !reason) {
	        alert("You must specify a reason when voiding");
    	}
    	else {
    	    this.indicateActionOn(sender);
            allergy.setStatus('void', reason, this.callback('didVoidAllergy', sender));
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
	    if (from_link) {
    		from_link.removeClass('disabled').addClass('active');
    	}
		$('#add_allergy').attr('disabled', 'disabled');
		$('#filter_buttons').find('input[type="checkbox"]').attr('disabled', 'disabled');
	},
	dismissFloatingDiv: function(button) {
	    this.formHideWillShowDetails = false;
	    var div = $('#one_allergy').is('*') ? $('#one_allergy') : $('#allergy_form');
	    div.remove();
	    
	    button.attr('disabled', 'disabled');
        $('#add_allergy').removeAttr('disabled');
        $('#filter_buttons').find('input[type="checkbox"]').removeAttr('disabled');
	},
	alignFloatingDivTo: function(div, to_link) {
	    var ref_elem = div.parent().find('#add_allergy');
	    
	    // try to align the midline of the link with the midlines of the view's close button
		var desired_offset = to_link ? (to_link.offset().top + (to_link.height() / 2) - ref_elem.offset().top) : 0;        // link's midline offset relative to ref_elem
		var div_buttons = div.find('.bottom_buttons');
		var div_button = div_buttons.find('input[type="submit"]').first();
		var button_offset = div_buttons.position().top + div_button.position().top + (div_button.height() / 1.5);
		var min = 0;
		var max = Math.max($('#allergy_list').position().top + $('#allergy_list').outerHeight() - div.outerHeight() - min, min);
		
		div.css('top', Math.round(Math.min(Math.max(desired_offset - button_offset, min), max)));
	},
	
	'.close_button mouseover': function(elem) {
	    $(elem).attr('src', "jmvc/allergies/resources/close_hover.png");
	},
	'.close_button mouseout': function(elem) {
	    $(elem).attr('src', "jmvc/allergies/resources/close.png");
	},
	'.dismiss_floating click': function(sender) {
	    if (this.formHideWillShowDetails) {
	        this.formHideWillShowDetails = false;
	        var allergy = sender.model();
	        
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
	    return elem.parentsUntil('div.one_allergy').last().parent();
	},
	
	update: function(parent, allergy) {
	    var view = $(this.view('list', allergy));
	    parent.replaceWith(view);
	}
});