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
  ready: function(){
    if(!$("#allergy").length) $(document.body).append($('<div/>').attr('id','allergy'))
    $('#allergy').html(this.view('loading'));
  },

  load: function(){
    Allergies.Models.Allergy.findAll({}, this.callback('list'));
  },

  list: function(allergies){
    // we can use a callback here if we need strict ordering (e.g. for iframe resize)
    var _this = this;
    var callback = function() {
      $('#loading').hide();
    };
    var _show = function(callback) {
      $('#allergy').html(_this.view('init',
        {'reports':allergies.reports,
         'summary':allergies.summary
        }));
      if(callback) { callback() }
    };
    _show(callback);
  }
});