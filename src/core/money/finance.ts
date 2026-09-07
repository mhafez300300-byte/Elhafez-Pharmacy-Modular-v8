'use strict';
  const EPS=0.02;
  const n=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>Math.round((n(v)+Number.EPSILON)*100)/100;
  const clamp=(v:any,min:any,max:any)=>Math.min(max,Math.max(min,n(v)));

  function taxRate(line:any){
    const type=String(line?.taxType||'').toLowerCase();
    if(['exempt','exempted','zero','none','معفى','معفاة'].includes(type))return 0;
    return clamp(line?.taxRate,0,100);
  }

  function computeSale(lines:any=[],opts:any={}){
    const source=Array.isArray(lines)?lines:[];
    const prepared=source.map((line,index)=>{
      const qty=Math.max(0,n(line.qty)),unitPrice=Math.max(0,n(line.unitPrice));
      return{line,index,lineTotal:money(qty*unitPrice),rate:opts.taxRegistered===false?0:taxRate(line)};
    });
    const subtotal=money(prepared.reduce((a,x)=>a+x.lineTotal,0));
    const manual=clamp(opts.discount,0,subtotal);
    const points=clamp(opts.pointsDiscount,0,Math.max(0,subtotal-manual));
    const contract=clamp(opts.contractDiscount,0,Math.max(0,subtotal-manual-points));
    const totalDiscount=money(manual+points+contract);
    const pricesIncludeTax=opts.pricesIncludeTax!==false;
    const merchandiseAfterDiscount=money(Math.max(0,subtotal-totalDiscount));
    let allocated=0;
    const lineResults=prepared.map((x,i)=>{
      const discountShare=i===prepared.length-1?money(Math.max(0,totalDiscount-allocated)):money(subtotal>0?totalDiscount*x.lineTotal/subtotal:0);
      allocated=money(allocated+discountShare);
      const discounted=money(Math.max(0,x.lineTotal-discountShare));
      let taxAmount=0,netAmount=discounted,grossAmount=discounted;
      if(x.rate>0){
        if(pricesIncludeTax){taxAmount=money(discounted*x.rate/(100+x.rate));netAmount=money(discounted-taxAmount);grossAmount=discounted}
        else{taxAmount=money(discounted*x.rate/100);netAmount=discounted;grossAmount=money(discounted+taxAmount)}
      }
      return{...x.line,lineTotal:x.lineTotal,discountShare,taxRate:x.rate,taxAmount,netAmount,grossAmount};
    });
    const taxTotal=money(lineResults.reduce((a,x)=>a+n(x.taxAmount),0));
    const salesNet=money(lineResults.reduce((a,x)=>a+n(x.netAmount),0));
    const merchandiseGross=money(lineResults.reduce((a,x)=>a+n(x.grossAmount),0));
    const deliveryFee=money(Math.max(0,n(opts.deliveryFee)));
    const total=money(merchandiseGross+deliveryFee);
    return{subtotal,discount:manual,pointsDiscount:points,contractDiscount:contract,totalDiscount,pricesIncludeTax,merchandiseAfterDiscount,taxTotal,salesNet,merchandiseGross,deliveryFee,total,lines:lineResults};
  }

  function returnAmounts(line:any,qty:any){
    const soldQty=Math.max(0,n(line?.qty)),q=clamp(qty,0,soldQty),ratio=soldQty>0?q/soldQty:0;
    return{
      ratio,
      gross:money(n(line?.grossAmount??(n(line?.lineTotal)-n(line?.discountShare)))*ratio),
      net:money(n(line?.netAmount??(n(line?.lineTotal)-n(line?.discountShare)-n(line?.taxAmount)))*ratio),
      tax:money(n(line?.taxAmount)*ratio),
      discount:money(n(line?.discountShare)*ratio)
    };
  }

  function accountForPayment(method:any){
    return method==='cash'?'1000':method==='bank'?'1010':['card','wallet'].includes(method)?'1020':method==='credit'?'1100':method==='insurance'?'1150':'1020';
  }

module.exports={EPS,n,money,taxRate,computeSale,returnAmounts,accountForPayment};

export {};
