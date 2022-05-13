var mongoose=require('mongoose')
var Schema=mongoose.Schema
var RecnodeSchema=new Schema({
	title:{type:String,required:true},
	canvas:String,
	song:Buffer,
	canvaPo:Number
})
RecnodeSchema.virtual('url').get(function(){
	return '/audio/'+this._id
})
module.exports=mongoose.model('RecNode',RecnodeSchema)
