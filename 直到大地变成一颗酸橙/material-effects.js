import {effectControls} from './shader-math.js';
import {FrameCache} from './frame-cache.js';
// UI-Fx-Common and DisturbSheet math from the native pixel programs.
export class MaterialEffects {
  constructor(images){
    this.images=images;this.cache=new Map();this.steppedCache=new FrameCache();this.ids=new WeakMap();this.nextId=1;this.canvas=document.createElement('canvas');
    this.canvas.width=1536;this.canvas.height=1024;
    const gl=this.gl=this.canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
    if(!gl)throw Error('材质效果需要 WebGL2');
    const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const p=this.program=gl.createProgram();
    gl.attachShader(p,compile(gl.VERTEX_SHADER,`#version 300 es
      in vec2 position;out vec2 uv;void main(){uv=vec2(position.x*.5+.5,.5-position.y*.5);gl_Position=vec4(position,0,1);}`));
    gl.attachShader(p,compile(gl.FRAGMENT_SHADER,`#version 300 es
      precision highp float;in vec2 uv;out vec4 color;
      uniform sampler2D base,noise,mask1,mask2;
      uniform vec4 noiseST,maskST1,maskST2;
      uniform vec2 intensity,threshold,smoothness,invert,enabled;
      uniform vec3 noiseFrame;
      uniform vec3 warpMode;
      uniform vec2 maskWarp;
      vec2 imageUV(vec2 p){return vec2(p.x,1.-p.y);}
      float dissolve(sampler2D tex,vec2 at,float t,float s,float inv){
        vec4 m=texture(tex,imageUV(fract(at)));float value=m.r*m.a;if(inv>.5)value=1.-value;
        return smoothstep(t,t+max(.000001,s),value);
      }
      void main(){vec2 nativeUV=imageUV(uv),noiseUV=nativeUV*noiseST.xy+noiseST.zw;
        if(warpMode.x>.5)noiseUV=(noiseUV+vec2(mod(noiseFrame.z,noiseFrame.x),noiseFrame.y-1.-floor(noiseFrame.z/noiseFrame.x)))/noiseFrame.xy;
        float n=texture(noise,imageUV(fract(noiseUV))).r;
        float displacement=warpMode.x>.5?(n-.5)*.2:(warpMode.y>.5?n*2.-1.:n);
        vec2 warped=nativeUV+displacement*intensity*warpMode.z;
        color=texture(base,clamp(imageUV(warped),0.,1.));
        if(enabled.x>.5)color.a*=dissolve(mask1,mix(nativeUV,warped,maskWarp.x)*maskST1.xy+maskST1.zw,threshold.x,smoothness.x,invert.x);
        if(enabled.y>.5)color.a*=dissolve(mask2,mix(nativeUV,warped,maskWarp.y)*maskST2.xy+maskST2.zw,threshold.y,smoothness.y,invert.y);
      }`));
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    this.locations={};for(const name of ['base','noise','mask1','mask2','noiseST','maskST1','maskST2','intensity','threshold','smoothness','invert','enabled','noiseFrame','warpMode','maskWarp'])this.locations[name]=gl.getUniformLocation(p,name);
  }
  id(object){let id=this.ids.get(object);if(!id){id=this.nextId++;this.ids.set(object,id);}return id;}
  async prepare(nodes,materials){
    let batchStart=performance.now();
    for(const node of nodes){
      const mat=materials[node.graphic?.material],img=this.images[node.graphic?.image];
      if(!img||!mat?.textures._DisturbTex?.image)continue;
      const count=(mat.floats._Column||1)*(mat.floats._Row||1),fps=mat.floats._FPS||0;
      // Prewarm only small finite atlas cycles; continuously scrolling materials
      // still run every frame. Large textures remain on the bounded lazy path.
      if(!fps||count>16||img.width*img.height*count*4>1024*1024)continue;
      for(let frame=0;frame<count;frame++){
        this.draw(img,mat,node.p,(frame+.25)/fps);
        if(performance.now()-batchStart>8){await new Promise(requestAnimationFrame);batchStart=performance.now();}
      }
    }
  }
  bind(img,index,name){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+index);let tex=this.cache.get(img);
    if(!tex){tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);this.cache.set(img,tex);}else gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.uniform1i(this.locations[name],index);
  }
  draw(img,mat,props,time){
    const gl=this.gl,textures=mat.textures,offsets={},overrides={};let f=mat.floats,hasOverrides=false;
    const atlas=!!textures._DisturbTex?.image;
    for(const value of Object.values(props))if(value?.enable&&value.name){if('floatValue' in value){if(!hasOverrides){f={...f};hasOverrides=true;}f[value.name]=overrides[value.name]=value.floatValue;}else if(value.offset)offsets[value.name]=value;}
    const frame=atlas?Math.floor(time*(f._FPS||0))%((f._Column||1)*(f._Row||1)):0;
    const controls=effectControls(f,props.m_Color);
    // Alpha is applied by the destination Canvas; it is not part of the shader
    // output and must not create a new cached texture on every fade frame.
    const signature=atlas?JSON.stringify([this.id(img),this.id(mat),frame,overrides,offsets,controls]):'';
    if(atlas){const memo=this.steppedCache.get(signature);if(memo)return memo;}
    const width=Math.min(1536,img.width),height=Math.min(1024,img.height);
    // A fixed backing buffer avoids reallocating the GPU surface for every
    // differently sized sprite. Render/copy only its top-left rectangle.
    gl.viewport(0,this.canvas.height-height,width,height);gl.enable(gl.SCISSOR_TEST);gl.scissor(0,this.canvas.height-height,width,height);gl.useProgram(this.program);this.bind(img,0,'base');
    const specs=[[atlas?'_DisturbTex':'_Distortion_Tex','noise','noiseST'],['_Dissolve1_Tex','mask1','maskST1'],['_Dissolve2_Tex','mask2','maskST2']];
    specs.forEach(([key,name,st],i)=>{const t=textures[key],p=offsets[key];this.bind(this.images[t?.image]||img,i+1,name);const scale=p?.tiling||t?.m_Scale||{x:1,y:1},o=p?.offset||t?.m_Offset||{x:0,y:0};gl.uniform4f(this.locations[st],scale.x,scale.y,o.x+(key==='_Distortion_Tex'?f._Distortion_SpeedU||0:0)*time,o.y+(key==='_Distortion_Tex'?f._Distortion_SpeedV||0:0)*time);});
    const uni=(k,a,b)=>gl.uniform2f(this.locations[k],a||0,b||0);
    const cols=atlas?f._Column||1:1,rows=atlas?f._Row||1:1;
    gl.uniform3f(this.locations.noiseFrame,cols,rows,frame);
    gl.uniform3f(this.locations.warpMode,atlas?1:0,f._Distortion_Dir||0,atlas?1:controls.strength);
    uni('maskWarp',f._Dissolve1_Distortion,f._Dissolve2_Distortion);
    uni('intensity',atlas?f._DisturbIntensity:f._Distortion?f._Distortion_IntensityU:0,atlas?f._DisturbIntensity:f._Distortion?f._Distortion_IntensityV:0);
    uni('enabled',f._Dissolve&&textures._Dissolve1_Tex?.image?1:0,f._Dissolve&&textures._Dissolve2_Tex?.image?1:0);
    uni('threshold',controls.threshold1,controls.threshold2);
    uni('smoothness',f._Dissolve1_Smoothness,f._Dissolve2_Smoothness);uni('invert',f._Dissolve1_Invert,f._Dissolve2_Invert);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
    if(atlas){const cv=document.createElement('canvas');cv.width=width;cv.height=height;cv.getContext('2d').drawImage(this.canvas,0,0,width,height,0,0,width,height);const memo={canvas:cv,width,height};this.steppedCache.set(signature,memo,width*height*4);return memo;}
    return {canvas:this.canvas,width,height};
  }
}
