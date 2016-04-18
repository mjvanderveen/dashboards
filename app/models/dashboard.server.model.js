'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var SpreadsheetColumnSchema = new Schema({
    title: {
        type: String,
        trim: true,
        default: '',
	    required:true,
	    form:  {label:'Column title', size:'large'},
	    list:true
    }
});

var SpreadsheetColumn;

try {
  SpreadsheetColumn = mongoose.model('SpreadsheetColumn');
} catch (e) {
  SpreadsheetColumn = mongoose.model('SpreadsheetColumn', SpreadsheetColumnSchema);
}
	
var SourceSchema = new Schema({
    name: {
            type: String,
            trim: true,
            default: '',
	    required:true,
	    form:  {label:'Name', size:'large'},
	    list:true
    },
    description: {
		type: String,
		default: '',
		trim: true,
		form:  {label:'Description', type:'textarea', size:'large', rows:5},
		required: true
	},
	type: {
		 type: String, 
		 default: 'Dropbox', 
		 enum: ['Dropbox', 'Google Spreadsheet', 'CartoDB', 'FileLocal', 'FileUrl'] 
	},
	format: {
		 type: String, 
		 default: 'Array', 
		 enum: ['Array', 'GeoJSON'] 
	},
    fileId: {
            type: String,
            trim: true,
            default: '',
	    required:true,
		form:  {showWhen:{lhs:'$type', comp:'ne', rhs:'CartoDB'}, label:'File identifier', size:'large'}
    },
	query: {
		type: String,
		trim: true,
		default: '',
		required:true,
		form:  {showWhen:{lhs:'$type', comp:'eq', rhs:'CartoDB'}, label:'CartoDB query', size:'large'}
    },
	url: {
		type: String,
		trim: true,
		default: '',
		required:true,
		form:  {showWhen:{lhs:'$type', comp:'eq', rhs:'CSV url'}, label:'URL to CSV', size:'large'}
    },
	path: {
		type: String,
		trim: true,
		default: '',
		required:true,
		form:  {showWhen:{lhs:'$type', comp:'eq', rhs:'CSV local'}, label:'path to local CSV', size:'large'}
    },
	key: {
		type: String,
		trim: true,
		default: '',
		required:true,
		form:  {showWhen:{lhs:'$type', comp:'eq', rhs:'Google Spreadsheet'}, label:'Spreadsheet unique key', size:'large'}
    },
	columns: {
		type: [SpreadsheetColumnSchema],
		required:true,
		form:  {showWhen:{lhs:'$type', comp:'eq', rhs:'Google Spreadsheet'}, label:'Spreadsheet columns to include', size:'large'}
    },
	isPublic: {
	    type: Boolean,
		form:  {label:'Public dataset?'},
	    default: false
	    
	},
	isActive: {
	    type: Boolean,
		form:  {label:'Source Active?'},
	    default: true
	    
	}
});

var Source;

try {
  Source = mongoose.model('Source');
} catch (e) {
  Source = mongoose.model('Source', SourceSchema);
}
	
/**
 * Article Schema
 */
var DashboardSchema = new Schema({
	name: {
		type: String,
		default: '',
		trim: true,
		form:  {label:'Name', size:'large'},
		required: 'Name cannot be blank'		
	},
	description: {
		type: String,
		default: '',
		trim: true,
		form:  {label:'Description', type:'textarea', size:'large', rows:5},
		required: 'Title cannot be blank'
	},
	url: {
		type: String,
		default: '',
		trim: true,
		form:  {label:'url', size:'large'},
		required: 'Url to template file needs to be given'
	},
	isPublic: {
	    type: Boolean,
		form:  {label:'Public for everyone'},
	    default: false
	    
	},
	roles: {
		 type: String, 
		 default: 'user', 
		 enum: ['user', 'admin'] 
	},
	sources: {
		type: [SourceSchema]
	},
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	}
	
});

mongoose.model('Dashboard', DashboardSchema);