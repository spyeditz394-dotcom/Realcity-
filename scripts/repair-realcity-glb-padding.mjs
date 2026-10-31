import fs from 'node:fs';
const files=['realcity-hatchback-sports.glb','realcity-taxi.glb','realcity-suv.glb','realcity-van.glb','realcity-truck.glb'];
for(const name of files){
 const path=`public/models/${name}`;let bytes=fs.readFileSync(path),offset=12,padded=0;
 if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2)throw new Error(`Not a GLB 2.0 asset: ${path}`);
 while(offset+8<=bytes.length){const len=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4),data=offset+8,pad=(4-len%4)%4;if(data+len>bytes.length)throw new Error(`Chunk extends past end of ${path}`);if(pad){const fill=Buffer.alloc(pad,type===0x4e4f534a?0x20:0);bytes=Buffer.concat([bytes.subarray(0,data+len),fill,bytes.subarray(data+len)]);bytes.writeUInt32LE(len+pad,offset);padded++;}offset=data+len+pad;}
 if(offset!==bytes.length)throw new Error(`Malformed trailing data in ${path}`);bytes.writeUInt32LE(bytes.length,8);fs.writeFileSync(path,bytes);console.log(`${name}: aligned ${padded} chunk(s)`);
}
