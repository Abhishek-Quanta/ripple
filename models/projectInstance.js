var mongoose=require('mongoose')
var Schema=mongoose.Schema
var ProjectSchema=new Schema({
	title:{type:String,required:true},
	song:{type:Buffer,default:1},
	description:{type:String,default:'Nothing to Mention'},
	nodes:[{type:Schema.Types.ObjectId,ref:'RecNode'}],
	created_on:{type:Date,default:Date.now}
})
ProjectSchema.virtual('url')
	.get(function(){
		return '/projects/'+this._id
	})
module.exports=mongoose.model('Project',ProjectSchema)
