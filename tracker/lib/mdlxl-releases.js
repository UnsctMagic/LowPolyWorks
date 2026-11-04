// Release ZIP counts supplement install events; a published release may have no installs yet.
export async function mdlxlReleaseDownloads({fetchApi=fetch}={}){
 try{
  const response=await fetchApi('https://api.github.com/repos/UnsctMagic/MDLxL/releases?per_page=100',{cache:'no-store',headers:{Accept:'application/vnd.github+json','User-Agent':'LowPolyWorks-Vault'},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('GitHub HTTP '+response.status);
  const releases=await response.json();
  return releases.filter(r=>!r.draft&&/^v?\d+\.\d+\.\d+$/.test(r.tag_name)).map(release=>{
   const version=release.tag_name.replace(/^v/,'');
   return [version,release.assets.filter(asset=>asset.name==='MDLxL-win32-x64.zip'||asset.name===`MDLxL-${version}-win32-x64.zip`).reduce((sum,asset)=>sum+asset.download_count,0)];
  });
 }catch(error){console.warn('MDLxL release counts unavailable',error.message);return null;}
}
