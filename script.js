
(function(){
"use strict";

function showScene(id){
document.querySelectorAll('.scene').forEach(function(s){ s.classList.remove('active'); });
document.getElementById(id).classList.add('active');
}

/* ---------- ambient sparkles ---------- */
var sparkleHost = document.getElementById('sparkles');
for(var i=0;i<26;i++){
var s = document.createElement('span');
s.style.left = (Math.random()*100)+'vw';
s.style.animationDuration = (7+Math.random()*8)+'s';
s.style.animationDelay = (Math.random()*8)+'s';
s.style.setProperty('--drift',(Math.random()*40-20)+'px');
sparkleHost.appendChild(s);
}

/* ---------- shared heart-path sampler -----------
    Both hearts (the text heart and the bleeding heart) use the exact
    same path, so we sample it once on an offscreen canvas and reuse
    the boundary data for placing text safely inside either one. */
function makeHeartSampler(){
var res = 400;
var scale = res / 100;
var canvas = document.createElement('canvas');
canvas.width = res; canvas.height = res;
var ctx = canvas.getContext('2d');
ctx.beginPath();
ctx.moveTo(50*scale, 30*scale);
ctx.bezierCurveTo(50*scale,5*scale, 15*scale,5*scale, 15*scale,30*scale);
ctx.bezierCurveTo(15*scale,55*scale, 50*scale,70*scale, 50*scale,95*scale);
ctx.bezierCurveTo(50*scale,70*scale, 85*scale,55*scale, 85*scale,30*scale);
ctx.bezierCurveTo(85*scale,5*scale, 50*scale,5*scale, 50*scale,30*scale);
ctx.closePath();
return function(y){
    var cy = Math.round(y*scale);
    var minX=null, maxX=null;
    for(var cx=0; cx<=res; cx+=2){
    if(ctx.isPointInPath(cx, cy)){
        if(minX===null) minX = cx;
        maxX = cx;
    }
    }
    if(minX===null) return null;
    return { left: minX/scale, right: maxX/scale, width: (maxX-minX)/scale};
};
}

var heartBounds = makeHeartSampler();

/* the geometric middle of the heart's bounding box (~y50) sits lower
    than where the eye reads as "center", because the heart is wide up
    top and pointed at the bottom. Find the real area-weighted centroid
    instead, so the caption lands where the heart visually balances. */
function heartCentroidY(){
var sumW=0, sumWY=0;
for(var y=6; y<=94; y+=1){
    var b = heartBounds(y);
    if(!b) continue;
    sumW += b.width;
    sumWY += b.width*y;
}
return sumW ? sumWY/sumW : 50;
}
var HEART_CENTER_Y = heartCentroidY();

// Reserved zone (viewBox %) where the short question sits — kept text-free.
var CAPTION_TOP = HEART_CENTER_Y - 17, CAPTION_BOTTOM = HEART_CENTER_Y + 17;
// Zone for the short question on the bleeding heart (answer moved to a letter).
var BLEED_TOP = HEART_CENTER_Y - 15, BLEED_BOTTOM = HEART_CENTER_Y + 15;

/* size a caption box from the heart's actual width at the band's
    vertical middle — always perfectly centered on the heart's true
    centerline (x=50), never an off-center average. */
function safeCaptionBox(bandTop, bandBottom, safety){
var midY = (bandTop+bandBottom)/2;
var b = heartBounds(midY) || {width:40};
return {
    width: b.width * safety,
    left: 50,
    top: midY,
    height: (bandBottom-bandTop) * 0.82
};
}

function applyCaptionBox(el, box){
el.style.width = box.width + '%';
el.style.left = box.left + '%';
el.style.top = box.top + '%';
el.style.maxHeight = box.height + '%';
el.style.transform = 'translate(-50%,-50%)';
}

var captionBox = safeCaptionBox(CAPTION_TOP, CAPTION_BOTTOM, 0.76);
applyCaptionBox(document.querySelector('.heart-caption'), captionBox);

var bleedQBox = safeCaptionBox(BLEED_TOP, BLEED_BOTTOM, 0.8);
applyCaptionBox(document.querySelector('.bleed-caption.question'), bleedQBox);

/* ---------- build the heart entirely out of "Thuỳ Lâm" text -----------
    We sample the exact heart path on an offscreen canvas, row by row,
    and only place text where the row actually falls inside the heart,
    so the letters hug the silhouette exactly. The heart stays whole and
    unbroken — the question simply sits on top of it, centered, with
    enough of a glow behind it to stay readable. */
(function buildHeartText(){
var SVG_NS = 'http://www.w3.org/2000/svg';
var fillHost = document.getElementById('heartTextFill');
var rows = 46;
var topY = 4, bottomY = 96;
var stepY = (bottomY - topY) / rows;
var rowHeight = stepY * 1.65; // slight vertical overlap = denser, fuller look
var frag = document.createDocumentFragment();

// Native SVG <text>, positioned in the SVG's own user-space units
// (the viewBox is 0 0 100 100, so these numbers line up 1:1 with the
// old percentages). This avoids <foreignObject>+HTML entirely, which
// mobile Safari frequently fails to paint/repaint when its content is
// injected after load — the cause of the heart rendering only
// partially on iOS.
function makeRow(left, width, top, height){
    if(width < 1) return;
    var fontSize = height*0.72;
    var text = '';
    var reps = Math.max(3, Math.ceil(width / (fontSize*3.6)) + 3);
    for(var k=0;k<reps;k++){ text += 'Thuỳ Lâm '; }

    var el = document.createElementNS(SVG_NS, 'text');
    el.setAttribute('class', 'heart-row-svg');
    el.setAttribute('x', left);
    el.setAttribute('y', top + height*0.78);
    el.setAttribute('font-size', fontSize);
    el.setAttribute('textLength', width);
    el.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    el.textContent = text;
    frag.appendChild(el);
}

for(var r=0; r<rows; r++){
    var y = topY + r*stepY + stepY/2;
    var rowTop = y - rowHeight/2;

    var b = heartBounds(y);
    if(!b || b.width < 1) continue;

    makeRow(b.left, b.width, rowTop, rowHeight);
}
fillHost.appendChild(frag);
})();


/* ---------- scene 0 : envelope ---------- */
var envelope = document.getElementById('envelope');
var openBtn = document.getElementById('btn-open-envelope');
openBtn.addEventListener('click', function(){
envelope.classList.add('open');
setTimeout(function(){ showScene('scene-heart'); }, 1150);
});

/* ---------- scene 1 : heart question, dodging "Hăm" button ---------- */
var noBtn = document.getElementById('btn-no');
var yesBtn = document.getElementById('btn-yes');
var row = document.querySelector('.heart-question-row');

function dodge(){
var rowRect = row.getBoundingClientRect();
if(!noBtn.classList.contains('floating')){
    // first escape: lock in its current on-screen spot before going absolute,
    // so it doesn't jump or land on top of the other button
    var startRect = noBtn.getBoundingClientRect();
    noBtn.style.left = (startRect.left - rowRect.left) + 'px';
    noBtn.style.top = (startRect.top - rowRect.top) + 'px';
    noBtn.classList.add('floating');
    void noBtn.offsetWidth; // flush the position change before animating away
}
var btnRect = noBtn.getBoundingClientRect();
var maxX = Math.max(rowRect.width - btnRect.width, 10);
var maxY = Math.max(rowRect.height - btnRect.height, 10);

// keep clear of the "Có" button — never land on top of it
var yesRect = yesBtn.getBoundingClientRect();
var margin = 14;
var forbidden = {
    left:   (yesRect.left - rowRect.left) - btnRect.width - margin,
    right:  (yesRect.right - rowRect.left) + margin,
    top:    (yesRect.top - rowRect.top) - btnRect.height - margin,
    bottom: (yesRect.bottom - rowRect.top) + margin
};

var randX, randY, tries = 0;
do{
    randX = Math.random()*maxX;
    randY = Math.random()*maxY;
    tries++;
} while(
    tries < 20 &&
    randX > forbidden.left && randX < forbidden.right &&
    randY > forbidden.top && randY < forbidden.bottom
);

noBtn.style.left = randX + 'px';
noBtn.style.top = randY + 'px';
}
noBtn.addEventListener('mouseenter', dodge);
noBtn.addEventListener('touchstart', function(e){ e.preventDefault(); dodge(); }, {passive:false});
noBtn.addEventListener('click', function(e){ e.preventDefault(); dodge(); });

yesBtn.addEventListener('click', function(){ showScene('scene-letter1'); });

/* ---------- letters ---------- */
document.getElementById('btn-letter1-next').addEventListener('click', function(){ showScene('scene-letter2'); });
document.getElementById('btn-letter2-next').addEventListener('click', function(){
document.getElementById('bleedAnswerView').style.display = 'none';
document.getElementById('bleedQuestionView').style.display = 'flex';
showScene('scene-bleed');
});

/* ---------- bleeding heart reveal: heart vanishes, a letter appears ---------- */
var bleedQuestionView = document.getElementById('bleedQuestionView');
var bleedAnswerView = document.getElementById('bleedAnswerView');
document.getElementById('btn-bleed-ask').addEventListener('click', function(){
bleedQuestionView.style.display = 'none';
bleedAnswerView.style.display = 'flex';
});
document.getElementById('btn-bleed-next').addEventListener('click', function(){
showScene('scene-timeline');
});

/* ---------- timeline ---------- */
document.querySelectorAll('.tl-node').forEach(function(node){
var idx = node.getAttribute('data-node');
var detail = document.getElementById('tl-detail-'+idx);
// move detail panel right after this node for natural flow
node.parentNode.insertBefore(detail, node.nextSibling);

function toggle(){
    var wasOpen = node.classList.contains('open');
    document.querySelectorAll('.tl-node').forEach(function(n){ n.classList.remove('open'); });
    if(!wasOpen){ node.classList.add('open'); }
}
node.querySelector('.tl-dot').addEventListener('click', toggle);
node.querySelector('.tl-label').addEventListener('click', toggle);
});

})();

