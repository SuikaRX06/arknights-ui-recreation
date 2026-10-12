// Native 473-vertex / 840-triangle UI mesh, with the material's UV scroll.
export class RoadRenderer {
  constructor(mesh,image){
    this.canvas=document.createElement('canvas');this.canvas.width=1536;this.canvas.height=768;
    const gl=this.gl=this.canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:true,preserveDrawingBuffer:true});
    if(!gl)throw new Error('当前浏览器不支持 WebGL2 公路网格');
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,`#version 300 es
      in vec2 position;in vec2 uv;out vec2 vUV;void main(){gl_Position=vec4(position,0.,1.);vUV=uv;}`));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`#version 300 es
      precision highp float;uniform sampler2D tex;uniform float time;in vec2 vUV;out vec4 color;
      void main(){color=texture(tex,vec2(vUV.x,1.-fract(vUV.y*.3+time*.5)));}`));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const xs=mesh.vertices.map(v=>v[0]),ys=mesh.vertices.map(v=>v[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
    this.aspect=(ymax-ymin)/(xmax-xmin);
    const attrib=(name,values)=>{gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);};
    attrib('position',mesh.vertices.flatMap(v=>[(v[0]-xmin)/(xmax-xmin)*2-1,(v[1]-ymin)/(ymax-ymin)*2-1]));attrib('uv',mesh.uv.flat());
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(mesh.indices),gl.STATIC_DRAW);this.count=mesh.indices.length;
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);this.time=gl.getUniformLocation(program,'time');
  }
  draw(time){const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(this.time,time);gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);return this.canvas;}
}
