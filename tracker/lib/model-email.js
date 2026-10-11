const origin='https://www.lowpolyworks.com';
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function modelEmail(work,unsubscribe){
 const reason=work.kind==='model-upload'?'A new model is available.':'A model you follow has been updated.';
 const image=work.model.imageUrl||origin+'/thumbs/unit-'+encodeURIComponent(work.modelId)+'.png';
 const test=work.test?'This is a test email. No model files have changed.':'';
 const footer='You checked Update me for model updates and new uploads.';
 return {
  subject:(work.kind==='model-upload'?'New model: ':'Model update: ')+work.model.name,
  text:[work.model.name,reason,test,work.model.url,footer,'Unsubscribe from all model emails: '+unsubscribe].filter(Boolean).join('\n\n'),
  html:`<!doctype html><html><body style="margin:0;background:#141219;color:#f4eff8;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#211b29;border:1px solid #44344f;border-radius:12px"><tr><td style="padding:28px"><p style="color:#d7bd79;font-size:14px;letter-spacing:2px;margin:0 0 20px">LOWPOLYWORKS</p>${test?'<p style="color:#c8b6d9;font-size:13px">'+escape(test)+'</p>':''}<h1 style="font-size:26px;line-height:1.3;margin:0 0 12px">${escape(work.model.name)}</h1><p style="line-height:1.6">${reason}</p><a href="${escape(work.model.url)}"><img src="${escape(image)}" alt="${escape(work.model.name)}" width="480" style="display:block;width:100%;max-width:480px;height:auto;border:0;background:#141219;border-radius:8px"></a><p style="margin:24px 0"><a href="${escape(work.model.url)}" style="display:inline-block;background:#d7bd79;color:#211b29;padding:13px 22px;border-radius:6px;text-decoration:none;font-weight:bold">View model</a></p><p style="font-size:12px;color:#c8b6d9;line-height:1.6">${footer}<br><a href="${escape(unsubscribe)}" style="color:#c8b6d9">Unsubscribe from model emails</a></p></td></tr></table></td></tr></table></body></html>`,
  headers:{'List-Unsubscribe':`<${unsubscribe}>`},
 };
}
