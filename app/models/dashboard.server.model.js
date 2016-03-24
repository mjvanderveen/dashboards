'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Article Schema
 */
var DashboardSchema = new Schema({
	name: {
		type: String,
		default: '',
		trim: true,
		required: 'Name cannot be blank'
	},
	description: {
		type: String,
		default: '',
		trim: true,
		required: 'Title cannot be blank'
	},
	url: {
		type: String,
		default: '',
		trim: true,
		required: 'Url to template file needs to be given'
	},
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	
});

mongoose.model('Dashboard', DashboardSchema);