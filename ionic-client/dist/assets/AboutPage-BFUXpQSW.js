import{d as c,r as s,m,C as p,D as d,t as o,y as v,h as i}from"./index-CGiz-dex.js";const b=c({__name:"AboutPage",setup(l){const t=s(0),e=s(0),n=s(0),u=()=>{n.value=t.value+e.value};return(f,a)=>(i(),m("div",null,[p(o("input",{"onUpdate:modelValue":a[0]||(a[0]=r=>t.value=r),type:"number",placeholder:"Enter a number"},null,512),[[d,t.value]]),p(o("input",{"onUpdate:modelValue":a[1]||(a[1]=r=>e.value=r),type:"number",placeholder:"Enter another number"},null,512),[[d,e.value]]),o("button",{onClick:u},"Add"),o("p",null,"Result: "+v(n.value),1)]))}}),_=(l,t)=>{const e=l.__vccOpts||l;for(const[n,u]of t)e[n]=u;return e},g=_(b,[["__scopeId","data-v-901f8c47"]]);export{g as default};
