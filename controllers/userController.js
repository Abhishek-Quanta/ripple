const fs=require('fs')
const {body,validationResult}=require('express-validator')
//const exx=require('xlsx')
const bcrypt=require('bcrypt')
const saltRounds=10
const User=require('../models/user')

exports.regist_get=function(req,res){
	res.render('register',{title:'Register'})
}
exports.regist_post=[
	body('name').trim().isLength({min:1}).escape().withMessage(
		'Your Name is Required'),
	body('age').trim().escape(),
	body('mail').trim().isEmail().withMessage(
		'A valid Email Id is Required'),
	body('pass1').trim().isLength({min:8}).escape().withMessage(
		'Password should contain min 8 characters'),
	body('pass2').trim().isLength({min:8}).escape().withMessage(
		'Password should contain min 8 characters'),
	async(req,res)=>{
		const errors=validationResult(req)
		if(!errors.isEmpty())
			return res.render('register',{title:'Register'
				,user:req.body,errors:errors.array()})
		const {name,age,mail,pass1,pass2}=req.body
		try{
			var user=await User.findOne({email:mail})
			var errs=[]
			if(user)
				errs.push({msg:'Email already exists'})
			if(pass1!=pass2)
				errs.push({msg:'Confirm Password Correctly'})
			if(errs.length!=0)
				return res.render('register',{title:'Register',
					user:req.body,errors:errs})
			var hashPass=await bcrypt.hash(pass1,saltRounds)
			user=new User({name:name,
						age:age===''?0:age,
						email:mail,
						pass:hashPass
					})
			await user.save()
			return res.redirect('/users/login')
		}
		catch(err){
			console.log('err registering',err)
			return res.render('register',{title:'Register',
				user:req.body,errors:[{msg:'Try again'}]})
		}
	}];
exports.login_get=function(req,res){
	res.render('login',{title:'Login'});
}
exports.login_post=[
	body('mail').trim().isEmail().withMessage(
		'A valid Email Id is required'),
	body('pass').trim().isLength({min:8}).escape()
		.withMessage('Incorrect Password'),
	async(req,res)=>{
		const errors=validationResult(req);
		if(!errors.isEmpty())
			return res.render('login',{title:'Login',user:req.body,
				errors:errors.array()});
		const {mail,pass}=req.body
		try{
			var user=await User.findOne({email:mail})
			var errs=[]
			if(!user)
				errs.push({msg:'User not present. Try registering.'})
			else{
				var result=await bcrypt.compare(pass,user.pass)
				if(!result)
					errs.push({msg:'Incorrect Password'})
			}
			if(errs.length!=0)
				return res.render('login',{title:'Login',
					user:req.body,errors:errs})
			req.session.auth=mail
			await req.session.save()
			return res.redirect('/home')
		}
		catch(err){
			console.log('err logging',err)
			return res.render('login',{title:'Login',
				user:req.body,errors:[{msg:'Try again'}]})
		}
	}];
exports.logout_get=function(req,res){
	req.session.destroy(err=>{
		if(!err)
			return res.redirect('/');
	});
}
exports.modif_get=function(req,res){
	res.render('login',{title:'Verify',lgd:true,chng:
		req.params.name==='password'?true:false});
}
exports.modif_post=[
	body('mail').trim().isEmail().withMessage(
		'A valid Email Id is Required'),
	body('pass').trim().isLength({min:8}).escape()
		.withMessage('Incorrect Password'),
	(req,res,next)=>{
		if(req.params.name==='password')
			return body('chpass').trim().isLength({min:8})
				.escape().withMessage(
					'Password should contain min 8 characters')
				.call(this,req,res,next);
		else
			return next();
	},
	async(req,res)=>{
		const errors=validationResult(req);
		if(!errors.isEmpty())
			return res.render('login',{title:'Verify',user:req.body,
				errors:errors.array(),lgd:true,chng:
			req.params.name==='password'?true:false});
			try{
				const {mail,pass,chpass}=req.body
				var user=await User.findOne({email:mail})
				var errs=[]
				if(!user)
					errs.push({
						msg:'User not present. Try registering.'
					})
				else{
					var result=await bcrypt.compare(pass,user.pass)
					if(!result)
						errs.push({msg:'Incorrect Password'})
				}
				if(errs.length!=0)
					return res.render('login',{title:'Login',
						user:req.body,errors:errs})
				if(req.params.name==='password'){
					var hashPass=await bcrypt.hash(chpass,saltRounds)
					await User.updateOne({email:mail},
								{pass:hashPass})
					return res.render('manage',{
						title:'Manage Account',
						lgd:true,alt:req.params.name})
				}
				await User.deleteOne({email:mail})
				req.session.destroy(err=>{
					if(!err)
						return res.render('manage',
							{title:'Manage Account',lgd:true,
							alt:req.params.name})
				})
			}
			catch(err){
				console.log('err modifying',err)
				return res.render('login',{title:'Verify',
					user:req.body,errors:[{msg:'Try Again'}],
					chng:req.params.name==='password'?true:false})
			}
	}];
exports.manage_get=function(req,res){
	return res.render('manage',{title:'Manage Account',lgd:true});
}/*
exports.host=function(obj){
	var wb=exx.readFile('./models/users.xlsx');
	var ws=wb.Sheets['Sheet1'];
	var tab=exx.utils.sheet_to_json(ws);
}*/
exports.auth=function(req,res,next){
	if(req.session.auth)
		return next();
	res.redirect('/users/login');
}
