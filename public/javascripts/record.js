var addNode=document.querySelector('#addnode');
const main=document.querySelector('main');
var mediaRecorder;
var audioCon=new AudioContext();
var analyserNode=new AnalyserNode(audioCon);
var bufferLength=analyserNode.frequencyBinCount;
var dataArray=new Uint8Array(bufferLength);
var source;
var curStart=0;
var count=1;
let chunks=[];
var recentClip='';
var activeNode;
var rectImg=document.createElement('img');
rectImg.src='/images/rect.png'
const xhr=new XMLHttpRequest();
function canRefresh(can,rect=rectImg){
	var canvaCon=can.getContext('2d');
	canvaCon.drawImage(rect,0,0,can.width,can.height);
}
window.onkeypress=e=>{
	if(e.code==="Space"&&activeNode!=null){
		if(activeNode.audio.paused)
			activeNode.audio.play();
		else
			activeNode.audio.pause();
	}
}
window.onresize=function(){
	var canvs=document.querySelectorAll('.audet');
	var styl
	canvs.forEach(can=>{
		styl=getComputedStyle(can);
		can.width=parseInt(styl['width']);
		can.height=parseInt(styl['height']);
		canRefresh(can);
	});
	var curs=document.querySelectorAll('.cur');
	curs.forEach(cur=>{
		cur.height=parseInt(styl['height']);
	});
}

function maniAud(job){
	var start=(activeNode.start/activeNode.canvaPo)*
			activeNode.audio.duration;
	var end=(activeNode.end/activeNode.canvaPo)*
			activeNode.audio.duration;
	xhr.open('POST','/record/eve');
	xhr.setRequestHeader('Content-Type','application/json');
	xhr.send(JSON.stringify({eve:job,start:start,
		end:end,nodeId:activeNode.id,projId:projectId}))
		//name:activeNode.clipName.innerHTML}));
	console.log(job,start,end);
}

