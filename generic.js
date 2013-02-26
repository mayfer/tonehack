function gcd(text1,text2){
var gcd=1;
if (text1>text2) {text1=text1+text2; text2=text1-text2; text1=text1-text2;}
if ((text2==(Math.round(text2/text1))*text1)) {gcd=text1}else {
for (var i = Math.round(text1/2) ; i > 1; i=i-1) {
if ((text1==(Math.round(text1/i))*i))
if ((text2==(Math.round(text2/i))*i)) {gcd=i; i=-1;}
}
}
return gcd;
}

function lcm(t1,t2){
var cm=1;
var f=gcd(t1,t2);
cm=t1*t2/f;
return cm;
}
