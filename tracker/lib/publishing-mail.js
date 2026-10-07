export function mailConfigured(env=process.env){return Boolean(env.RESEND_API_KEY&&env.MODEL_MAIL_FROM);}
export async function sendEmail(message,key,env=process.env){
 if(!mailConfigured(env))throw Error('Model notification delivery is not configured.');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:env.MODEL_MAIL_FROM,...message}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Email delivery returned HTTP '+response.status);
 return (await response.json()).id;
}