function RecNode(id=null,title,
	canvaSrc='/images/rect.png',
	audSrc='/recfiles/'+title+'.mp3',
	canvaPo=0
){
	this.id=id;
	this.clipCont=document.createElement('div');
	this.clipCont.classList.add('recnode');
	this.clipCont.id='rec'+count;
	var some=document.createElement('div');
	some.classList.add('some');
	var but=document.createElement('div');
	but.classList.add('but');
	this.rec=document.createElement('button');
	this.rec.classList.add('rec');
	this.rec.innerHTML='Record';
	this.stop=document.createElement('button');
	this.stop.classList.add('stop');
	this.stop.innerHTML='Stop';
	but.append(this.rec,this.stop);
	some.append(but);
	but=document.createElement('div');
	but.classList.add('but');
	this.clipName=document.createElement('div');
	this.clipName.classList.add('recfile');
	this.clipName.innerHTML=title;//'NewRecord'+i;
	this.play=document.createElement('img');
	this.play.classList.add('ico');
//	this.play.src='/images/play.png';
	this.play.src='/images/play.svg';
	but.append(this.clipName,this.play);
	some.append(but);
	but=document.createElement('div');
	but.classList.add('but');
	this.download=document.createElement('button');
	this.download.classList.add('down');
	this.download.innerHTML='Download';
	this.deleteBut=document.createElement('button');
	this.deleteBut.classList.add('dele');
	this.deleteBut.innerHTML='Delete';
	but.append(this.download,this.deleteBut);
	some.append(but);
	this.canva=document.createElement('canvas');
	this.canva.classList.add('audet');
	this.canvaPo=canvaPo;
	//exp
	this.dx=0.001;
	
	this.curPo=0;
	this.canvaCon=this.canva.getContext('2d');
	this.rect=document.createElement('img');
	this.rect.src=canvaSrc;
	this.start=0;
	this.end=0;

	this.cur=document.createElement('img');
	this.cur.src='/images/cursor.png';
	this.cur.classList.add('cur');
	this.cur.draggable=true;
	this.clipCont.append(some,this.canva,this.cur);
	//audio
	this.audio=new Audio(audSrc)
	//in
	addNode.insertAdjacentElement('beforebegin',this.clipCont);
	var style=getComputedStyle(this.canva);
	this.cur.width=7;
	this.cur.height=parseInt(style['height']);
	this.cur.style.right=style['width'];
	this.canva.width=parseInt(style['width']);
	this.canva.height=parseInt(style['height']);
	this.curPo=this.cur.offsetLeft;
	curStart=this.curPo;
	some.onclick=e=>{
		if(e.target.tagName!=='DIV')
			return;
		if(activeNode!=null)
			activeNode.clipCont.classList.remove('active');
		this.clipCont.classList.add('active');
		activeNode=this;
		this.cur.style.left=null;
		this.curPo=this.cur.offsetLeft;
		if(this.audio!=null)
			this.audio.currentTime=0;
		this.end=0;
		canRefresh(this.canva,this.rect);
	}
}
RecNode.prototype.setListeners=function(){
	this.rec.onclick=e=>{
		mediaRecorder.start();
		source.connect(analyserNode);
		this.drawWave();
		console.log(mediaRecorder.state);
		this.rec.style.background="red";
		recentClip=this.clipName.innerHTML;
		
		if(activeNode!=null)
			activeNode.clipCont.classList.remove('active');
		this.clipCont.classList.add('active');
		activeNode=this;
	}
	this.stop.onclick=e=>{
		if(this.clipName.innerHTML!==recentClip)
			return;
		mediaRecorder.stop();
		analyserNode.disconnect();
		cancelAnimationFrame(this.request);
//		this.canva.dataset.song=this.canva.toDataURL();
		this.rect.src=this.canva.toDataURL();
		this.rect.onload=e=>{
			canRefresh(this.canva,this.rect);
		}
		console.log(mediaRecorder.state);
		this.rec.style.background='#345599';
	}
	this.clipName.onclick=e=>{
		var bef=this.clipName.innerHTML;
		var newName=prompt('Enter New Name');
		if(newName!=""&&newName!=null)
			this.clipName.innerHTML=newName;
		xhr.open('POST','/record/eve');
		xhr.setRequestHeader('Content-Type','application/json');
		xhr.send(JSON.stringify({eve:'rename',bef:bef,
			aft:this.clipName.innerHTML,nodeId:this.id
		}));
	}
	this.download.onclick=e=>{
		var name=this.clipName.innerHTML;
		xhr.open('POST','/record/eve');
		xhr.setRequestHeader('Content-Type','application/json');
		xhr.send(JSON.stringify({eve:'down',name:name}));
	}
	this.deleteBut.onclick=e=>{
		//count--;
		xhr.open('POST','/record/eve');
		xhr.setRequestHeader('Content-Type','application/json');
		var name=this.clipName.innerHTML;
		xhr.send(JSON.stringify({eve:'dele',name:name,projId:projectId,
			nodeId:this.id}));
		main.removeChild(this.clipCont);
	}
	this.canva.onclick=e=>{
		this.cur.style.left=e.pageX+"px";
		this.curPo=e.pageX;
		canRefresh(this.canva,this.rect);
		if(this.audio!=null){
			var time=(e.offsetX/this.canvaPo)*this.audio.duration
			this.audio.currentTime=time;
			console.log('seeked to'+time);
		}
		this.start=e.offsetX;
		this.end=0;
	}
	this.canva.ondragenter=e=>{
//		this.start=e.offsetX;
		console.log("dragstart"+this.start);
	}
	this.canva.ondragover=e=>{
		e.preventDefault();
		console.log("dragging");
		canRefresh(this.canva,this.rect);
		this.canvaCon.fillStyle='#88bb88';
		this.canvaCon.fillRect(this.start,0,
		e.offsetX-this.start,this.canva.height);
	}
	this.canva.ondrop=e=>{
		this.end=e.offsetX;
		e.preventDefault();
		console.log("drop");
//		this.end=this.start+.1;
		this.curPo=e.pageX;
		this.cur.style.left=e.pageX+"px";
	}
	//audio
	this.audio.onloadstart=e=>{
		this.play.src='/images/load.png'
	}
	this.audio.oncanplaythrough=e=>{
//		this.play.src='/images/play.png'
		this.play.src='/images/play.svg'
	}
	this.audio.onended=e=>{/*
		this.play
			.src='/images/play.png';*/
		this.play
			.src='/images/play.svg';
	}
	this.audio.ontimeupdate=e=>{
		if(this.audio.paused)
			return;
		var time=((this.audio.currentTime/
			this.audio.duration)*
			this.canvaPo)+curStart;
		this.cur.style.left=time+"px";
		if(this.end!=0&&(time-curStart)>this.end){
			this.audio.pause();
		}
	}
	this.audio.onplay=e=>{
		this.play
			.src='/images/pause.svg';
		console.log('audio is playing',this.play.src);
	}
	this.audio.onpause=e=>{
		this.play
			.src='/images/play.svg';
	}
	this.play.onclick=e=>{
		//audio
		if(this.audio.paused)
			this.audio.play();
		else
			this.audio.pause();
	}
}
RecNode.prototype.drawWave=function(){
	this.request=requestAnimationFrame(this.drawWave.bind(this));
	analyserNode.getByteTimeDomainData(dataArray);
	this.canvaCon.lineWidth=1;
	this.canvaCon.strokeStyle='#222299';
	this.canvaCon.beginPath();
	var x=this.canvaPo;
	var dx=0.0001//this.dx;
	for(var i=0;i<bufferLength;i++){
		var y=(dataArray[i]/256)*this.canva.height;
		if(i===0){
			this.canvaCon.moveTo(x,y);
		}
		else if(x<=this.canva.width)
			this.canvaCon.lineTo(x,y);
		x+=dx//.001;
		this.curPo+=dx//.001;
		this.cur.style.left=this.curPo+"px";
	}
	this.canvaPo=x;
	this.canvaCon.stroke();
	/*exp
	if(this.canvaPo>this.canva.width/2){
		var imdat=this.canvaCon.getImageData(0,0,this.canvaPo,
			this.canva.height);
		canRefresh(this.canva);
		this.canvaPo=this.canva.width/2;
		this.dx=this.dx/2;
		this.canvaCon.putImageData(imdat,0,0,0,0,this.canvaPo,
			this.canva.height);
		this.rect.src=this.canva.toDataURL();
		this.rect.onload=e=>{
			canRefresh(this.canva,this.rect);
		}
	}*/
}
function updateCanva(){
	xhr.open('POST','/record/eve')
	xhr.setRequestHeader('Content-Type','application/json')
	xhr.send(JSON.stringify({eve:'updateCanva',id:activeNode.id,
		canvas:activeNode.canva.toDataURL(),canvaPo:activeNode.canvaPo}))
}
xhr.onload=function(){
	var res=JSON.parse(this.responseText);/*
	if(res.eve.includes('aud')){
		var name=activeNode.clipName.innerHTML;
		name+='-'+res.eve.split('aud')[0];
		activeNode.clipName.innerHTML=name;
		activeNode.audio.src='/recfiles/'+
				name+'.mp3'
	}*/
	if(res.eve==='recdone'){
		console.log('Recording Done');
		
		this.open('POST','/record/eve');
		this.setRequestHeader('Content-Type','application/json');
		this.send(JSON.stringify({eve:'move',name:recentClip,
			canvas:activeNode.canva.toDataURL(),projId:projectId,
			canvaPo:activeNode.canvaPo}));
	}
	else if(res.eve==='updateCanva'){
		activeNode.audio.src=res.nodeUrl
		console.log('updatedCanva')
	}
	else if(res.eve==='moved'){
		activeNode.id=res.nodeId
		activeNode.audio.src=res.nodeUrl
		console.log('File Moved');
	}
	else if(res.eve==='renamed'){
		console.log('File Renamed');
	}
	else if(res.eve==='deleted')
		console.log('File Deleted');
	else if(res.eve==='muteaud'){
		var can=activeNode.canva;
		var ctx=activeNode.canvaCon;
		canRefresh(can,activeNode.rect);
		ctx.drawImage(rectImg,activeNode.start,
			0,activeNode.end-activeNode.start,can.height);
		ctx.lineWidth=1;
		ctx.strokeStyle='#222299';
		ctx.beginPath();
		ctx.moveTo(activeNode.start,can.height/2);
		ctx.lineTo(activeNode.end,can.height/2);
		ctx.stroke();
		activeNode.rect.src=can.toDataURL();
		activeNode.rect.onload=e=>{
			canRefresh(can,activeNode.rect);
		}
		updateCanva()
		console.log('Segment muted');
	}
	else if(res.eve==='cutaud'){
		var can=activeNode.canva;
		var ctx=activeNode.canvaCon;
		canRefresh(can,activeNode.rect);
		var imdat=ctx.getImageData(activeNode.start,0,activeNode.end,
			can.height);
		canRefresh(can);
		ctx.putImageData(imdat,0,0,0,0,activeNode.end-activeNode.start,
			can.height);
		activeNode.rect.src=can.toDataURL();
		activeNode.rect.onload=e=>{
			canRefresh(can,activeNode.rect);
		}
		activeNode.canvaPo=activeNode.end-activeNode.start;
		updateCanva()
		console.log('Segment cut');
	}
	else if(res.eve==='remaud'){
		var can=activeNode.canva;
		var ctx=activeNode.canvaCon;
		canRefresh(can,activeNode.rect);
		var imdat1=ctx.getImageData(0,0,activeNode.start,
			can.height);
		var imdat2=ctx.getImageData(activeNode.end,0,activeNode.canvaPo,
			can.height);
		canRefresh(can);
		ctx.putImageData(imdat1,0,0,0,0,activeNode.start,can.height);
		ctx.putImageData(imdat2,activeNode.start,0);
		activeNode.rect.src=can.toDataURL();
		activeNode.rect.onload=e=>{
			canRefresh(can,activeNode.rect);
		}
		activeNode.canvaPo-=activeNode.end-activeNode.start;
		updateCanva()
		console.log('Segment removed');
	}
	else if(res.eve==='saveaud'){
		console.log('saveaud')
		alert('Project Saved')
	}
}
//main
navigator.mediaDevices.getUserMedia(
	{
		audio:true
	}).then(function(stream){
		source=audioCon.createMediaStreamSource(stream);
		mediaRecorder=new MediaRecorder(stream);
		mediaRecorder.ondataavailable=e=>{
			chunks.push(e.data);
		}
		mediaRecorder.onstop=e=>{
			console.log('recorder stopped');
			const blob=new Blob(chunks,{'type':'audio/mpeg-3;\
										codecs=mp3'});
			chunks=[];
			var fordat=new FormData();
			fordat.append('file',blob,recentClip+'.mp3');
			xhr.open('POST','/record');
			xhr.send(fordat);
		}
	})
	.catch(function(err){
		console.log('user media:'+err);
	});
if(nodesArr)
	nodesArr.forEach(node=>{
		var recnode=new RecNode(node.id,node.title,node.canvas,
			node.audSrc,node.canvaPo)
		recnode.setListeners()
		canRefresh(recnode.canva,recnode.rect)
	})
addNode.onclick=e=>{
	var trynode=new RecNode(0,'NewRecord'+count);
	count++;
	trynode.setListeners();
	canRefresh(trynode.canva);
}
