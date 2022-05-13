var express = require('express');
var router = express.Router();
var appController=require('../controllers/appController');
var auth=require('../controllers/userController').auth;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Ripple' });
});
/*
router.get('/home',auth,appController.home_get);
router.get('/home/:name',auth,appController.img_get);
router.get('/mov/:name',auth,appController.mov_get);
router.get('/movStream/:name',auth,appController.movStream_get);
router.get('/movlist',auth,appController.movlist_get);
router.get('/upload',auth,appController.upload_get);
router.post('/upload',auth,appController.upload_post);
router.get('/anim',appController.anim_get);
router.post('/anim',appController.anim_post);*/
router.get('/home',appController.home_get)
router.get('/projects',auth,appController.prolist_get)
router.get('/projects/create',auth,appController.project_create_get)
router.post('/projects/create',auth,appController.project_create_post)
router.get('/projects/:id',auth,appController.record_get)
router.get('/audio/:id',auth,appController.audio_get)
router.get('/project/audio/:id',auth,appController.proj_audio_get)
router.get('/record',auth,appController.record_get);
router.post('/record',auth,appController.record_post)
router.post('/record/eve',auth,appController.record_eve)
module.exports=router
