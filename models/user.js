var mongoose=require('mongoose')
var Schema=mongoose.Schema
var UserSchema=new Schema({
	name:{type:String,required:true},
	age:{type:Number,default:0},
	email:{type:String,required:true},
	pass:{type:String,required:true}
})

module.exports=mongoose.model('User',UserSchema)
