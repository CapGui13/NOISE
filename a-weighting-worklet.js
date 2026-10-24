/* NOISE V5 — continuous A-weighted sound-level engine.
   Analog poles reference IEC 61672; see MIT project
   https://github.com/audiojs/weighting/tree/main/packages/weighting-a
   Independent bilinear SOS implementation, NOT an IEC-certified sound meter.
   All processing local; no raw audio is saved or transmitted. */
(function(){
"use strict";
function section(fs,a1,a0,b2,b1,b0){
 var k=2*fs,k2=k*k,d=k2+a1*k+a0;
 return {b0:(b2*k2+b1*k+b0)/d,b1:(-2*b2*k2+2*b0)/d,
 b2:(b2*k2-b1*k+b0)/d,a1:(-2*k2+2*a0)/d,
 a2:(k2-a1*k+a0)/d,z1:0,z2:0}
}
function magnitude(s,hz,fs){
 var v=2*Math.PI*hz/fs,c1=Math.cos(v),s1=Math.sin(v),c2=Math.cos(2*v),s2=Math.sin(2*v);
 var nr=s.b0+s.b1*c1+s.b2*c2,ni=-s.b1*s1-s.b2*s2;
 var dr=1+s.a1*c1+s.a2*c2,di=-s.a1*s1-s.a2*s2;
 return Math.sqrt((nr*nr+ni*ni)/(dr*dr+di*di))
}
function weightedFilter(fs){
 var p=2*Math.PI,w1=p*20.598997,w2=p*107.65265,w3=p*737.86223,w4=p*12194.217;
 // H(s) proportional to s^4 / [(s+w1)^2(s+w2)(s+w3)(s+w4)^2]
 var sos=[section(fs,2*w1,w1*w1,1,0,0),section(fs,w2+w3,w2*w3,1,0,0),
          section(fs,2*w4,w4*w4,0,0,w4*w4)];
 var gain=1;for(var i=0;i<sos.length;i++)gain/=magnitude(sos[i],1000,fs);
 return {stages:sos,gain:gain}
}
class NoiseAMeter extends AudioWorkletProcessor{
 constructor(){
  super();
  var design=weightedFilter(sampleRate);
  this.sections=design.stages;this.gain=design.gain;
  this.windowPower=0;this.windowSamples=0;
  this.windowSize=Math.max(512,Math.round(sampleRate/8));
  this.capture=null;
  this.port.onmessage=(event)=>{
   var m=event.data;
   if(!m||!m.type)return;
   if(m.type==="beginMeasurement"&&Number.isFinite(m.id)){
    this.capture={id:m.id,samples:0,power:0,target:Math.round(sampleRate*20)}
   }else if(m.type==="cancelMeasurement")this.capture=null
  };
  this.port.postMessage({type:"ready",sampleRate:sampleRate});
 }
 process(inputs,outputs){
  var output=outputs[0];
  if(output)for(var oc=0;oc<output.length;oc++)output[oc].fill(0);
  var channels=inputs[0];
  if(!channels||!channels.length||!channels[0]||!channels[0].length)return true;
  var frames=channels[0].length,len=channels.length;
  for(var i=0;i<frames;i++){
   var x=0;
   for(var j=0;j<len;j++)x+=channels[j][i]||0;
   x/=len;
   for(var k=0;k<this.sections.length;k++){
    var s=this.sections[k],y=s.b0*x+s.z1;
    s.z1=s.b1*x-s.a1*y+s.z2;
    s.z2=s.b2*x-s.a2*y;x=y
   }
   x*=this.gain;
   var power=x*x;this.windowPower+=power;this.windowSamples++;
   if(this.capture){
    this.capture.power+=power;this.capture.samples++;
    if(this.capture.samples>=this.capture.target){
     this.port.postMessage({type:"measurement",id:this.capture.id,
      dbfsA:10*Math.log10(Math.max(this.capture.power/this.capture.samples,1e-14)),
      seconds:this.capture.samples/sampleRate});
     this.capture=null
    }
   }
   if(this.windowSamples>=this.windowSize){
    this.port.postMessage({type:"level",dbfsA:10*Math.log10(Math.max(this.windowPower/this.windowSamples,1e-14))});
    this.windowPower=0;this.windowSamples=0
   }
  }
  return true
 }
}
registerProcessor("noise-a-meter-v5",NoiseAMeter)
})();
