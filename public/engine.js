/* ---- rules engine (transparent, versioned; thresholds pending clinical review) ---- */
function assess(d){const R=[],U=[],X=[];const sy=+d.sys,di=+d.dia,hb=+d.hb,bp=d.sys&&d.dia;let raised=false,pre=false;
 if(d.conv)R.push('Convulsions reported');
 if(d.bleed=='heavy')R.push('Heavy bleeding reported');
 if(d.fm=='absent')R.push('No fetal movement reported');
 if(bp){if(sy>=160||di>=110){R.push(`BP ${sy}/${di} (≥160/110)`);raised=true}
  else if(sy>=140||di>=90){raised=true;if(d.head||d.vis){pre=true;R.push(`BP ${sy}/${di} (≥140/90) with headache/visual symptoms: pre-eclampsia pattern`)}else U.push(`BP ${sy}/${di} raised (≥140/90)`)}}else X.push('BP not recorded');
 if((d.head||d.vis)&&!pre)U.push('Severe headache / visual symptoms reported');
 if(d.swell)U.push(raised?'Swelling with raised BP':'Swelling of face/hands reported');
 if(d.hb!==''&&d.hb!=null){if(hb<7)R.push(`Hb ${hb} g/dL (<7)`);else if(hb<11)U.push(`Hb ${hb} g/dL (7–10.9)`)}else X.push('Hb not recorded');
 if(d.fm=='reduced')U.push('Reduced fetal movement');
 if(d.fever)U.push('Fever reported');
 if(d.bleed=='spotting')U.push('Spotting reported');
 return{cat:R.length?'emergency':U.length?'urgent':'routine',why:[...R,...U],miss:X}}

if(typeof module!=='undefined')module.exports={assess};
