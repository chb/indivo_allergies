/**
 * @tag models, home
 * Wraps backend data services. No CUD for now
 */
$.Model.extend('Allergies.Models.Allergy',
/* @Static */
{
  /**
   * Retrieves data from your backend services. Sorts by dateMeasured desc by default. Can't use
   * parameters to the api call to do this if using test data since all data have the same created_at in the db
   */
  findAll : function(params, success, error){
    $.ajax({
      url: '/apps/allergies/allergies',
      type: 'get',
      dataType: 'json',
      data: params,
      success: this.callback(function(data, textStatus, xhr){
        // sort data by <Report><Item><dateMeasured>
        // data.reports = _(data.reports).sortBy(function(r){ return(r.item.date_measured); }).reverse();
        success(data);
      }),
      error: error
    })
  }
},
/* @Prototype */
{})