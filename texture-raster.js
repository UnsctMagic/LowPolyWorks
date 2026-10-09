// Warcraft custom textures can use uncompressed or RLE true-colour TGA.
export function decodeTga(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),type=bytes[2],width=view.getUint16(12,true),height=view.getUint16(14,true),depth=bytes[16],channels=depth/8;
 if(bytes[1]!==0||![2,10].includes(type)||![24,32].includes(depth)||!width||!height||width>4096||height>4096)throw Error('Unsupported TGA texture. Use a 24-bit or 32-bit true-colour TGA.');
 const pixels=new Uint8ClampedArray(width*height*4);let offset=18+bytes[0],pixel=0;
 const read=()=>{if(offset+channels>bytes.length)throw Error('Truncated TGA texture.');const colour=[bytes[offset+2],bytes[offset+1],bytes[offset],channels===4?bytes[offset+3]:255];offset+=channels;return colour;};
 const write=colour=>{if(pixel>=width*height)throw Error('Invalid TGA pixel count.');const x=bytes[17]&16?width-1-pixel%width:pixel%width,y=bytes[17]&32?Math.floor(pixel/width):height-1-Math.floor(pixel/width);pixels.set(colour,(y*width+x)*4);pixel++;};
 while(pixel<width*height){if(type===2){write(read());continue;}if(offset>=bytes.length)throw Error('Truncated TGA texture.');const packet=bytes[offset++],count=(packet&127)+1;if(packet&128){const colour=read();for(let i=0;i<count;i++)write(colour);}else for(let i=0;i<count;i++)write(read());}
 return new ImageData(pixels,width,height);
}
