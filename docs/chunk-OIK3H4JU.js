import{a as D,b as S,c as T}from"./chunk-YHQDCZRH.js";import{a as b}from"./chunk-QU524PU2.js";import{$a as n,Ba as r,Fa as h,Ka as p,Pa as l,Xa as o,ab as s,ac as C,bb as m,ib as u,lc as y,nb as f,ob as d,pb as g,rb as v}from"./chunk-SU5VR5TY.js";var _=["chartContainer"];function x(i,t){i&1&&(n(0,"div",4)(1,"p"),v(2,"No coverage data to display"),s()())}function I(i,t){if(i&1&&m(0,"google-chart",5),i&2){let e=u();o("type",e.chartType)("data",e.chartData)("options",e.chartOptions)("width",e.chartWidth)("height",e.chartHeight)}}var O=class i{constructor(t){this.themeStore=t}coverageData=null;chartContainer;chartType=D.PieChart;chartData=[];chartOptions={};chartWidth=850;chartHeight=500;themeSubscription=null;isDarkTheme=!1;ngOnInit(){this.themeSubscription=this.themeStore.isDarkTheme$.subscribe(t=>{this.isDarkTheme=t,this.updateChartOptions(),this.prepareChartData()}),this.prepareChartData(),this.updateChartOptions()}ngOnDestroy(){this.themeSubscription&&this.themeSubscription.unsubscribe()}prepareChartData(){if(!this.coverageData)return;let t=[];this.coverageData.packages.forEach(e=>{e.linesValid>0&&t.push([e.name,e.linesValid])}),this.chartData=t}updateChartOptions(){this.chartOptions={title:"Coverage by Package",titleTextStyle:{color:this.isDarkTheme?"#e0e0e0":"#333333",fontSize:16,bold:!0},backgroundColor:this.isDarkTheme?"#1e1e1e":"#ffffff",colors:["#4caf50","#8bc34a","#cddc39","#ffeb3b","#ffc107","#ff9800","#ff5722","#f44336"],is3D:!1,pieHole:.4,legend:{position:"right",textStyle:{color:this.isDarkTheme?"#e0e0e0":"#333333"}},chartArea:{left:50,top:50,width:"70%",height:"70%"},tooltip:{showColorCode:!0,textStyle:{color:this.isDarkTheme?"#e0e0e0":"#333333"}},pieSliceText:"percentage",sliceVisibilityThreshold:.03}}static \u0275fac=function(e){return new(e||i)(h(b))};static \u0275cmp=p({type:i,selectors:[["app-sunburst"]],viewQuery:function(e,a){if(e&1&&f(_,5),e&2){let c;d(c=g())&&(a.chartContainer=c.first)}},inputs:{coverageData:"coverageData"},decls:4,vars:2,consts:[["chartContainer",""],[1,"sunburst-container"],["class","no-data-message",4,"ngIf"],[3,"type","data","options","width","height",4,"ngIf"],[1,"no-data-message"],[3,"type","data","options","width","height"]],template:function(e,a){e&1&&(n(0,"div",1,0),l(2,x,3,0,"div",2)(3,I,1,5,"google-chart",3),s()),e&2&&(r(2),o("ngIf",!a.coverageData),r(),o("ngIf",a.coverageData&&a.chartData.length>0))},dependencies:[y,C,T,S],styles:[".sunburst-container[_ngcontent-%COMP%]{height:100%;position:relative;display:flex;justify-content:center;align-items:center}.no-data-message[_ngcontent-%COMP%]{text-align:center;color:var(--color-text-secondary);font-size:1.1rem}google-chart[_ngcontent-%COMP%]{width:100%;height:100%;min-height:500px}"]})};export{O as a};
