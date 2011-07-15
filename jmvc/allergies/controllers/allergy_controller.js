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
	showingStatus: [ 'active' ],
	
	ready: function() {
		if (!$("#allergy").is('*')) {
			$(document.body).append($('<div/>').attr('id','allergy'));
		}
		$('#allergy').html(this.view('loading'));
	},
	load: function() {
		this.getList(this.showingStatus);
	},
	
	getList: function(get_status) {
	    Allergies.Models.Allergy.findAll({ 'status': (get_status ? get_status.join('+') : 'active') }, this.callback('list'));
	},
	list: function(allergies) {
	    if ('success' == allergies.status) {
            
            // we can use a callback here if we need strict ordering (e.g. for iframe resize)
            var self = this;
            var callback = function() {
                $('#loading').hide();
            };
            var _show = function(callback) {
                $('#allergy').html(self.view('init',
                    {
                        'reports':	allergies,
                        'summary':	allergies.summary
                    }));
                if (allergies.summary) {
                    self.updateFilterButtons(allergies.summary.showing_status);
                }
                if (callback) {
                    callback();
                }
            };
            _show(callback);
        }
        else {
            alert("Error getting allergies:\n\n" + allergies.data);
            if (allergies.summary) {
                this.updateFilterButtons(allergies.summary.showing_status);
            }
        }
	},
	
	
	/**
	 * document filter
	 */
	'#filter_buttons input click': function(button) {
		var stat = button.val();
		var checked = button.get(0).checked;
		var get_status = this.showingStatus.slice(0);       // we want a copy
		
		// activate status
		if (checked) {
			get_status.push(stat);
		}
		
		// disable status
		else {
			if (get_status.length <= 1) {
				button.attr('checked', true);
				return;
			}
			for (var i = 0; i < get_status.length; i++) {
				if (get_status[i] == stat) {
					get_status.splice(i, 1);
					break;
				}
			}
		}
		
		// fire off
		button.hide().before('<img src="jmvc/allergies/resources/spinner-small.gif" alt="" />');
		this.getList(get_status);
	},
	updateFilterButtons: function(showing) {
	    if (showing && showing.length > 0) {
	        this.showingStatus = showing;
	    }
		var enableds = this.showingStatus;
		var area = $('#filter_buttons');
		area.find('img').remove();
		area.find('input[type="checkbox"]').each(function(i, elem) {
                                                        elem.checked = (enableds.indexOf($(elem).val()) >= 0);
                                                        $(elem).show();
                                                    });
	},
	
	
	/**
	 * Show details/history
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
			div.find('h2').first().text('ERROR');
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
		if ('success' == textStatus && 'success' == data.status) {
			if (data.data.length > 0) {
				var parent = div.find('div.history');
				parent.removeClass('red');
				for (var i = 0; i < data.data.length; i++) {
					parent.append(this.view('history', data.data[i]));
				}
			}
		}
		else {
		    div.find('div.history').addClass('red').html('Failed to load history:<br />' + data.data);
		}
		div.find('div.history_spinner').hide();
	},
	
	'.history_meta click': function(div) {
		var type = div.attr('data-type');		// div.data('type') in later jQuery versions
		if ('meta' == type) {
			var id = div.attr('data-id');
			if (id) {
				if ($('#one_hist_' + id).is('*')) {
					$('#one_hist_' + id).remove();
					div.removeClass('active_history');
				}
				else {
					var img = div.find('img.history_type').first();
					img.attr('data-src', img.attr('src')).attr('src', 'jmvc/allergies/resources/spinner-small.gif');
					Allergies.Models.Allergy.findOne({ id: id }, this.callback('didLoadOneHistory', div, id));
				}
			}
		}
	},
	didLoadOneHistory: function(div, id, allergy) {
		if ('success' == allergy.status) {
			var node_id = 'one_hist_' + id;
			if ($('#' + node_id).is('*')) {
				$('#' + node_id).remove();
				div.removeClass('active_history');
			}
			else {
				div.addClass('active_history');
				var img = div.find('img.history_type').first();
				img.attr('src', img.attr('data-src'));
				
				// load data
				var parent = this.allergyParentFor(div);
				var latest = parent.model().meta.latest;
				var data = { meta: { status: 'replaced', latest: latest }, item: allergy };
				var hist = $($(this.view('list', data)).html()).attr('id', node_id);
				div.after(hist);
				
				// add a restore button
				var replace = $('<input/>', { type: 'button', className: 'small' }).val('Restore').click(this.callback('restoreFrom', data));
				hist.find('.status_replaced').first().append(replace);
			}
		}
		else {
		    alert("Error fetching history item:\n\n" + allergy.data);
		    var img = div.find('img.history_type').first();
			img.attr('src', img.attr('data-src'));
		}
	},
	
	// restoring is submitting item data of a history item as a new replacement document
	restoreFrom: function(allergy, ev) {
	    if (confirm("Are you sure you wish to restore this version?")) {
            if (allergy) {
                var button = $(ev.currentTarget);
                button.hide().before('<img src="jmvc/allergies/resources/spinner-small-ondark.gif" alt="Restoring..." />');
                
                // create the post values and submit as new document
                var data = {
                    date_onset:		allergy.item.dateDiagnosed,
                    allergen_type:	allergy.item.type,
                    allergen_name:	allergy.item.name,
                    reaction:		allergy.item.reaction,
                    specifics:		allergy.item.specifics,
                    diagnosed_by:	allergy.item.diagnosedBy
                }
                Allergies.Models.Allergy.update(allergy.meta.latest, data, this.callback('didRestoreFrom', button));
            }
            else {
                alert("restoreFrom()\n\nProgramming-Error: The allergy item could not be accessed");
            }
		}
	},
	didRestoreFrom: function(sender, data, status) {
        var div = this.allergyParentFor(sender);
        if ('success' == status && 'success' == data.status) {
            var allergy = new Allergies.Models.Allergy(data.data);
            this.update(div, allergy);
        }
        else {
            alert("Failed to restore:\n\n" + data.data);
            sender.parent().find('img').remove();
            sender.show();
        }
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
				var new_status = ('archived' == allergy.meta.status) ? 'active' : 'archived';
				var warning = ('archived' == new_status) ? "Reason for archiving this allergy?" : "Reason for re-activating this allergy?";
				var button_title = ('archived' == new_status) ? "Archive" : "Unarchive";
				var div = this.allergyParentFor(button);
				this.askForConfirmation(div, allergy, warning, true, button_title, this.callback('setStatus', new_status));
				break;
				
			case 'void':
				var new_status = ('void' == allergy.meta.status) ? 'active' : 'void';
				var warning = ('void' == new_status) ? "Reason for voiding this allergy?" : "Reason for unvoiding this allergy?";
				var button_title = ('void' == new_status) ? "Void" : "Unvoid";
				var div = this.allergyParentFor(button);
				this.askForConfirmation(div, allergy, warning, true, button_title, this.callback('setStatus', new_status));
				break;
			default:
				alert("Unknown actionButtonAction '" + action + '"');
				break;
		}
	},
	
	
	/**
	 * Changing status
	 */
	setStatus: function(new_status, sender, allergy, reason) { 
		if (!allergy || !reason) {
			alert("You must specify a reason when changing the status");
		}
		else {
			this.indicateActionOn(sender);
			allergy.setStatus(new_status, reason, this.callback('didSetStatus', sender, new_status));
		}
	},
	didSetStatus: function(sender, new_status, data, textStatus) {
		if ('success' == textStatus && 'success' == data.status) {
			var parent = this.allergyParentFor(sender);
			var allergy = new Allergies.Models.Allergy(data.data);
			this.update(parent, data.data);
		}
		else {
			alert("Failed to " + new_status + " allergy:\n\n" + data.data);
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
		form.find('input').removeClass('error');
		form.find('div.error').remove();
		form.find('input[type="submit"]').attr('disabled', 'disabled');
		var id = form.find('input[name="id"]').val();
		var params = form.serializeArray();
		
		Allergies.Models.Allergy.update(id, params, this.callback('formReturn', form));	    // "update" will call "create" if no id is given
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
	formReturn: function(form, data, status) {        // status will always be 'success', look in the data object
		if (200 == data.status) {
			this.getList(this.showingStatus);
			return;
		}
		
		// there was an error; parse it
		if (data && data.data) {
			if (data.data.match(/problem processing allergy report/i)) {
				
				// find all erroneous fields
				var reg = /column\s+"([^"]+)"/gi;
				var cols = reg.exec(data.data);
				for (var i = 1; i < cols.length; i += 2) {
					form.find('input[name="' + cols[i] + '"]').addClass('error');
				}
			}
			else {
			    form.find('div.bottom_buttons').after($('<div/>', { className: 'error' }).html(data.data));
			}
		}
		else {
			alert("There was a " + data.status + " error, please try again");
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
	    if (!allergy.meta || !allergy.meta.status) {
	        alert("update()\n\nThe supplied allergy object is incomplete (no meta)");
	        return;
	    }
		var view = $(this.view('list', allergy));
		parent.replaceWith(view);
	}
});