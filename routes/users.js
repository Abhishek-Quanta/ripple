var express = require('express');
var router = express.Router();
var userController=require('../controllers/userController');
var auth=userController.auth;
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});
router.get('/register',userController.regist_get);
router.post('/register',userController.regist_post);
router.get('/login',userController.login_get);
router.post('/login',userController.login_post);
router.get('/logout',userController.logout_get);
router.get('/modify/:name',auth,userController.modif_get);
router.post('/modify/:name',auth,userController.modif_post);
router.get('/manage',auth,userController.manage_get);
module.exports = router;
