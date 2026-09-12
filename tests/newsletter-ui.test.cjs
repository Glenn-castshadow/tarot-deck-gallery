const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function boot({state={signedIn:false,email:null,newsletter:false}, saved=null, ok=true}={}) {
  const nodes=new Map(), memory=new Map(saved ? [['arcana-newsletter-subscribed-v1',saved]] : []);
  let listener, calls=0;
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector,{hidden:false,disabled:false,value:'reader@example.com',checked:true,textContent:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},checkValidity(){return true;},setCustomValidity(){},focus(){document.activeElement=this;},contains(el){return el===node('#newsletter-join');}});
    return nodes.get(selector);
  }
  const document={querySelector:node,activeElement:node('#newsletter-join')};
  const account={state:()=>({...state}),onChange(fn){listener=fn;},async setNewsletter(value){calls++;if(!ok)return {ok:false,message:'Try again.'};state={...state,newsletter:value};listener(state);return {ok:true};}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../newsletter.js'),'utf8'),{window:{IshtarAccount:account,IshtarStorage:{getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)}},document,AbortSignal,fetch:async()=>{calls++;return {ok,status:ok?200:500};}});
  return {nodes,memory,document,get calls(){return calls;},submit:()=>node('#newsletter-form').handlers.submit({preventDefault(){}}),change(next){state=next;listener(state);}};
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
