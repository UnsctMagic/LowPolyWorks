export function browserVisitorId(){
 const key='lowpolyworks.visitorId';let id=localStorage.getItem(key);
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id||'')){id=crypto.randomUUID();localStorage.setItem(key,id);}
 return id;
}
