var express         =       require("express");
var multer          =       require('multer');
var app             =       express();
var upload      =   multer({ dest: './uploads/'});

app.get('/',function(req,res){
      res.sendFile(__dirname + "/index_upload.html");
});

app.post('/api/photo', upload.single('userPhoto'), function(req, res, next){
    res.send("success");
});

app.listen(2000,function(){
    console.log("Working on port 2000");
});
