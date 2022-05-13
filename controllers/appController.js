const fs=require('fs')
const fspro=require('fs/promises')
const childProcess=require('child_process')
const Project=require('../models/projectInstance')
const RecNode=require('../models/recnode')
const {body,validationResult}=require('express-validator')
const multer=require('multer')
const {Readable}=require('stream')

var storage=multer.diskStorage({
   destination:function(req,file,cb){
       cb(null,'./Temp')
   },
   filename:function(req,file,cb){
       cb(null,file.originalname)
   }
  })
var upload=multer({storage:storage})


exports.home_get=function(req,res){
	var lgd=false
	if(req.session.auth)
		lgd=true
	res.render('index',{title:'Ripple',lgd:lgd})
}
exports.prolist_get=function(req,res,next){
	Project.find({})
		.select('title description')
		.sort({created_on:-1})
		.exec((err,projects)=>{
			if(err)
				return next(err)
			res.render('projects',{title:'Projects',projects:projects,
				lgd:true})
		})
}
exports.project_create_get=function(req,res){
	return res.render('project_form',{tiltle:'Add Project'})
}
exports.project_create_post=[
	body('title','Title must not be empty').trim().isLength({min:1})
		.escape(),
	body('description').trim().escape(),
	(req,res,next)=>{
		const errors=validationResult(req)
		var project=new Project({
			title:req.body.title,
			description:(req.body.description=='')?
				'nothing to mention':req.body.description
		})
		if(!errors.isEmpty()){
			console.log(`description:${project.description}`)
			return res.render('project_form',{title:'Add Project',
				errors:errors.array(),project:project})
		}
		project.save(err=>{
			if(err)
				return next(err)
			res.redirect('/projects')
		})
	}
]
exports.record_get=function(req,res,next){
	Project.findById(req.params.id)
		.populate('nodes')
		.exec((err,project)=>{
			if(err)
				return next(err)
//			console.log('node:',project.nodes[0].canvaPo)
			res.render('record',{title:'Recording',project:project,
				projId:req.params.id})
		})
}
exports.audio_get=function(req,res,next){
	const range=req.headers.range
	if(!range)
		return res.status(400).send('Range is Required')
	const chunk=10**6
	const start=Number(range.replace(/\D/g,''))
	const readable=new Readable()
	readable._read=()=>{}
	RecNode.findById(req.params.id)
		.exec((err,node)=>{
			if(err||node.song==null)
				return next(err)
			var buf=Buffer.from(node.song)
			var size=buf.length
			const end=Math.min(size-1,start+chunk)
			const contentLength=end-start+1
			const headers={
				'Content-Range':`bytes ${start}-${end}/${size}`,
				'Accept-Ranges':'bytes',
				'Content-Length':contentLength,
				'Content-Type':'audio/mp3'
			}
			readable.push(buf)
			res.writeHead(206,headers)
//			const audStream=fs.createReadStream(buf,{start,end})
			readable.pipe(res)
		})
}
exports.proj_audio_get=async function(req,res,next){
	const range=req.headers.range
	if(!range)
		return res.status(400).send('Range is Required')
	const chunk=10**6
	const start=Number(range.replace(/\D/g,''))
	const readable=new Readable()
	readable._read=()=>{}
	try{
		var project=await Project.findOne({_id:req.params.id})
			.exec()
		var buf=Buffer.from(project.song)
		var size=buf.length
		const end=Math.min(size-1,start+chunk)
		const contentLength=end-start+1
		const headers={
			'Content-Range':`bytes ${start}-${end}/${size}`,
			'Accept-Ranges':'bytes',
			'Content-Length':contentLength,
			'Content-Type':'audio/mp3'
		}
		readable.push(buf)
		res.writeHead(206,headers)
		readable.pipe(res)
	}
	catch(err){
		console.log('proj audio err:',err)
		return next(err)
	}
}
exports.record_eve=async function(req,res,next){
    console.log('in:'+req.body.eve)
    function setListener(child,cb=null){
        child.stdout.on('data',dat=>{
            console.log('stdout')
            //console.log(`stdout: ${dat}`)
        })
        child.stderr.on('data',dat=>{
            console.log('stderr')
            //console.log(`stderr: ${dat}`)
        })
        child.on('close',c=>{
            if(cb!=null)
                cb()
            else
                console.log(`child process closed ${c}`)
        })
    }
    function preEditing(id,cb){
    	RecNode.find({_id:id})
    		.exec((err,node)=>{
    			if(err)
    				return next(err)
    			var name=node[0].title
    			console.log('preEditing',id,name)
//    			var buf=Buffer.from(node.song)
    			fs.writeFile('./public/recfiles/'+name+'.mp3',
    				node[0].song,err=>{
    					if(err)
    						console.log('preEditing Error')
    					cb(name)
    				})
    		})
    }
    function postEditing(id,name,cb){
    	fs.readFile(`./public/recfiles/${name}`,(err,data)=>{
    		RecNode.updateOne({_id:id},
    			{song:data},err=>{
    				if(err)
    					return next(err)
    				cb()
    			})
    	})
    }
    
    if(req.body.eve==='delproj'){
    	var projId=req.body.id
    	try{
	    	var projects=await Project.find({_id:projId})
	    						.populate('nodes')
	    						.exec()
			var project=projects[0]
	    	console.log('find executed')
	    	for(node of project.nodes){
	    		try{
					console.log('in forEachh')
					await RecNode.deleteOne({_id:node._id})
					console.log(node.title,'deleted')
				}
				catch(err){
					console.log('err:delproj nodes')
					next(err)
				}
	    	}
//			var title=project.title
			await Project.deleteOne({_id:project._id})
			console.log(project.title,'deleted')
			return res.json({eve:'delproj'})
	    }
	    catch(err){
	    	console.log('err:delproj')
	    	next(err)
	    }
    }
    else if(req.body.eve==='move'){
        var name=req.body.name
        fs.copyFile('./Temp/'+name+'.mp3','./public/recfiles/'+
        	name+'.mp3',err=>{
    	        if(err)
    	            return console.log('move:'+err)
    	        fs.unlink('./Temp/'+name+'.mp3',err=>{
    	            if(err)
    	                return console.log('move2:'+err)
				})
				fs.readFile('./public/recfiles/'+name+'.mp3',
					(err,data)=>{
					if(err)
						return console.log('error reading:')
					var node=new RecNode({
						title:name,
						canvas:req.body.canvas,
						song:data,
						canvaPo:req.body.canvaPo
					})
					node.save(err=>{
						if(err)
							return next(err)
						Project.findByIdAndUpdate(
							{_id:req.body.projId},
							{$push:{nodes:node._id}},(err,result)=>{
									if(err)
										return next(err)
									console.log("updating")
									return res.json({eve:'moved',
										nodeUrl:node.url,
										nodeId:node._id
									})
							})
						console.log('node moved to db',
							req.body.projId)
					})
				})
    	    })
    }
    else if(req.body.eve==='rename'){
        var bef=req.body.bef,aft=req.body.aft
        fs.rename('./public/recfiles/'+bef+'.mp3',
            './public/recfiles/'+aft+'.mp3',
            err=>{
                if(err)
                    console.log('rename:'+err)
            })
		RecNode.findByIdAndUpdate({_id:req.body.nodeId},{
			title:aft},err=>{
				if(err)
					return next(err)
				console.log('renamed')
		    	return res.json({eve:'renamed'})
		    })
    }
    else if(req.body.eve==='down'){
        return res.download('./public/recfiles/'+
        	req.body.name+'.mp3')
    }
    else if(req.body.eve==='dele'){
        fs.unlink('./public/recfiles/'+req.body.name+'.mp3',err=>{
            if(err)
                console.log('dele:'+err)
            })
		RecNode.findByIdAndDelete(req.body.nodeId,err=>{
			if(err)
				return next(err)
			Project.findByIdAndUpdate({_id:req.body.projId},
				{$pull:{nodes:req.body.nodeId}},err=>{
					if(err)
						return next(err)
					console.log('song deleted')
					return res.json({eve:'deleted'})
				})
		})
    }
    else if(req.body.eve==='updateCanva'){
    	RecNode.findByIdAndUpdate(req.body.id,
    		{canvas:req.body.canvas,canvaPo:req.body.canvaPo},
    			(err,node)=>{
    			if(err)
    				return next(err)
    			console.log('canvas updated')
    			return res.json({eve:'updateCanva',nodeUrl:node.url})
    		})
    }
    else if(req.body.eve==='muteaud'){
        var start=req.body.start
        var end=req.body.end
        preEditing(req.body.nodeId,name=>{
        	var out=name+'-mute.mp3'
        	name+='.mp3'
	        const cmd=`ffmpeg -i ${name} -af "volume=enable='between(t,${start},${end})':volume=0" ${out}`;
        	const child=childProcess.spawn(cmd,{shell:true,
            	cwd:'./public/recfiles/'})
	        setListener(child,()=>{
    	    	postEditing(req.body.nodeId,out,()=>{
    	    		console.log('muteaud:'+start+'-'+end,name)
    	        	return res.json({eve:'muteaud'})
    	    	})
    	    })
        })
    }
    else if(req.body.eve==='cutaud'){
        var start=req.body.start
        var end=req.body.end
        preEditing(req.body.nodeId,name=>{
        	var out=name+'-cut.mp3'
	        name+='.mp3'
    	    const cmd=`ffmpeg -ss ${start} -i ${name} -t ${end-start} ${out}`;
    	    const child=childProcess.spawn(cmd,{shell:true,
    	        cwd:'./public/recfiles/'})
    	    setListener(child,()=>{
    	    	postEditing(req.body.nodeId,out,()=>{
    	    		console.log('removeaud:'+start+'-'+end,name)
	    	        return res.json({eve:'cutaud'})
    	    	})
    	    })
        })
    }
    else if(req.body.eve==='removeaud'){
        var start=req.body.start
        var end=req.body.end
        preEditing(req.body.nodeId,name=>{
        	var out1=name+'out1.mp3'
    	    var out2=name+'out2.mp3'
    	    var out=name+'-rem.mp3'
        	name+='.mp3'
    	    var cmd=`ffmpeg -i ${name} -t ${start} ${out1}`
    	    var child=childProcess.spawn(cmd,{shell:true,
    	        cwd:'./public/recfiles/'})
    	    setListener(child,e=>{
    	        cmd=`ffmpeg -ss ${end} -i ${name} ${out2}`
    	        child=childProcess.spawn(cmd,{shell:true,
    	            cwd:'./public/recfiles/'})
    	        setListener(child,e=>{
    	            cmd=`ffmpeg -i "concat:${out1}|${out2}" -acodec copy ${out}`;
    	            child=childProcess.spawn(cmd,{shell:true,
    	                cwd:'./public/recfiles/'})
    	            setListener(child,e=>{
    	                fs.unlink('./public/recfiles/'+out1,err=>{
    	                    if(err)
    	                    console.log('dele:'+err)
    	                })
    	                fs.unlink('./public/recfiles/'+out2,err=>{
    	                    if(err)
    	                    console.log('dele:'+err)
    	                })
    	                postEditing(req.body.nodeId,out,()=>{
    	                	console.log(
    	                		'removeaud:'+start+'-'+end,name
    	                	)
	    	                return res.json({eve:'remaud'})
    	                })
    	            })
    	        })
    	    })
        })
    }
    else if(req.body.eve==='saveaud'){
    	var projId=req.body.projId
    	try{
    		var project=await Project.findOne({_id:projId})
    						.populate('nodes')
    						.exec()
    		var i=0,files=[]
    		try{
	    		await Promise.all(project.nodes.map(async node=>{
    				var name='mix'+(i++)+'.mp3'
    				files.push(name)
    				await fspro.writeFile(
    					'./public/recfiles/'+name,
    					node.song)
    			}))
    		}
    		catch(err){
				console.log('writing file',err)
				return next(err)
    		}
    		var cmd='ffmpeg'
    		for(file of files)
    			cmd+=' -i '+file
    		cmd+=' -filter_complex amix=inputs='+i+
    			':duration=longest outputmix.mp3'
    		var child=childProcess.spawn(cmd,{shell:true,
    	        cwd:'./public/recfiles/'})
    	    setListener(child,async e=>{
    	    	try{
	    	    	var data=await fspro.readFile(
    	    			'./public/recfiles/outputmix.mp3')
	    	    	await Project.updateOne({_id:projId},
    		    		{song:data})
    		    	await fspro.unlink(
    		    		'./public/recfiles/outputmix.mp3')
    		    	console.log('count:',i)
			    	return res.json({eve:'saveaud'})
    	    	}
    	    	catch(err){
    	    		console.log('err reading:',err)
    	    		return next(err)
    	    	}
    	    })
    	}
    	catch(err){
    		console.log('err:saveaud')
    		return next(err)
    	}
    }
}
exports.record_post=[upload.array('file'),
	function(req,res){
		return res.json({eve:'recdone'})
	}]
