'use strict';
const  file1=document.querySelector('#file1'),
  canvasMain = document.querySelector('#canvasMain'),
  canvasCrop=document.querySelector('#canvasCrop'),
  imgAdjust=document.querySelector('#imgAdjust'),
  btnCrop=document.querySelector('#btnCrop'),
  title=document.querySelector('#title'),
  checkCoordinate=document.querySelector('#checkCoordinate'),
  checkUnsharpMask=document.querySelector('#checkUnsharpMask'),
  variant_text=document.querySelector('#variant_text'),
  variant=document.querySelector('#variant'),
  innerBorder=document.querySelector('#innerBorder'),
  innerBorder_text=document.querySelector('#innerBorder_text'),
  container=document.querySelector('.container'),
  ctxMain = canvasMain.getContext('2d'); 
let px1,px2,px3,px4,py1,py2,py3,py4;
let pw,ph,pw1,pw2,ph1,ph2;
let srcCorners,dstCorners;
let tolerance=10;
let fxCanvas = null;
let texture = null;


file1.addEventListener('change',function(){
  let file, img;
  if ((file = this.files[0])) {
    console.log(file);
    img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {     
      imgAdjust.style.display='inline-block';
      btnCrop.disabled=false;
      fxCanvas = fx.canvas();
      btnCrop.click();
    };
    img.src = URL.createObjectURL(file); 
    imgAdjust.setAttribute('src',URL.createObjectURL(file));   
  }
})

btnCrop.addEventListener('click',function(){
  title.innerHTML='Please wait...';
  let image=  new Image();
  let canvas=document.createElement('canvas');
  let ctx=canvas.getContext('2d');
  image.onload = function () {  
    canvas.width =image.width;
    canvas.height=image.height;
    //* - canny.min.js  -- too slow compare to jsfeat
      // ctx.drawImage(image, 0, 0,canvas.width,canvas.height);
      // gaussianBlur(canvas, 5,5);
      // let maps = gradient(canvas, 'sobel');
      // nonMaximumSuppress(canvas, maps.dirMap, maps.gradMap);
      // hysteresis(canvas,255);
    //* - canny.min.js
    //* - jsfeat
      let gui,options;
      let img_u8;
      img_u8 = new jsfeat.matrix_t(canvas.width,canvas.height, jsfeat.U8C1_t);
      let optimum_option = function(){
        this.blur_radius = 4;
        this.low_threshold = 30;
        this.high_threshold = 112;
      }
      options = new optimum_option();
      ctx.drawImage(image, 0, 0,canvas.width,canvas.height);
      let imageData = ctx.getImageData( 0, 0,canvas.width,canvas.height);
      jsfeat.imgproc.grayscale(imageData.data, canvas.width,canvas.height, img_u8);
      let r = options.blur_radius|0;
      let kernel_size = (r+1) << 1;
      jsfeat.imgproc.gaussian_blur(img_u8, img_u8, kernel_size, 0);
      jsfeat.imgproc.canny(img_u8, img_u8, options.low_threshold|0, options.high_threshold|0);
      // render result back to canvas
      let data_u32 = new Uint32Array(imageData.data.buffer);
      let alpha = (0xff << 24);
      let i = img_u8.cols*img_u8.rows, pix = 0;
      while(--i >= 0) {
        pix = img_u8.data[i];
        data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
      }
      ctx.putImageData(imageData, 0, 0);
    //* - jsfeat
    let img=  new Image();
    img.onload=function(){
      getCorners(img)
      .then(perspectiveTransform(srcCorners,dstCorners))
    }
    img.src=canvas.toDataURL();
  }
  image.src=imgAdjust.src;
  title.innerHTML='Auto Cropping';
});

function getCorners(canvas){
  return new Promise(function(res, rej){
    let imgWidth=canvas.width;
    let imgHeight=canvas.height;
    canvasMain.width=imgWidth;
    canvasMain.height=imgHeight;
    ctxMain.drawImage(canvas,0,0,imgWidth,imgHeight);
    let image=ctxMain.getImageData(0,0,imgWidth,imgHeight);
    cornerDetect(image.data,imgWidth,imgHeight,tolerance);
    res(displayCorners());
  })
}

