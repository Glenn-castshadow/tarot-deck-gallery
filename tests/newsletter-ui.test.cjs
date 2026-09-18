const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function boot({state={signedIn:false,email:null,newsletter:false}, saved=null, ok=true, profile=null}={}) {
  const nodes=new Map(), memory=new Map(saved ? [['arcana-newsletter-subscribed-v1',saved]] : []);
  let listener, calls=0, signArg;
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector,{hidden:false,disabled:false,value:'reader@example.com',checked:true,textContent:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},checkValidity(){return true;},setCustomValidity(){},focus(){document.activeElement=this;},contains(el){return el===node('#newsletter-join');}});
    return nodes.get(selector);
  }
  const document={querySelector:node,activeElement:node('#newsletter-join')};
  const account={state:()=>({...state}),onChange(fn){listener=fn;},async setNewsletter(value,sign){calls++;signArg=sign;if(!ok)return {ok:false,message:'Try again.'};state={...state,newsletter:value};listener(state);return {ok:true};}};
  const bodies=[]; let loaded;
  const win={IshtarAccount:account,IshtarStorage:{getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)},addEventListener:(type,fn)=>{if(type==='load')loaded=fn;},BirthProfile:profile?{subscribe(fn){fn(profile);}}:undefined};
  vm.runInNewContext(fs.readFileSync(require.resolve('../newsletter.js'),'utf8'),{window:win,document,AbortSignal,fetch:async(url,init)=>{calls++;bodies.push(JSON.parse(init.body));return {ok,status:ok?200:500};}});
  return {nodes,memory,document,bodies,load:()=>loaded&&loaded(),get calls(){return calls;},get signArg(){return signArg;},submit:()=>node('#newsletter-form').handlers.submit({preventDefault(){}}),change(next){state=next;listener(state);}};
}

test('existing subscribed account hides and disables signup without a write',()=>{
  const b=boot({state:{signedIn:true,email:'reader@example.com',newsletter:true}});
  assert.equal(b.nodes.get('.newsletter-signup').hidden,true);
  assert.equal(b.nodes.get('.newsletter-signup').disabled,true);
  assert.equal(b.calls,0);
});
test('confirmed guest signup hides form, keeps confirmation visible and remembers only a flag',async()=>{
  const b=boot(); await b.submit();
  assert.equal(b.nodes.get('.newsletter-signup').hidden,true);
  assert.equal(b.nodes.get('#newsletter-status').hidden,false);
  assert.match(b.nodes.get('#newsletter-status').textContent,/Thank you/);
  assert.equal(b.memory.get('arcana-newsletter-subscribed-v1'),'1');
  assert.equal(b.document.activeElement,b.nodes.get('.birthday-button'));
  assert.equal(boot({saved:'1'}).nodes.get('.newsletter-signup').hidden,true);
});
test('failure or missing permission keeps the signup available and does not remember success',async()=>{
  const failure=boot({ok:false});await failure.submit();
  assert.equal(failure.nodes.get('.newsletter-signup').hidden,false);
  assert.equal(failure.memory.size,0);
  const consent=boot();consent.nodes.get('#newsletter-consent').checked=false;await consent.submit();
  assert.equal(consent.calls,0);
  assert.equal(consent.nodes.get('.newsletter-signup').hidden,false);
});
test('account subscription and unsubscription update visibility; signout does not inherit it',async()=>{
  const b=boot({state:{signedIn:true,email:'reader@example.com',newsletter:false}});
  await b.submit();
  assert.equal(b.nodes.get('.newsletter-signup').hidden,true);
  assert.equal(b.memory.size,0);
  b.change({signedIn:true,email:'reader@example.com',newsletter:false});
  assert.equal(b.nodes.get('.newsletter-signup').hidden,false);
  b.change({signedIn:true,email:'reader@example.com',newsletter:true});
  b.change({signedIn:false,email:null,newsletter:false});
  assert.equal(b.nodes.get('.newsletter-signup').hidden,false);
});
test('an unsubscribed account overrides and clears an old guest flag',()=>{
  const b=boot({saved:'1'});
  b.change({signedIn:true,email:'reader@example.com',newsletter:false});
  assert.equal(b.nodes.get('.newsletter-signup').hidden,false);
  assert.equal(b.memory.get('arcana-newsletter-subscribed-v1'),'0');
  b.change({signedIn:false,email:null,newsletter:false});
  assert.equal(b.nodes.get('.newsletter-signup').hidden,false);
});
test('a blank sign is left out of the payload and consent version is v2',async()=>{
  const b=boot(); b.document.querySelector('#newsletter-sign').value='';
  await b.submit();
  assert.deepEqual(b.bodies[0],{email:'reader@example.com',consent:true,consentVersion:'2026-09-18-v2'});
});
test('a chosen sign is sent as sunSign',async()=>{
  const b=boot(); b.document.querySelector('#newsletter-sign').value='leo';
  await b.submit();
  assert.equal(b.bodies[0].sunSign,'leo');
});
test('a signed-in member subscribing passes the sign to the account call',async()=>{
  const b=boot({state:{signedIn:true,email:'reader@example.com',newsletter:false}}); b.document.querySelector('#newsletter-sign').value='pisces';
  await b.submit();
  assert.equal(b.signArg,'pisces');
});
test('a ready natal chart presets a blank select on load and never overwrites a choice',()=>{
  const profile={natal:{status:'ready',points:[{index:4}]}};
  const blank=boot({profile}); blank.document.querySelector('#newsletter-sign').value=''; blank.load();
  assert.equal(blank.document.querySelector('#newsletter-sign').value,'leo');
  const chosen=boot({profile}); chosen.document.querySelector('#newsletter-sign').value='aries'; chosen.load();
  assert.equal(chosen.document.querySelector('#newsletter-sign').value,'aries');
  const none=boot(); none.document.querySelector('#newsletter-sign').value=''; none.load();
  assert.equal(none.document.querySelector('#newsletter-sign').value,'');
});
test('success tells the reader a confirmation email is coming',async()=>{
  const b=boot(); b.document.querySelector('#newsletter-sign').value=''; await b.submit();
  assert.match(b.nodes.get('#newsletter-status').textContent,/confirm/i);
});
