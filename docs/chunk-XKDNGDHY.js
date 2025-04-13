import{a as re,b as ie}from"./chunk-GTRWXQFM.js";import{a as ee,b as te}from"./chunk-4YQF2CO5.js";import{a as ne}from"./chunk-QU524PU2.js";import{n as Z}from"./chunk-A2KPREJL.js";import{a as W}from"./chunk-XC5NQH5T.js";import{f as Y,g as Q,h as B,i as J,l as K}from"./chunk-GQYAU5FR.js";import{$ as p,$a as o,$b as $,B as L,Ba as g,Fa as h,Hb as G,Ka as z,Pa as b,Xa as f,Za as F,Zb as q,_ as m,ab as s,ac as X,bb as d,cb as R,db as N,fb as y,hb as _,ib as u,lb as U,lc as A,nb as H,ob as V,pb as j,qb as E,rb as c,sb as x}from"./chunk-SU5VR5TY.js";import{a as T,b as I}from"./chunk-EQDQRRRY.js";var v=function(n){return n[n.State=0]="State",n[n.Transition=1]="Transition",n[n.Sequence=2]="Sequence",n[n.Group=3]="Group",n[n.Animate=4]="Animate",n[n.Keyframes=5]="Keyframes",n[n.Style=6]="Style",n[n.Trigger=7]="Trigger",n[n.Reference=8]="Reference",n[n.AnimateChild=9]="AnimateChild",n[n.AnimateRef=10]="AnimateRef",n[n.Query=11]="Query",n[n.Stagger=12]="Stagger",n}(v||{}),se="*";function k(n,e){return{type:v.Trigger,name:n,definitions:e,options:{}}}function S(n,e=null){return{type:v.Animate,styles:e,timings:n}}function ue(n,e=null){return{type:v.Sequence,steps:n,options:e}}function P(n){return{type:v.Style,styles:n,offset:null}}function M(n,e,t=null){return{type:v.Transition,expr:n,animation:e,options:t}}var D=class{_onDoneFns=[];_onStartFns=[];_onDestroyFns=[];_originalOnDoneFns=[];_originalOnStartFns=[];_started=!1;_destroyed=!1;_finished=!1;_position=0;parentPlayer=null;totalTime;constructor(e=0,t=0){this.totalTime=e+t}_onFinish(){this._finished||(this._finished=!0,this._onDoneFns.forEach(e=>e()),this._onDoneFns=[])}onStart(e){this._originalOnStartFns.push(e),this._onStartFns.push(e)}onDone(e){this._originalOnDoneFns.push(e),this._onDoneFns.push(e)}onDestroy(e){this._onDestroyFns.push(e)}hasStarted(){return this._started}init(){}play(){this.hasStarted()||(this._onStart(),this.triggerMicrotask()),this._started=!0}triggerMicrotask(){queueMicrotask(()=>this._onFinish())}_onStart(){this._onStartFns.forEach(e=>e()),this._onStartFns=[]}pause(){}restart(){}finish(){this._onFinish()}destroy(){this._destroyed||(this._destroyed=!0,this.hasStarted()||this._onStart(),this.finish(),this._onDestroyFns.forEach(e=>e()),this._onDestroyFns=[])}reset(){this._started=!1,this._finished=!1,this._onStartFns=this._originalOnStartFns,this._onDoneFns=this._originalOnDoneFns}setPosition(e){this._position=this.totalTime?e*this.totalTime:1}getPosition(){return this.totalTime?this._position/this.totalTime:1}triggerCallback(e){let t=e=="start"?this._onStartFns:this._onDoneFns;t.forEach(r=>r()),t.length=0}},w=class{_onDoneFns=[];_onStartFns=[];_finished=!1;_started=!1;_destroyed=!1;_onDestroyFns=[];parentPlayer=null;totalTime=0;players;constructor(e){this.players=e;let t=0,r=0,i=0,a=this.players.length;a==0?queueMicrotask(()=>this._onFinish()):this.players.forEach(l=>{l.onDone(()=>{++t==a&&this._onFinish()}),l.onDestroy(()=>{++r==a&&this._onDestroy()}),l.onStart(()=>{++i==a&&this._onStart()})}),this.totalTime=this.players.reduce((l,O)=>Math.max(l,O.totalTime),0)}_onFinish(){this._finished||(this._finished=!0,this._onDoneFns.forEach(e=>e()),this._onDoneFns=[])}init(){this.players.forEach(e=>e.init())}onStart(e){this._onStartFns.push(e)}_onStart(){this.hasStarted()||(this._started=!0,this._onStartFns.forEach(e=>e()),this._onStartFns=[])}onDone(e){this._onDoneFns.push(e)}onDestroy(e){this._onDestroyFns.push(e)}hasStarted(){return this._started}play(){this.parentPlayer||this.init(),this._onStart(),this.players.forEach(e=>e.play())}pause(){this.players.forEach(e=>e.pause())}restart(){this.players.forEach(e=>e.restart())}finish(){this._onFinish(),this.players.forEach(e=>e.finish())}destroy(){this._onDestroy()}_onDestroy(){this._destroyed||(this._destroyed=!0,this._onFinish(),this.players.forEach(e=>e.destroy()),this._onDestroyFns.forEach(e=>e()),this._onDestroyFns=[])}reset(){this.players.forEach(e=>e.reset()),this._destroyed=!1,this._finished=!1,this._started=!1}setPosition(e){let t=e*this.totalTime;this.players.forEach(r=>{let i=r.totalTime?Math.min(1,t/r.totalTime):1;r.setPosition(i)})}getPosition(){let e=this.players.reduce((t,r)=>t===null||r.totalTime>t.totalTime?r:t,null);return e!=null?e.getPosition():0}beforeDestroy(){this.players.forEach(e=>{e.beforeDestroy&&e.beforeDestroy()})}triggerCallback(e){let t=e=="start"?this._onStartFns:this._onDoneFns;t.forEach(r=>r()),t.length=0}},ae="!";var le=["fileInput"];function ce(n,e){if(n&1){let t=y();R(0),o(1,"div",21),d(2,"i",22),s(),o(3,"div",23)(4,"h3"),c(5),s(),o(6,"p"),c(7,"or"),s(),o(8,"button",24),_("click",function(){m(t),u();let i=E(8);return p(i.click())}),d(9,"i",25),c(10," Choose File "),s()(),o(11,"div",26)(12,"span",27),d(13,"i",28),c(14," XML "),s()(),N()}if(n&2){let t=u();g(),F("active",t.isDragOver),g(),f("ngClass",t.isDragOver?"fa-file-import":"fa-cloud-upload-alt"),g(3),x(t.isDragOver?"Release to Upload":"Drop Cobertura XML File Here")}}function de(n,e){n&1&&(o(0,"div",29)(1,"span"),c(2,"Processing coverage report..."),s(),o(3,"p",30),c(4,"This might take a moment for large files"),s()(),o(5,"div",31),d(6,"div",32),s())}function ge(n,e){if(n&1){let t=y();o(0,"div",33)(1,"div",34),d(2,"i",35),o(3,"div",36)(4,"strong"),c(5,"Error Processing File"),s(),o(6,"span"),c(7),s()(),o(8,"button",37),_("click",function(){m(t);let i=u();return p(i.clearError())}),d(9,"i",38),s()()()}if(n&2){let t=u();f("@fadeInOut",void 0),g(7),x(t.errorMessage)}}function me(n,e){if(n&1){let t=y();o(0,"button",46),_("click",function(){let i=m(t).$implicit,a=u(2);return p(a.loadFromHistory(i))}),d(1,"i",28),o(2,"span",47),c(3),s()()}if(n&2){let t=e.$implicit,r=u(2);U("title","Load ",t,""),g(3),x(r.truncateFilename(t))}}function pe(n,e){if(n&1){let t=y();o(0,"div",39)(1,"div",40)(2,"h3"),d(3,"i",41),c(4," Recent Files"),s(),o(5,"button",42),_("click",function(){m(t);let i=u();return p(i.clearRecentFiles())}),d(6,"i",43),s()(),o(7,"div",44),b(8,me,4,3,"button",45),s()()}if(n&2){let t=u();g(8),f("ngForOf",t.previousFiles)}}var oe=class n{constructor(e,t,r,i,a,l,O){this.parserService=e;this.coverageStore=t;this.ToastService=r;this.themeStore=i;this.router=a;this.fileHistoryService=l;this.navigationGuard=O;this.loadPreviousFiles(),this.routerSubscription=this.router.events.subscribe(C=>{C instanceof Y?(console.log("Navigation started to:",C.url),this.navigating=!0):(C instanceof Q||C instanceof B||C instanceof J)&&(console.log("Navigation ended or canceled"),this.navigating=!1)})}fileInput;isDarkTheme=!1;isLoading=!1;errorMessage="";isDragOver=!1;previousFiles=[];navigating=!1;routerSubscription;ngOnInit(){this.themeStore.isDarkTheme$.subscribe(e=>{this.isDarkTheme=e}),this.navigating=!1}ngOnDestroy(){this.routerSubscription&&this.routerSubscription.unsubscribe()}onDragOver(e){e.preventDefault(),e.stopPropagation(),this.isDragOver=!0}onDragLeave(e){e.preventDefault(),e.stopPropagation(),this.isDragOver=!1}onDrop(e){e.preventDefault(),e.stopPropagation(),this.isDragOver=!1,e.dataTransfer?.files&&e.dataTransfer.files.length>0&&this.processFile(e.dataTransfer.files[0])}onFileSelected(e){let t=e.target;!t.files||t.files.length===0||(this.processFile(t.files[0]),t.value="")}processFile(e){if(this.isLoading||this.navigating||this.navigationGuard.isNavigatingTo("/visualization")){console.log("Preventing duplicate file processing");return}if(!e.name.endsWith(".xml")){this.errorMessage="Please select an XML file with Cobertura coverage data",this.ToastService.showError("Invalid file type","Please select a Cobertura XML file");return}let t=10*1024*1024;if(e.size>t){this.errorMessage="File size exceeds 10MB limit",this.ToastService.showError("File too large","The maximum file size is 10MB");return}this.isLoading=!0,this.errorMessage="";let r=new FileReader;r.onload=i=>{try{let a=i.target?.result;if(!a)throw new Error("Failed to read the file content");if(!a.includes("<coverage")||!a.includes("line-rate"))throw new Error("Not a valid Cobertura XML file. The file must contain coverage and line-rate attributes.");let l=this.parserService.parseCoberturaXml(a);if(l){this.coverageStore.setCoverageData(l);let O={id:`${Date.now()}_${Math.random().toString(36).substring(2,9)}`,name:e.name,date:new Date,size:e.size,type:"xml",summary:{lineCoverage:l.summary.lineCoverage,branchCoverage:l.summary.branchCoverage,timestamp:l.summary.timestamp||new Date().toISOString()}};this.fileHistoryService.addFile(O,a),this.loadPreviousFiles(),this.ToastService.showSuccess("File Loaded Successfully",`Loaded coverage data with ${l.summary.lineCoverage.toFixed(1)}% line coverage`),this.navigationGuard.startNavigation("/visualization"),this.router.navigate(["/visualization"],{replaceUrl:!0})}else this.errorMessage="Failed to parse the Cobertura XML file"}catch(a){this.errorMessage=a.message||"An error occurred while processing the file",this.ToastService.showError("Error",this.errorMessage),console.error(a)}finally{this.isLoading=!1}},r.onerror=()=>{this.errorMessage="Failed to read the file",this.ToastService.showError("File Error","Could not read the file"),this.isLoading=!1},r.readAsText(e)}loadFromHistory(e){if(console.log("Load file request:",{file:e,isLoading:this.isLoading,isNavigating:this.navigating||this.navigationGuard.isNavigatingTo("/visualization")}),this.isLoading||this.navigating||this.navigationGuard.isNavigatingTo("/visualization")){console.log("Preventing duplicate load - navigation in progress");return}this.isLoading=!0,this.errorMessage="";let t=(r,i)=>{try{let a=this.parserService.parseCoberturaXml(i);if(!a)throw new Error("Failed to parse saved coverage data");this.coverageStore.setCoverageData(a);let l=I(T({},r),{date:new Date});this.fileHistoryService.addFile(l,i),this.ToastService.showSuccess("Historical File Loaded",`Loaded ${r.name} successfully`),sessionStorage.setItem("navigating_to_visualization","true"),this.navigationGuard.startNavigation("/visualization"),setTimeout(()=>{this.router.navigate(["/visualization"],{replaceUrl:!0})},10)}catch(a){console.error("Error loading from history:",a),this.ToastService.showError("Error","Failed to load historical file")}finally{this.isLoading=!1}};this.fileHistoryService.getFiles().pipe(L(1)).subscribe({next:r=>{console.log("Files received:",r);let i=r.find(l=>l.name===e);if(!i){console.error(`File "${e}" not found in history:`,r),this.ToastService.showError("File Not Found","Could not find the saved file"),this.isLoading=!1;return}console.log("Found file in history:",i);let a=this.fileHistoryService.getFileContent(i.id);if(!a){console.error(`Content not found for file ID: ${i.id}`),this.ToastService.showError("File Not Found","Could not find the saved file content"),this.isLoading=!1;return}t(i,a)},error:r=>{console.error("Error getting files:",r),this.ToastService.showError("Error","Failed to retrieve file history"),this.isLoading=!1}})}clearError(){this.errorMessage=""}clearRecentFiles(){confirm("Are you sure you want to clear your recent files history?")&&(this.fileHistoryService.clearHistory(),this.previousFiles=[],this.ToastService.showInfo("History Cleared","Your recent files history has been cleared"))}truncateFilename(e){if(e.length<=20)return e;let r=e.split(".").pop()||"";return e.substring(0,e.length-r.length-1).substring(0,20-r.length-3)+"..."+"."+r}loadPreviousFiles(){this.fileHistoryService.getFiles().subscribe(e=>{this.previousFiles=e.slice(0,5).map(t=>t.name)})}static \u0275fac=function(t){return new(t||n)(h(ee),h(te),h(W),h(ne),h(K),h(re),h(ie))};static \u0275cmp=z({type:n,selectors:[["app-file-uploader"]],viewQuery:function(t,r){if(t&1&&H(le,5),t&2){let i;V(i=j())&&(r.fileInput=i.first)}},decls:48,vars:9,consts:[["fileInput",""],["loadingTemplate",""],[1,"uploader-container"],[1,"uploader-header"],[1,"text-secondary"],[1,"drop-zone",3,"dragover","dragleave","drop"],["type","file","id","file-upload","accept",".xml",3,"change","disabled"],[4,"ngIf","ngIfElse"],["class","feedback-container",4,"ngIf"],[1,"quick-actions"],["class","recent-files",4,"ngIf"],[1,"help-section"],[1,"fas","fa-info-circle"],[1,"info-container"],[1,"tools-list"],[1,"fab","fa-java"],[1,"fab","fa-js"],[1,"fab","fa-microsoft"],[1,"fab","fa-python"],[1,"info-note"],[1,"fas","fa-lightbulb"],[1,"upload-icon"],[1,"fas",3,"ngClass"],[1,"upload-text"],[1,"upload-button",3,"click"],[1,"fas","fa-folder-open"],[1,"file-types"],[1,"file-type"],[1,"fas","fa-file-code"],[1,"loading-text"],[1,"loading-detail"],[1,"loading-spinner"],[1,"spinner"],[1,"feedback-container"],[1,"error-message"],[1,"fas","fa-exclamation-circle"],[1,"error-content"],[1,"dismiss-btn",3,"click"],[1,"fas","fa-times"],[1,"recent-files"],[1,"section-header"],[1,"fas","fa-history"],["title","Clear history",1,"clear-btn",3,"click"],[1,"fas","fa-trash-alt"],[1,"recent-list"],["class","recent-item",3,"title","click",4,"ngFor","ngForOf"],[1,"recent-item",3,"click","title"],[1,"filename"]],template:function(t,r){if(t&1){let i=y();o(0,"div",2)(1,"div",3)(2,"h1"),c(3,"Upload Coverage Report"),s(),o(4,"p",4),c(5," Drop your Cobertura XML file below or select from your device to analyze coverage. "),s()(),o(6,"div",5),_("dragover",function(l){return m(i),p(r.onDragOver(l))})("dragleave",function(l){return m(i),p(r.onDragLeave(l))})("drop",function(l){return m(i),p(r.onDrop(l))}),o(7,"input",6,0),_("change",function(l){return m(i),p(r.onFileSelected(l))}),s(),b(9,ce,15,4,"ng-container",7)(10,de,7,0,"ng-template",null,1,G),s(),b(12,ge,10,2,"div",8),o(13,"div",9),b(14,pe,9,1,"div",10),s(),o(15,"div",11)(16,"details")(17,"summary"),d(18,"i",12),c(19," About Cobertura XML Format "),s(),o(20,"div",13)(21,"p"),c(22," Cobertura XML is a standardized format for code coverage reports generated by various tools: "),s(),o(23,"ul",14)(24,"li"),d(25,"i",15),o(26,"strong"),c(27,"Java:"),s(),c(28," JaCoCo, Cobertura plugins "),s(),o(29,"li"),d(30,"i",16),o(31,"strong"),c(32,"JavaScript:"),s(),c(33," Istanbul, nyc "),s(),o(34,"li"),d(35,"i",17),o(36,"strong"),c(37,".NET:"),s(),c(38," OpenCover, Coverlet "),s(),o(39,"li"),d(40,"i",18),o(41,"strong"),c(42,"Python:"),s(),c(43," coverage.py, pytest-cov "),s()(),o(44,"div",19),d(45,"i",20),o(46,"p"),c(47,"Many CI/CD systems like Jenkins, GitHub Actions, and GitLab CI support exporting coverage in Cobertura format."),s()()()()()()}if(t&2){let i=E(11);g(6),F("active",r.isDragOver)("loading",r.isLoading),g(),f("disabled",r.isLoading),g(2),f("ngIf",!r.isLoading)("ngIfElse",i),g(3),f("ngIf",r.errorMessage),g(2),f("ngIf",r.previousFiles.length>0)}},dependencies:[A,q,$,X,Z],styles:[".uploader-container[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:1.5rem;max-width:900px;margin:0 auto;padding:1rem 0}.uploader-header[_ngcontent-%COMP%], .uploader-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%]{margin-bottom:.5rem}.uploader-header[_ngcontent-%COMP%]   .uploader-description[_ngcontent-%COMP%]{color:var(--color-text-secondary);font-size:1.1rem}.drop-zone[_ngcontent-%COMP%]{position:relative;border:2px dashed var(--color-border-default);border-radius:8px;padding:3rem 2rem;text-align:center;background-color:var(--color-bg-tertiary);transition:all .3s ease;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;cursor:pointer}.drop-zone[_ngcontent-%COMP%]:hover{border-color:var(--color-primary);background-color:rgba(var(--color-primary-rgb),.05)}.drop-zone.active[_ngcontent-%COMP%]{border-color:var(--color-primary);background-color:rgba(var(--color-primary-rgb),.1)}.drop-zone.loading[_ngcontent-%COMP%]{pointer-events:none;border-style:solid}.drop-zone[_ngcontent-%COMP%]   input[type=file][_ngcontent-%COMP%]{position:absolute;width:.1px;height:.1px;opacity:0;overflow:hidden;z-index:-1}.upload-icon[_ngcontent-%COMP%]{font-size:4rem;color:var(--color-text-tertiary);margin-bottom:1.5rem;transition:all .3s ease}.upload-icon.active[_ngcontent-%COMP%]{color:var(--color-primary);transform:scale(1.1)}.upload-text[_ngcontent-%COMP%]{margin-bottom:1.5rem}.upload-text[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%]{font-size:1.5rem;margin-bottom:.5rem}.upload-text[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{color:var(--color-text-secondary);margin:.5rem 0}.upload-button[_ngcontent-%COMP%]{display:inline-block;padding:.75rem 1.5rem;background-color:var(--color-primary);color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500;transition:background-color .2s}.upload-button[_ngcontent-%COMP%]:hover{background-color:var(--color-btn-primary-hover)}.upload-button[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{margin-right:.5rem}.file-types[_ngcontent-%COMP%]{display:flex;justify-content:center;gap:1rem;margin-top:1rem}.file-types[_ngcontent-%COMP%]   .file-type[_ngcontent-%COMP%]{display:inline-flex;align-items:center;padding:.25rem .75rem;background-color:var(--color-bg-secondary);border-radius:50px;font-size:.875rem;color:var(--color-text-secondary)}.file-types[_ngcontent-%COMP%]   .file-type[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{margin-right:.5rem}.loading-text[_ngcontent-%COMP%]{margin-bottom:2rem}.loading-text[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{font-size:1.25rem;font-weight:500}.loading-text[_ngcontent-%COMP%]   .loading-detail[_ngcontent-%COMP%]{color:var(--color-text-secondary);font-size:.9rem;margin-top:.5rem}.loading-spinner[_ngcontent-%COMP%]{display:flex;justify-content:center}.loading-spinner[_ngcontent-%COMP%]   .spinner[_ngcontent-%COMP%]{width:50px;height:50px;border:3px solid rgba(var(--color-primary-rgb),.3);border-radius:50%;border-top-color:var(--color-primary);animation:_ngcontent-%COMP%_spin 1s ease-in-out infinite}@keyframes _ngcontent-%COMP%_spin{to{transform:rotate(360deg)}}.feedback-container[_ngcontent-%COMP%]{margin-top:1rem}.error-message[_ngcontent-%COMP%]{display:flex;align-items:flex-start;padding:1rem;background-color:rgba(var(--color-error-rgb),.1);border-left:4px solid var(--color-error);border-radius:4px}.error-message[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{color:var(--color-error);font-size:1.25rem;margin-right:.75rem;flex-shrink:0}.error-message[_ngcontent-%COMP%]   .error-content[_ngcontent-%COMP%]{flex:1}.error-message[_ngcontent-%COMP%]   .error-content[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%]{display:block;margin-bottom:.25rem}.error-message[_ngcontent-%COMP%]   .error-content[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{color:var(--color-text-secondary);font-size:.9rem}.error-message[_ngcontent-%COMP%]   .dismiss-btn[_ngcontent-%COMP%]{background:none;border:none;color:var(--color-text-tertiary);cursor:pointer;padding:.25rem;flex-shrink:0}.error-message[_ngcontent-%COMP%]   .dismiss-btn[_ngcontent-%COMP%]:hover{color:var(--color-text-secondary)}.quick-actions[_ngcontent-%COMP%]{display:grid;grid-template-columns:1fr;gap:1.5rem;margin-top:1rem}@media (min-width: 768px){.quick-actions[_ngcontent-%COMP%]{grid-template-columns:1fr 1fr}}.section-header[_ngcontent-%COMP%]   .section-header[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}.section-header[_ngcontent-%COMP%]   .section-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%]{font-size:1.25rem;margin:0}.section-header[_ngcontent-%COMP%]   .section-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{margin-right:.5rem;color:var(--color-text-brand)}.section-header[_ngcontent-%COMP%]   .section-header[_ngcontent-%COMP%]   .clear-btn[_ngcontent-%COMP%]{background:none;border:none;color:var(--color-text-tertiary);cursor:pointer;padding:.5rem}.section-header[_ngcontent-%COMP%]   .section-header[_ngcontent-%COMP%]   .clear-btn[_ngcontent-%COMP%]:hover{color:var(--color-text-secondary)}.recent-list[_ngcontent-%COMP%]{display:flex;flex-direction:row;justify-content:flex-start;flex-wrap:nowrap;gap:1rem}.recent-item[_ngcontent-%COMP%]{display:inline-flex;flex-direction:row;align-items:center;margin-top:15px;padding:.5rem .75rem;background-color:var(--color-bg-tertiary);border:1px solid var(--color-border-default);border-radius:4px;font-size:.875rem;cursor:pointer;transition:all .2s}.recent-item[_ngcontent-%COMP%]:hover{background-color:var(--color-bg-secondary);border-color:var(--color-border-strong)}.recent-item[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{margin-right:.5rem;color:var(--color-text-tertiary)}.recent-item[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{color:var(--color-text-tertiary)}.help-section[_ngcontent-%COMP%]{margin-top:1rem}.help-section[_ngcontent-%COMP%]   details[_ngcontent-%COMP%]{border:1px solid var(--color-border-default);border-radius:4px;overflow:hidden}.help-section[_ngcontent-%COMP%]   details[_ngcontent-%COMP%]   summary[_ngcontent-%COMP%]{padding:1rem;background-color:var(--color-bg-tertiary);cursor:pointer;display:flex;align-items:center;font-weight:500}.help-section[_ngcontent-%COMP%]   details[_ngcontent-%COMP%]   summary[_ngcontent-%COMP%]:hover{background-color:var(--color-bg-secondary)}.help-section[_ngcontent-%COMP%]   details[_ngcontent-%COMP%]   summary[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{margin-right:.75rem;color:var(--color-text-brand)}.help-section[_ngcontent-%COMP%]   details[_ngcontent-%COMP%]   .info-container[_ngcontent-%COMP%]{padding:1rem;background-color:var(--color-bg-secondary)}.help-section[_ngcontent-%COMP%]   .tools-list[_ngcontent-%COMP%]{list-style:none;padding:0;margin:1rem 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem}.help-section[_ngcontent-%COMP%]   .tools-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{display:flex;align-items:center;padding:.5rem;background-color:var(--color-bg-tertiary);border-radius:4px}.help-section[_ngcontent-%COMP%]   .tools-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{width:1.5rem;margin-right:.5rem;font-size:1.1rem;text-align:center}.help-section[_ngcontent-%COMP%]   .tools-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%]{margin-right:.25rem}.help-section[_ngcontent-%COMP%]   .info-note[_ngcontent-%COMP%]{display:flex;align-items:flex-start;background-color:rgba(var(--color-info-rgb),.1);border-left:3px solid var(--color-info);padding:.75rem;border-radius:0 4px 4px 0;margin-top:1rem}.help-section[_ngcontent-%COMP%]   .info-note[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{margin-right:.75rem;color:var(--color-info);font-size:1.25rem;flex-shrink:0;margin-top:.1rem}.help-section[_ngcontent-%COMP%]   .info-note[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{margin:0;font-size:.9rem}[_nghost-%COMP%]{--color-primary-rgb: 51, 102, 255;--color-error-rgb: 255, 51, 51;--color-info-rgb: 10, 107, 177}"],data:{animation:[k("fadeInOut",[M(":enter",[P({opacity:0,transform:"translateY(-10px)"}),S("200ms ease-out",P({opacity:1,transform:"translateY(0)"}))]),M(":leave",[S("150ms ease-in",P({opacity:0,transform:"translateY(-10px)"}))])])]}})};export{v as a,se as b,ue as c,P as d,D as e,w as f,ae as g,oe as h};
