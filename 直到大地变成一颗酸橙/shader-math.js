// Ported from native AnimSheet / UI-Fx-Common pixel programs.
export function animSheetFrame(f,color,time){
  const cols=f._Column||1,rows=f._Row||1,count=cols*rows;
  const control=f._PropertyCtrlMode===1?Math.min(count-1,Math.floor(Math.max(0,Math.min(1,color.r))*count)):0;
  const phase=time*(f._FPS||0)+(f._Offset||0)+control;
  // Native round_ne (nearest, ties to even), followed by modulo.
  const v=((phase%count)+count)%count,lo=Math.floor(v),fraction=v-lo;
  const rounded=fraction===.5?lo+(lo%2):Math.round(v);
  return {cols,rows,index:rounded%count,row:Math.floor((rounded%count)/cols)};
}
export function dissolveAlpha(value,threshold,smoothness){
  const t=Math.max(0,Math.min(1,(value-threshold)/Math.max(.000001,smoothness)));
  return t*t*(3-2*t);
}
export function effectControls(f,color={r:1,g:1,b:1}){
  return {strength:f._RgbCtrl===1?color.r:1,
    threshold1:f._RgbCtrl===1?color.g*2-1:f._Dissolve1_Threshold,
    threshold2:f._RgbCtrl===1?color.b*2-1:f._Dissolve2_Threshold};
}