function cornerDetect(data,imgWidth,imgHeight,tolerance){
  let obj=fast.getFourCorners(data,imgWidth,imgHeight,tolerance); 
  console.log(obj)
  px1=obj[0];
  py1=obj[1];
  px2=obj[2];
  py2=obj[3];
  px3=obj[4];
  py3=obj[5];
  px4=obj[6];
  py4=obj[7];  
  srcCorners = [px1,py1,px2,py2,px3,py3,px4,py4];
  pw1=Math.round(distance(px1,py1,px2,py2));
  ph1=Math.round(distance(px1,py1,px4,py4));
  pw2=Math.round(distance(px3,py3,px4,py4));
  ph2=Math.round(distance(px2,py2,px3,py3));
  // set crop image width/height  ** not accurate setting
  pw=Math.round((pw1+pw2)/2);
  ph=Math.round((ph1+ph2)/2);
  dstCorners = [px1,py1, px1+pw,py1,px1+pw,py1+ph,px1,py1+ph];
}

function displayCorners(){
  ctxMain.drawImage(imgAdjust,0,0);
  ctxMain.font = 'italic 18px Arial';
  ctxMain.textAlign = 'center';
  ctxMain. textBaseline = 'middle';
  ctxMain.fillStyle = 'white';  
  ctxMain.strokeStyle = 'rgba(255,0,0,0.7)';
  ctxMain.lineWidth = 2;
  ctxMain.beginPath();
  ctxMain.moveTo(px1,py1);
  ctxMain.lineTo(px2,py2);
  ctxMain.lineTo(px3,py3);
  ctxMain.lineTo(px4,py4);
  ctxMain.closePath();
  ctxMain.stroke();
  ctxMain.strokeStyle = 'rgba(255,230,0,0.7)';//"#FFff00";
  if (checkCoordinate.checked===true) {
    ctxMain.fillText('('+px1+','+py1+')', px1,py1);
    ctxMain.fillText('('+px2+','+py2+')', px2,py2);
    ctxMain.fillText('('+px3+','+py3+')', px3,py3);
    ctxMain.fillText('('+px4+','+py4+')', px4,py4);
  }
  else {
    ctxMain.beginPath();
    ctxMain.arc(px1, py1, 5, 0, 2 * Math.PI);
    ctxMain.stroke();
    ctxMain.beginPath();
    ctxMain.arc(px2, py2, 5, 0, 2 * Math.PI);
    ctxMain.stroke();
    ctxMain.beginPath();
    ctxMain.arc(px4, py4, 5, 0, 2 * Math.PI);
    ctxMain.stroke();
    ctxMain.beginPath();
    ctxMain.arc(px3, py3, 5, 0, 2 * Math.PI);
    ctxMain.stroke();
  }
  canvasMain.style.display='inline-block';
  title.innerHTML='Auto Cropping';
}

function perspectiveTransform(before,after){
  return new Promise(function(res, rej){
    let canvas=document.createElement('canvas');
    let ctx=canvas.getContext('2d');
    canvas.width=imgAdjust.width;
    canvas.height=imgAdjust.height;
    if(imgAdjust.width>imgAdjust.height){
      canvas.width=imgAdjust.width;
      canvas.height=imgAdjust.width;
    } 
    ctx.drawImage(imgAdjust,0,0);
    texture = fxCanvas.texture(canvas);
    fxCanvas.draw(texture)
    fxCanvas.perspective([before[0],before[1],before[2],before[3],before[4],before[5],before[6],before[7]],[after[0],after[1],after[2],after[3],after[4],after[5],after[6],after[7]])
    if(checkUnsharpMask.checked===true) fxCanvas.unsharpMask(3,0.45)
    fxCanvas.update();
    window.texture = texture;
    window.fxCanvas = fxCanvas;
    let img = new Image();
    img.onload = function(){
      canvasCrop.width =after[2]-after[0];
      canvasCrop.height = after[7]-after[1];
      canvasCrop.getContext('2d').drawImage(img,-before[0],-before[1]);
      texture.destroy();
      res(img)
    };
    img.onerror = rej;
    img.src = fxCanvas.toDataURL();
  })
}

function distance(x0, y0, x1, y1) {
  let dx = x1 - x0;
  let dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy);
}

// fxCanvas function from https://github.com/evanw/glfx.js
// fast.getFourCorners from detectCorner.min.js
// cannyEdge  gaussianBlur,gradient,nonMaximumSuppress,hysteresis  from canny.min.js
// fast cannyEdge detection from jsfeat