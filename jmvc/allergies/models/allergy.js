/**
 * @tag models, home
 * Wraps backend data services. No UD for now
 */
$.Model.extend('Allergies.Models.Allergy',
/* @Static */
{
    /**
     * Retrieves data from your backend services. Sorts by dateMeasured desc by default. Can't use
     * parameters to the api call to do this if using test data since all data have the same created_at in the db
     */
    findAll: function(params, success, error) {
        var self = this;
        $.ajax({
            url: '/apps/allergies/allergies',
            type: 'get',
            dataType: 'json',
            data: params,
            success: this.callback(function(data, textStatus, xhr) {
                success(self.wrapMany(data));               // wrapMany is deprecated!
            }),
            error: error
        });
    },
    
    findOne : function(params, success, error){
        var self = this,
        id = params.id;
        delete params.id;
        $.ajax({
            url: '/apps/allergies/allergies/' + id,
            type: 'get',
            dataType: 'json',
            data: params,
            success: this.callback(function(data, textStatus, xhr) {
                success(self.wrap(data.data));               // wrap is deprecated!
            }),
            error: error
        });
    },
    
    
    /**
     * Create or update an allergy
     */
    create: function(params, success, error) {
        $.ajax({
            url: '/apps/allergies/allergies/new',
            type: 'post',
            dataType: 'text',
            data: params,
            success: this.callback(function(data, textStatus, xhr) {
                if (success) {
                    success(data, textStatus);
                }
            }),
            error: error
        });
    },
    
    update: function(id, params, success, error) {
        if (!id) {
            return this.create(params, success, error);
        }
        
        $.ajax({
            url: '/apps/allergies/allergies/' + id + '/replace',
            type: 'post',
            dataType: 'text',
            data: params,
            success: this.callback(function(data, textStatus, xhr) {
                if (success) {
                    success(data, textStatus);
                }
            }),
            error: error
        });
    },
},
/* @Prototype */
{
    /**
     * Get the history
     */
    loadHistory: function(success, error) {
        $.ajax({
            url: '/apps/allergies/allergies/' + this.meta.id + '/history/',
            type: 'get',
            dataType: 'json',
            success: function(data, textStatus, xhr) {
                if (success) {
                    success(data, textStatus);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                if (error) {
                    error(textStatus);
                }
            }
        });
    },
    
    
    /**
     * Update status
     */
    setStatus: function(status, reason, success, error) {
        $.ajax({
            url: '/apps/allergies/allergies/' + this.meta.id + '/set-status',
            type: 'post',
            data: { status: status, reason: reason },
            dataType: 'json',
            success: function(data, textStatus, xhr) {
                if (success) {
                    success(Allergies.Models.Allergy.wrapMany(data)[0], textStatus);        // wrapMany is deprecated!
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                if (error) {
                    error(textStatus);
                }
            }
        }); 
    },
})