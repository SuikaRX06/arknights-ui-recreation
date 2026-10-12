// Restore only the lower-left white EX snowflake emitter's pre-curl motion.
// This must not select the blue/pink decals or the second white emitter.
export const usesPreviousExSnowMotion=(node,material)=>
  node.id==='-4282326456804843528'&&
  node.path==='image_background_1/background_holder/parti_flower/flower_01'&&
  material?.name==='parti_flower_01';
