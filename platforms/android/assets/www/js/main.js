/*global Webcam, VK, alert, console, $, FileUploadOptions, FileTransfer */
var sg = {
  vk: {
    apiId: 4383863,
    group: 72066132,
    ver: 5.23
  },
  
  captureButton: $('#capture-button'),
  
  captureFile: true,
  
  main: function () {
    'use strict';
    var me = this;
    
    this.initError();
    
    if (!this.loginVk2()) { return; }
    
    this.captureButton.click(function () { me.capture(); });
    
//    this.initVkGroup();
  },
  
  initVkGroup: function () {
    'use strict';
    var width = $('#vk_groups').parent().width();
    
    VK.Widgets.Group("vk_groups", {mode: 2, wide: 1, width: width, height: "800"}, this.vk.group);
  },
  
  uploadToVk: function (img) {
    'use strict';
    var me = this,
      uploader = this.captureFile ? this.uploadFile : Webcam.upload;
    this.vkApi('photos.getWallUploadServer', {}, function (r1) {
      
      uploader(img, r1.response.upload_url, function (code, text) {
        console.log(code);
        console.log(text);
        var photo = JSON.parse(text);

        me.vkApi('photos.saveWallPhoto', {
          photo: photo.photo,
          server: photo.server,
          hash: photo.hash
        }, function (r2) {
          console.log(JSON.stringify(r2));
          me.vkApi('wall.post', {
            owner_id: -me.vk.group,
            attachments: 'photo' + r2.response[0].owner_id + '_' + r2.response[0].id,
            access_token: me.vk.token
          }, function (r3) {
            console.log(JSON.stringify(r3));
            setTimeout(function () { me.capture(); }, 0);
          });
        });
      });
    });
  },
  
  getParameterByName: function (name, hash) {
    'use strict';
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\#&]" + name + "=([^&#]*)"),
      results = regex.exec(hash);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  },
  
  loginVk2: function () {
    'use strict';
    VK.init({
      apiId: this.vk.apiId
    });
    
    if (!this.vk.token) {
      var ref = window.open('https://oauth.vk.com/authorize?client_id=4383863&scope=8196&' +
                            'redirect_uri=https://oauth.vk.com/blank.html&display=mobile&v=5.22&response_type=token',
                            '_blank', 'location=no'),
        me = this;
      ref.addEventListener('loadstart', function (ev) {
        if (ev.url.indexOf('https://oauth.vk.com/blank.html') === 0) {
          ref.close();
          console.log(ev.url);
          ev.url = ev.url.substr(ev.url.indexOf('#'));
          me.vk.token = me.getParameterByName('access_token', ev.url);
          me.vk.userId = me.getParameterByName('user_id', ev.url);
          console.log('Token: ' + me.vk.token);
          console.log('User: ' + me.vk.userId);
          me.vkApi('users.get', {
            user_ids: me.vk.userId,
            fields: 'screen_name'
          }, function (res) {
            res = res.response[0];
            $('span#vk-name').text(res.screen_name.indexOf('id') === 0 ?
                               res.first_name + ' ' + res.last_name :
                               res.screen_name);
            setTimeout(function () { me.capture(); }, 0);
          });
        }
        return true;
      });
    }
    
    return true;
  },
  
  uploadFile: function (path, url, cb) {
    'use strict';
    cb = cb || function () {};
    
    function win(r) {
      console.log("File upload Code = " + r.responseCode);
      console.log("File upload Response = " + r.response);
      console.log("File upload Sent = " + r.bytesSent);
      cb(r.responseCode, r.response);
    }

    function fail(error) {
      alert("An error has occurred: Code = " + error.code);
      console.log("upload error source " + error.source);
      console.log("upload error target " + error.target);
    }

    var options = new FileUploadOptions(),
      ft = new FileTransfer();
    
    options.fileKey = 'photo';
    options.fileName = 'photo.jpg';
    options.mimeType = 'image/jpg';
    options.chunkedMode = false;

    ft.upload(path, url, win, fail, options);
  },
  
  capture: function () {
    'use strict';
    
    var me = this;
    
    function success(data) {
      var image = document.getElementById('main-media'),
        src = me.captureFile ? data : "data:image/jpeg;base64," + data;
      image.src = src;
      me.uploadToVk(src);
    }

    function fail(err) { console.log(err); }
    
    if (navigator.camera) {
      navigator.camera.getPicture(success, fail, {
        destinationType: this.captureFile ? navigator.camera.DestinationType.FILE_URI : navigator.camera.DestinationType.DATA_URL,
        quality: 40,
        sourceType: navigator.camera.PictureSourceType.CAMERA,
        mediaType: navigator.camera.MediaType.PICTURE,
        correctOrientation: true,
        cameraDirection: navigator.camera.Direction.Front,
    //    allowEdit: true,
        encodingType: navigator.camera.EncodingType.JPEG,
        targetWidth: 800,
        targetHeight: 800,
        saveToPhotoAlbum: false
      });
    }
  },
  
  initError: function () {
    'use strict';
    var old = window.onerror;
    window.onerror = function (x) {
      console.log(x);
      old(arguments);
    };
  },
  
  vkApi: function (method, params, cb) {
    'use strict';
    console.log('This: ' + this);
    params = params || {};
    params.access_token = this.vk.token;
    params.v = this.vk.ver;
    console.log('VK call ' + method + ' ? ' + JSON.stringify(params));
    return $.getJSON('https://api.vk.com/method/' + method + '?' + $.param(params), cb);
  },
  
  loginVk: function () {
    'use strict';
    this.vk.token = this.getParameterByName('access_token');
    this.vk.userId = this.getParameterByName('user_id');
    
    if (!this.vk.token) {
      window.location.replace('https://oauth.vk.com/authorize?client_id=4383863&scope=8196&redirect_uri=' +
                              window.location.origin + '&display=mobile&v=5.22&response_type=token');
      return false;
    } else {
      location.hash = '';
      
      VK.init({
        apiId: this.vk.apiId
      });
      
      return true;
    }
  },
  
  main_old: function () {
    'use strict';

    Webcam.attach('#main-video');

  }
};