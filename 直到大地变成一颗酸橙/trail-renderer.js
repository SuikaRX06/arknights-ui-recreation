import {curve,colorAt} from './particle-math.js';

// One connected ribbon: no round caps or alpha overlap at segment boundaries.
export function trailRibbon(positionAt,age,tail,trail,size,color,r=.5,scale=100,life=1){
  if(tail<=0)return [];
  const points=[];
  const point=u=>({u,p:positionAt(age-tail*u)});
  function split(a,b,depth){
    const m=point((a.u+b.u)/2),dx=b.p[0]-a.p[0],dy=b.p[1]-a.p[1];
    const error=Math.hypot(m.p[0]-(a.p[0]+b.p[0])/2,m.p[1]-(a.p[1]+b.p[1])/2)*scale;
    if(depth<9&&(error>.25||Math.hypot(dx,dy)*scale>12)){split(a,m,depth+1);split(m,b,depth+1);}else points.push(a);
  }
  split(point(0),point(1),0);points.push(point(1));
  const lifetime=colorAt(trail.colorOverLifetime,age/life,r),vertices=new Float32Array((points.length-1)*48);
  const sides=new Float64Array(points.length*16);
  for(let i=0;i<points.length;i++){
    const p=points[i];
    const a=points[Math.max(0,i-1)].p,b=points[Math.min(points.length-1,i+1)].p;
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
    const half=Math.max(0,curve(trail.widthOverTrail,p.u,r))*(trail.sizeAffectsWidth?size:1)/2;
    const gradient=colorAt(trail.colorOverTrail,p.u,r);
    const cr=gradient.r*lifetime.r*(trail.inheritParticleColor?color.r:1),cg=gradient.g*lifetime.g*(trail.inheritParticleColor?color.g:1),cb=gradient.b*lifetime.b*(trail.inheritParticleColor?color.b:1),ca=gradient.a*lifetime.a*(trail.inheritParticleColor?color.a:1);
    const nx=dy/length*half,ny=dx/length*half;
    for(let side=0;side<2;side++){
      const j=i*16+side*8,sign=side*2-1;
      sides[j]=p.p[0]-nx*sign;sides[j+1]=-p.p[1]-ny*sign;sides[j+2]=p.u;sides[j+3]=side;
      sides[j+4]=cr;sides[j+5]=cg;sides[j+6]=cb;sides[j+7]=ca;
    }
  }
  let cursor=0;
  const append=offset=>{for(let k=0;k<8;k++)vertices[cursor++]=sides[offset+k];};
  for(let i=1;i<points.length;i++){
    const a=(i-1)*16,b=i*16;append(a);append(a+8);append(b);append(b);append(a+8);append(b+8);
  }
  return vertices;
}

export class TrailRenderer{
  constructor(images){
    this.images=images;this.textures=new Map();this.canvas=document.createElement('canvas');
    const gl=this.gl=this.canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true,antialias:true});
    if(!gl)throw Error('公路尾迹需要 WebGL2');
    const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
    const program=this.program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,`#version 300 es
      in vec2 position;in vec2 texcoord;in vec4 tint;uniform mat3 transform;uniform vec2 viewport;
      out vec2 uv;out vec4 color;void main(){vec3 p=transform*vec3(position,1.);gl_Position=vec4(p.x/viewport.x*2.-1.,1.-p.y/viewport.y*2.,0,1);uv=texcoord;color=tint;}`));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`#version 300 es
      precision highp float;in vec2 uv;in vec4 color;uniform sampler2D mask;uniform vec4 maskST;uniform vec3 dissolve;out vec4 frag;
      void main(){vec2 at=fract(uv*maskST.xy+maskST.zw);vec4 m=texture(mask,vec2(at.x,1.-at.y));float value=m.r*m.a;
      if(dissolve.z>.5)value=1.-value;float alpha=color.a*smoothstep(dissolve.x,dissolve.x+max(.000001,dissolve.y),value);
      frag=vec4(color.rgb*alpha,alpha);}`));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    for(const [name,size,offset] of [['position',2,0],['texcoord',2,8],['tint',4,16]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);}
    this.uniforms=Object.fromEntries(['transform','viewport','mask','maskST','dissolve'].map(k=>[k,gl.getUniformLocation(program,k)]));
  }
  draw(ctx,ribbons,mat,w,h){
    const count=ribbons.reduce((total,ribbon)=>total+ribbon.length,0);if(!count)return;
    const gl=this.gl,cv=this.canvas,texture=mat.textures._Dissolve1_Tex,image=this.images[texture.image];
    if(!image)return;
    if(cv.width!==ctx.canvas.width||cv.height!==ctx.canvas.height){cv.width=ctx.canvas.width;cv.height=ctx.canvas.height;}
    gl.viewport(0,0,cv.width,cv.height);gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    if(!this.vertices||this.vertices.length<count){this.vertices=new Float32Array(2**Math.ceil(Math.log2(count)));gl.bufferData(gl.ARRAY_BUFFER,this.vertices.byteLength,gl.DYNAMIC_DRAW);}
    let offset=0;for(const ribbon of ribbons){this.vertices.set(ribbon,offset);offset+=ribbon.length;}
    gl.bufferSubData(gl.ARRAY_BUFFER,0,this.vertices,0,count);
    let tex=this.textures.get(image);if(!tex){tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);this.textures.set(image,tex);}else gl.bindTexture(gl.TEXTURE_2D,tex);
    const m=ctx.getTransform(),u=this.uniforms,f=mat.floats;
    gl.uniformMatrix3fv(u.transform,false,[m.a,m.b,0,m.c,m.d,0,m.e+m.a*w/2+m.c*h/2,m.f+m.b*w/2+m.d*h/2,1]);
    gl.uniform2f(u.viewport,cv.width,cv.height);gl.uniform1i(u.mask,0);
    gl.uniform4f(u.maskST,texture.m_Scale.x,texture.m_Scale.y,texture.m_Offset.x,texture.m_Offset.y);
    gl.uniform3f(u.dissolve,f._Dissolve1_Threshold,f._Dissolve1_Smoothness,f._Dissolve1_Invert);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,count/8);
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(cv,0,0);ctx.restore();
  }
}
