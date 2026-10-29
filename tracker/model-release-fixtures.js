export function mdx(payload='geometry',{name='Model',textures=[]}={}){
 const chunk=(tag,bytes)=>{const header=Buffer.alloc(8);header.write(tag);header.writeUInt32LE(bytes.length,4);return Buffer.concat([header,bytes]);};
 const model=Buffer.alloc(372);model.write(name,0,80);
 const refs=Buffer.alloc(textures.length*268);textures.forEach((ref,index)=>refs.write(ref,index*268+4,260));
 return Buffer.concat([Buffer.from('MDLX'),chunk('MODL',model),chunk('TEXS',refs),chunk('TEST',Buffer.from(payload))]);
}
