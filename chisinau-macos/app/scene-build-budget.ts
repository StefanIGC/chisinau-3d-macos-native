// Shared by optional, progressively built scenery. Physics/rendering always run.
let end=Infinity,preparing=false,focusX:number|null=null,focusZ:number|null=null;
export function beginSceneBuild(milliseconds=2.8,prepare=false,focus?:{x:number;z:number}){
  preparing=prepare;end=performance.now()+milliseconds;focusX=focus?.x??null;focusZ=focus?.z??null;
}
export function setSceneBuildFocus(focus?:{x:number;z:number}){focusX=focus?.x??null;focusZ=focus?.z??null;}
export function canBuildScene(){return performance.now()<end;}
export function sceneBuildDeadline(milliseconds:number){return Math.min(end,performance.now()+milliseconds*(preparing?2:1));}
export function sceneBuildFocus(camera:{position:{x:number;z:number}}){return{x:focusX??camera.position.x,z:focusZ??camera.position.z};}
// Before revealing a destination, use the available time instead of spending
// dozens of animation frames on an artificial two/three-yield limit.
export function sceneBuildStages(normal:number){return preparing?64:normal;}
