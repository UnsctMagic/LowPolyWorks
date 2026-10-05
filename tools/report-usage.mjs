import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const config=JSON.parse(await fs.readFile(fileURLToPath(new URL('../.internal/usage-reader.json',import.meta.url)),'utf8'));
const url=new URL('/api/report',config.url);
for(const argument of process.argv.slice(2)){const match=argument.match(/^--(from|to)=(\d{4}-\d{2}-\d{2})$/);if(!match)throw Error('Use --from=YYYY-MM-DD or --to=YYYY-MM-DD');url.searchParams.set(match[1],match[2]);}
const response=await fetch(url,{headers:{Authorization:'Bearer '+config.token}});
if(!response.ok)throw Error('Private usage report unavailable (HTTP '+response.status+')');
console.log(JSON.stringify(await response.json(),null,2));
