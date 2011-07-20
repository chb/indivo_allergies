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
	displayType: 'dense',
	lastLoadedAllergies: [],
	
	ready: function() {
		if (!$("#allergy").is('*')) {
			$(document.body).append($('<div/>').attr('id','allergy'));
		}
		$('#allergy').html(this.view('init'));
	},
	load: function() {
		this.getList(this.showingStatus);
	},
	
	getList: function(get_status, display_type) {
		Allergies.Models.Allergy.findAll({ 'status': (get_status ? get_status.join('+') : 'active') }, this.callback('list', display_type));
	},
	list: function(display_type, allergies) {
		if ('success' == allergies.status) {
			
			// we can use a callback here if we need strict ordering (e.g. for iframe resize)
			var self = this;
			var callback = function() {
				$('#loading').hide();
			}
			var _show = function(callback) {
				if (display_type) {
					self.displayType = display_type;
				}
				else {
					display_type = self.displayType;
				}
				self.lastLoadedAllergies = allergies;
				$('#allergy_list').replaceWith(self.view(display_type,
					{
						'reports': allergies,
					//	'summary': allergies.summary
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
	 * document filter and view options
	 */
	'#display_switch a click': function(a) {
		a.parent().children().removeClass('active');
		a.addClass('active');
		
		if (!this.lastLoadedAllergies || this.lastLoadedAllergies.length < 1) {
			$('#loading').show();
			this.getList(this.showingStatus, a.attr('data'));
		}
		else {
			$('#allergy_list').replaceWith(this.view(a.attr('data'), { reports: this.lastLoadedAllergies }));
		}
	},
	
	'#filter_buttons input click': function(button) {
		var stat = button.val();
		var checked = button.get(0).checked;
		var get_status = this.showingStatus.slice(0);		// we want a copy
		
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
		div.append($('<div/>').addClass('one_allergy_inner one_allergy_editing').html(details));
		
		// load history
		allergy.loadHistory(this.callback('didLoadHistory', div));
	},
	'.one_allergy .hide_details click': function(close, event) {
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
				
				// update num related documents
				div.find('.show_notes').first().text('0 Reports');
 				div.find('.show_labs').first().text(data.num_related + ((1 == data.num_related) ? ' Lab' : ' Labs'));
				
				// append history
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
				var hist = $($(this.view('item', data)).html()).attr('id', node_id);
				div.after(hist);
				
				// add a restore button
				var replace = $('<input/>', { type: 'button' }).addClass('small').val('Restore').click(this.callback('restoreFrom', data));
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
					date_onset:				allergy.item.dateDiagnosed,
					allergen_type:			allergy.item.type,
					allergen_name:			allergy.item.name,
					allergen_name_type:		allergy.item.name_type,
					allergen_name_value:	allergy.item.name_value,
					reaction:				allergy.item.reaction,
					specifics:				allergy.item.specifics,
					diagnosed_by:			allergy.item.diagnosedBy
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
			case 'add_lab':
				this.showLabFormFor(this.allergyParentFor(button), allergy);
				break;
				
			case 'add_note':
				this.showClinNoteFormFor(this.allergyParentFor(button), allergy);
				break;
				
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
	setStatus: function(new_status, sender, allergy, input) { 
		if (!allergy || !input.val()) {
			if (input.is('*')) {
				input.addClass('error');
			}
			else {
				alert("You must specify a reason when changing the status");
			}
		}
		else {
			input.removeClass('error');
			this.indicateActionOn(sender);
			allergy.setStatus(new_status, input.val(), this.callback('didSetStatus', sender, new_status));
		}
	},
	didSetStatus: function(sender, new_status, allergy, textStatus) {
		if ('success' == textStatus && 'success' == allergy.status) {
			var parent = this.allergyParentFor(sender);
			this.update(parent, allergy);
		}
		else {
			alert("Failed to " + new_status + " allergy:\n\n" + allergy);
			this.actionIsDone(sender);
		}
	},
	
	
	/**
	 * Allergy edit form
	 */
	'#add_allergy click': function(button) {
		this.showFormFor(button);
	},
	
	showFormFor: function(button, allergy) {
		if ($('#float_container').is('*')) {
			return;
		}
		
		// show the form
		this.floatingDivWillShow();
		var form = $(this.view('form', allergy));
		$('#allergy').append($('<div/>', { id: 'float_container' }).append(form));
		this.alignFloatingDivTo(form, button);
		
		// setup fields
		form.find('input[name="allergen_name"]').autocomplete({
			source: 'codelookup',
			minLength: 2,
			appendTo: '#allergy_form',
			select: function(event, ui) {
				var form = $('#allergy_form');
				form.find('input[name="allergen_name"]').val(ui.item.physician_value);
				form.find('input[name="allergen_name_value"]').val(ui.item.code);
			}
		}).data('autocomplete')._renderItem = function(list, item) {
			return $('<li/>').data('item.autocomplete', item).append('<a>' + item.physician_value + '</a>').appendTo(list);
		};
		form.find('input[name="allergen_name"]').focus();
		form.find('input[name="date_diagnosed"]').datepicker({dateFormat: 'yy-mm-dd' });
	},
	
	'#allergy_form submit': function(form, event) {
		form.find('input').removeClass('error');
		form.find('div.error').remove();
		form.find('button[type="submit"]').attr('disabled', 'disabled');
		var id = form.find('input[name="id"]').val();
		var params = form.serializeArray();
		
		Allergies.Models.Allergy.update(id, params, this.callback('formReturn', form));		// "update" will call "create" if no id is given
	},
    
	formReturn: function(form, data, status) {		  // status will always be 'success', look in the data object
		if (data && data.status && 'success' == data.status) {
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
				form.find('div.bottom_buttons').after($('<div/>').addClass('error').html(data.data));
			}
		}
		else {
			alert("There was a " + data.status + " error, please try again");
		}
		$('#allergy_form').find('button[type="submit"]').removeAttr('disabled');
	},
	
	
	/**
	 * Lab form
	 */
	showLabFormFor: function(button, allergy) {
		if ($('#float_container').is('*')) {
			return;
		}
		
		// show the form
		this.floatingDivWillShow();
		var main = $(this.view('lab_form', allergy));
		$('#allergy').append($('<div/>', { id: 'float_container' }).append(main));
		this.alignFloatingDivTo(main, button);
		
		// setup fileupload
		$('#lab_form_upload').fileupload({
			url: 'allergies/' + allergy.meta.id + '/add_lab',
			singleFileUploads: true,
			dragover: function(event) {
				$('.file_drop_indicator').addClass('dragged_over');
			},
			drop: function(event) {
				$('.file_drop_indicator').removeClass('dragged_over');
			},
			add: function(event, data) {
				var clear = $('#file_list').first().children().last();
				$.each(data.files, function(index, file) {
					var rm = $('<span/>').text('×').click(function(e) { $(this).parent().fadeOut(function() { $(this).remove(); }); });
					var div = $('<div/>').addClass('file_box').data('file', data).text(file.name).append(rm);
					clear.before(div);
				});
				$('#lab_form_upload').find('button:submit').removeAttr('disabled');
			}
		});
	},
	
	'#lab_form_upload submit': function(form, event) {
		form.find('input').removeClass('error');
		form.find('div.error').remove();
		
		var allergy = form.model();
		if (allergy) {
			form.find('button[type="submit"]').attr('disabled', 'disabled');
			
			// collect files
			var d = null;
			var files = $('#file_list').children('.file_box').css('border-color', 'green');
			for (var i = 0; i < files.length; i++) {
				var data = $(files[i]).data('file');
				if (!d) {
					d = data;
				}
				else if (data && data.files && data.files.length > 0) {
					for (var j = 0; j < data.files.length; j++) {
						d.files.push(data.files[j]);
					}
				}
			}
			
			// submit
			if (d.files.length > 0) {
				d.submit().always(function(e, textStatus) {
					alert("Upload finished with " + textStatus);
				});
			}
			else {
				alert("There are no files to upload");
			}
		}
		else {
			alert("Error: The allergy model was not found, cannot continue");
		}
	},
	
	'#lab_form_relate submit': function(form, event) {
		form.find('input').removeClass('error');
		form.find('div.error').remove();
		
		var allergy = form.model();
		if (allergy) {
			form.find('button[type="submit"]').attr('disabled', 'disabled');
			//var id = form.find('input[name="id"]').val();			// only needed when we offer to edit clinical notes
			var params = form.serializeArray();
			
			allergy.relateLab(params, this.callback('labFormReturn', form));
		}
		else {
			alert("Error: The allergy model was not found, cannot continue");
		}
	},
	
	labFormReturn: function(form, data, status) {
		if (data && data.status && 'success' == data.status) {
			//form.die('dragenter dragover dragleave dragexit dragend');
			this.dismissFloatingDiv();
			alert("SUCCESS!\n\nTODO: Reload display");
			return;
		}
		
		// there was an error
		if (data && data.data) {
			alert("There was a " + data.status + " error, please try again");
		}
		$('#lab_form').find('button[type="submit"]').removeAttr('disabled');
	},
	
	
	/**
	 * Clinical note form
	 */
	showClinNoteFormFor: function(button, allergy) {
		if ($('#float_container').is('*')) {
			return;
		}
		
		// show the form
		this.floatingDivWillShow();
		var form = $(this.view('clin_note_form', allergy));
		$('#allergy').append($('<div/>', { id: 'float_container' }).append(form));
		this.alignFloatingDivTo(form, button);
		
		// setup fields
		/*form.find('input[name="allergen_name"]').autocomplete({
			source: 'codelookup',
			minLength: 2,
			appendTo: '#clin_note_form',
			select: function(event, ui) {
				var form = $('#clin_note_form');
				form.find('input[name="allergen_name"]').val(ui.item.physician_value);
				form.find('input[name="allergen_name_value"]').val(ui.item.code);
			}
		}).data('autocomplete')._renderItem = function(list, item) {
			return $('<li/>').data('item.autocomplete', item).append('<a>' + item.physician_value + '</a>').appendTo(list);
		};	//	*/
		form.find('input[name="chief_complaint"]').focus();
		
		var now = new Date();
		var month = ('0' + (now.getMonth() + 1)).substr(-2);
		form.find('input[name="date_visit"]').val(now.getFullYear() + '-' + month + '-' + now.getDate());
		form.find('input.date').datepicker({dateFormat: 'yy-mm-dd' });
	},
	
	'#clin_note_form submit': function(form, event) {
		form.find('input').removeClass('error');
		form.find('div.error').remove();
		
		var allergy = form.model();
		if (allergy) {
			form.find('button[type="submit"]').attr('disabled', 'disabled');
			//var id = form.find('input[name="id"]').val();			// only needed when we offer to edit clinical notes
			var params = form.serializeArray();
			
			allergy.addNote(params, this.callback('clinNoteFormReturn', form));
		}
		else {
			alert("Error: The allergy model was not found, cannot continue");
		}
	},
	
	clinNoteFormReturn: function(form, data, status) {
		if (data && data.status && 'success' == data.status) {
			this.dismissFloatingDiv();
			alert('Success! --> TODO: Now reload the allergy div');
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
				form.find('div.bottom_buttons').after($('<div/>').addClass('error').html(data.data));
			}
		}
		else {
			alert("There was a " + data.status + " error, please try again");
		}
		$('#clin_note_form').find('button[type="submit"]').removeAttr('disabled');
	},
	
	
	/**
	 * Handling the floating div
	 */
	floatingDivWillShow: function(from_link) {
		$('#add_allergy').attr('disabled', 'disabled');
		$('#filter_buttons').find('input[type="checkbox"]').attr('disabled', 'disabled');
	},
	dismissFloatingDiv: function(button) {
		$('#float_container').fadeOut('fast', function() { $('#float_container').remove(); });
		
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
	askForConfirmation: function(allergy_parent, obj, text, show_input, confirm_text, confirm_action) {
		if (allergy_parent && confirm_action && 'function' == typeof(confirm_action)) {
			var dialog = $(this.view('confirm', {'text': text, 'confirm_text': confirm_text }));
			allergy_parent.append(dialog);
			if (show_input) {
				allergy_parent.find('.confirm_input').show().first().focus();
			}
			
			// align with buttons
			var box = allergy_parent.find('div.confirm_box');
			var buttons = allergy_parent.find('.bottom_buttons');
			var center = (dialog.innerHeight() - box.outerHeight()) / 2;
			var m_top = Math.max(buttons.position().top - 60, 25);			// TODO: Calculate offset dynamically to align with buttons
			box.css('margin-top', Math.min(center, m_top) + 'px');
			
			// bind confirm action
			self = this;
			dialog.find('button[type="submit"]').click(function() {
				var sender = $(this);
				var model = allergy_parent.model();
				var input = sender.parent().parent().find('input.confirm_input');
				confirm_action(sender, model, input);
			});
		}
		else if (!allergy_parent) {
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
	'.confirm_box button[type="reset"] click': function(sender, event) {
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
		var view = $(this.view('item', allergy));
		parent.replaceWith(view);
	}
});