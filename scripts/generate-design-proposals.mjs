import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const out = new URL('../docs/design-proposals/', import.meta.url);
await mkdir(out, { recursive: true });

const C={ink:'#172235',muted:'#687386',line:'#DFE5EA',paper:'#F7F8F6',white:'#FFFFFF',blue:'#2868E8',mint:'#12A57A',coral:'#FF6B5F',yellow:'#FFCB45',navy:'#10233F',map:'#E9EFEA'};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const t=(x,y,s,size=16,weight=500,fill=C.ink,anchor='start')=>`<text x="${x}" y="${y}" font-family="Arial, Noto Sans KR, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
const rr=(x,y,w,h,r=16,fill=C.white,stroke='none',sw=1)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const chip=(x,y,w,label,fill=C.white,color=C.ink)=>rr(x,y,w,36,18,fill,C.line)+t(x+w/2,y+23,label,14,700,color,'middle');
const pin=(x,y,n,color)=>`<circle cx="${x}" cy="${y}" r="18" fill="${color}" stroke="white" stroke-width="4"/>${t(x,y+5,String(n),14,800,'white','middle')}`;
const map=(x,y,w,h,dark=false)=>{
 const bg=dark?'#142A3E':C.map, road=dark?'#294156':'#D0DAD3', water=dark?'#173C55':'#CFE7E7';
 let s=rr(x,y,w,h,22,bg);
 s+=`<path d="M${x} ${y+h*.72} C${x+w*.2} ${y+h*.52},${x+w*.38} ${y+h*.85},${x+w*.58} ${y+h*.64} S${x+w*.82} ${y+h*.37},${x+w} ${y+h*.5} L${x+w} ${y+h} L${x} ${y+h}Z" fill="${water}" opacity=".62"/>`;
 for(let i=1;i<8;i++) s+=`<path d="M${x+w*i/8} ${y} C${x+w*(i-1)/8} ${y+h*.35},${x+w*(i+1)/8} ${y+h*.65},${x+w*i/8} ${y+h}" fill="none" stroke="${road}" stroke-width="2"/>`;
 for(let i=1;i<6;i++) s+=`<path d="M${x} ${y+h*i/6} C${x+w*.3} ${y+h*(i-1)/6},${x+w*.7} ${y+h*(i+1)/6},${x+w} ${y+h*i/6}" fill="none" stroke="${road}" stroke-width="2"/>`;
 return s;
};
const base=(w,h,body,bg=C.paper)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`;

function desktop1(){let s='';
 s+=rr(0,0,1440,72,0,C.white)+t(32,44,'여로담',24,800,C.navy)+t(132,43,'JEJU · 3박 4일',14,700,C.muted)+chip(1120,18,112,'공유하기')+chip(1244,18,164,'일정 내보내기',C.navy,'white');
 s+=map(388,88,1028,788); s+=t(420,128,'지도에서 장소를 고르고, 바로 동선을 확인하세요',16,700,C.navy);
 s+=rr(24,88,340,788,24,C.white)+t(48,128,'장소 찾기',24,800)+rr(48,148,292,52,14,'#F2F5F7')+t(68,181,'⌕  제주 맛집 또는 주소 검색',15,500,C.muted);
 s+=chip(48,218,62,'전체',C.navy,'white')+chip(120,218,62,'맛집')+chip(192,218,62,'카페')+chip(264,218,76,'관광지');
 const rows=[['돈사돈 본점','흑돼지 · 4.5','12분'],['카페 한라산','카페 · 4.7','8분'],['성산일출봉','관광지 · 4.8','26분']];
 rows.forEach((r,i)=>{let y=282+i*116;s+=rr(40,y,308,100,16,'#FFF',i===0?C.blue:C.line,i===0?2:1)+rr(52,y+12,76,76,12,['#E5B39C','#A8D8D8','#E7C67F'][i])+t(144,y+36,r[0],17,800)+t(144,y+60,r[1],14,500,C.muted)+t(300,y+80,'＋ 담기',13,800,C.blue,'middle');});
 s+=rr(40,654,308,198,18,'#F5F7FA')+t(58,688,'오늘의 동선',18,800)+t(310,688,'3곳',14,700,C.blue,'end');
 ['09:30  돈사돈 본점','11:20  카페 한라산','14:00  성산일출봉'].forEach((v,i)=>{s+=`<circle cx="66" cy="${722+i*38}" r="8" fill="${[C.coral,C.mint,C.yellow][i]}"/>`+t(86,728+i*38,v,14,600);});
 s+=`<path d="M650 626 C760 520,910 594,1034 386" stroke="${C.blue}" stroke-width="6" fill="none" stroke-linecap="round"/>`+pin(650,626,1,C.coral)+pin(840,548,2,C.mint)+pin(1034,386,3,C.yellow);
 s+=rr(1018,694,370,150,20,C.white)+t(1042,730,'예상 4시간 20분 · 이동 46분',18,800)+t(1042,758,'동선이 짧은 순서로 정리했어요',14,500,C.muted)+rr(1042,782,322,44,12,C.blue)+t(1203,810,'이 동선으로 일정 만들기',15,800,'white','middle'); return base(1440,900,s);}

function mobile1(){let s='';s+=map(0,0,390,844);s+=rr(16,18,358,54,18,C.white)+t(34,51,'⌕  장소, 주소 검색',15,600,C.muted)+rr(318,28,42,34,13,C.navy)+t(339,51,'☰',16,700,'white','middle');
 s+=`<path d="M86 340 C150 270,220 390,300 224" stroke="${C.blue}" stroke-width="5" fill="none"/>`+pin(86,340,1,C.coral)+pin(196,316,2,C.mint)+pin(300,224,3,C.yellow);
 s+=rr(0,512,390,332,28,C.white)+rr(166,524,58,5,3,'#D8DDE3')+t(22,566,'오늘의 동선',22,800)+t(366,566,'3곳',14,700,C.blue,'end');
 [['09:30','돈사돈 본점','식사 · 60분'],['11:20','카페 한라산','휴식 · 50분'],['14:00','성산일출봉','관광 · 90분']].forEach((r,i)=>{let y=600+i*62;s+=`<circle cx="34" cy="${y}" r="13" fill="${[C.coral,C.mint,C.yellow][i]}"/>`+t(58,y-2,r[0]+'  '+r[1],15,800)+t(58,y+19,r[2],13,500,C.muted);});
 s+=rr(18,780,354,48,15,C.blue)+t(195,810,'이 동선으로 일정 만들기',16,800,'white','middle');return base(390,844,s);}

function desktop2(){let s='';s+=rr(0,0,1440,84,0,C.white)+t(36,50,'여로담',24,800,C.navy)+t(128,49,'처음이어도 3단계면 충분해요',15,600,C.muted);
 [['1','장소 담기'],['2','동선 확인'],['3','일정 완성']].forEach((r,i)=>{let x=500+i*230;s+=`<circle cx="${x}" cy="42" r="18" fill="${i===1?C.blue:'#E8ECF0'}"/>`+t(x,47,r[0],13,800,i===1?'white':C.muted,'middle')+t(x+30,47,r[1],15,700,i===1?C.blue:C.muted);if(i<2)s+=`<line x1="${x+126}" y1="42" x2="${x+202}" y2="42" stroke="${C.line}" stroke-width="2"/>`;});
 s+=map(24,106,850,770)+rr(898,106,518,770,24,C.white)+t(930,154,'2단계 · 동선을 확인해 주세요',25,800)+t(930,184,'순서를 바꾸면 지도와 시간이 바로 갱신됩니다.',15,500,C.muted);
 const rows=[['1','경복궁','09:00–10:30','필수'],['2','통인시장','10:42–11:40','점심'],['3','국립민속박물관','11:52–13:10','추천'],['4','서촌 카페거리','13:22–14:20','휴식']];
 rows.forEach((r,i)=>{let y=220+i*112;s+=rr(922,y,470,92,16,i===1?'#F4F8FF':'#FFF',i===1?C.blue:C.line,i===1?2:1)+`<circle cx="952" cy="${y+46}" r="18" fill="${[C.yellow,C.coral,C.blue,C.mint][i]}"/>`+t(952,y+51,r[0],14,800,'white','middle')+t(984,y+36,r[1],17,800)+t(984,y+62,r[2]+' · '+r[3],14,500,C.muted)+t(1362,y+52,'⋮⋮',18,800,C.muted,'middle');});
 s+=rr(922,690,470,70,16,'#F3F6F8')+t(946,720,'총 5시간 20분',16,800)+t(946,744,'이동 42분 · 걷기 보통',13,500,C.muted)+rr(922,778,470,64,16,C.blue)+t(1157,818,'확정하고 일정 완성하기  →',17,800,'white','middle');
 s+=`<path d="M180 620 C310 450,480 570,690 300" fill="none" stroke="${C.blue}" stroke-width="6"/>`+[ [180,620],[355,492],[510,522],[690,300] ].map((p,i)=>pin(p[0],p[1],i+1,[C.yellow,C.coral,C.blue,C.mint][i])).join('');return base(1440,900,s);}

function mobile2(){let s='';s+=rr(0,0,390,844,0,C.paper)+t(20,42,'여로담',20,800,C.navy)+t(370,42,'도움말',13,700,C.blue,'end');
 [['1','담기'],['2','동선'],['3','완성']].forEach((r,i)=>{let x=62+i*132;s+=`<circle cx="${x}" cy="84" r="16" fill="${i===1?C.blue:'#E2E7EB'}"/>`+t(x,89,r[0],12,800,i===1?'white':C.muted,'middle')+t(x+24,89,r[1],13,700,i===1?C.blue:C.muted);});
 s+=t(20,138,'동선을 확인해 주세요',23,800)+t(20,164,'카드를 길게 눌러 순서를 바꿀 수 있어요.',14,500,C.muted);
 const rows=[['경복궁','09:00–10:30'],['통인시장','10:42–11:40'],['국립민속박물관','11:52–13:10'],['서촌 카페거리','13:22–14:20']];rows.forEach((r,i)=>{let y=190+i*104;s+=rr(16,y,358,84,16,C.white,i===1?C.blue:C.line,i===1?2:1)+`<circle cx="46" cy="${y+42}" r="17" fill="${[C.yellow,C.coral,C.blue,C.mint][i]}"/>`+t(46,y+47,String(i+1),13,800,'white','middle')+t(76,y+35,r[0],16,800)+t(76,y+59,r[1],13,500,C.muted)+t(346,y+48,'⋮⋮',18,800,C.muted,'middle');});
 s+=rr(16,626,358,76,16,'#EAF1FF')+t(34,657,'예상 5시간 20분',16,800,C.navy)+t(34,681,'이동 42분 · 무리 없는 일정',13,500,C.muted)+rr(16,768,358,58,16,C.blue)+t(195,804,'확정하고 일정 완성하기',16,800,'white','middle');return base(390,844,s);}

function desktop3(){let s='';s+=rr(0,0,1440,76,0,C.navy)+t(32,46,'여로담',24,800,'white')+t(136,45,'여행 중 모드',14,700,'#BFD1E5')+chip(1160,20,116,'지도 보기','#203A59','white')+chip(1288,20,120,'공유','#203A59','white');
 s+=rr(0,76,320,824,0,'#F2F5F7')+t(28,124,'제주 1일차',23,800)+t(28,150,'2026. 8. 6 · 목요일',14,500,C.muted);
 ['전체 일정','교통·길찾기','예약·메모','여행 자료함'].forEach((v,i)=>{let y=190+i*56;s+=rr(16,y,288,44,12,i===0?C.navy:'transparent')+t(38,y+28,v,15,700,i===0?'white':C.ink);});
 s+=t(28,448,'오늘 요약',15,800)+rr(16,466,288,122,16,C.white)+t(34,496,'4곳 · 09:00—17:30',15,800)+t(34,524,'이동 1시간 12분',14,500,C.muted)+t(34,552,'비 예보 없음 · 27°C',14,500,C.muted);
 s+=t(358,126,'지금부터 이렇게 움직이세요',28,800)+t(358,156,'복잡한 편집 도구는 숨기고, 여행 중 필요한 행동만 보여줍니다.',15,500,C.muted);
 const rows=[['09:00','성산일출봉','제주 서귀포시 성산읍','도착 완료',C.yellow],['11:10','해녀의 집','성산항 근처 · 점심 예약','지금 출발',C.coral],['13:20','아쿠아플라넷 제주','입장권 QR · 자료함','길찾기',C.blue],['16:00','카페 오른','바다 전망 · 창가 좌석','길찾기',C.mint]];rows.forEach((r,i)=>{let y=196+i*154;s+=t(362,y+28,r[0],16,800,C.muted)+rr(438,y,704,126,20,C.white,i===1?C.coral:C.line,i===1?2:1)+`<circle cx="480" cy="${y+42}" r="20" fill="${r[4]}"/>`+t(518,y+36,r[1],19,800)+t(518,y+62,r[2],14,500,C.muted)+chip(968,y+68,144,r[3],i===1?C.coral:'#F2F5F7',i===1?'white':C.navy);if(i<3)s+=`<line x1="390" y1="${y+54}" x2="390" y2="${y+154}" stroke="${C.line}" stroke-width="3"/>`;});
 s+=rr(1170,196,246,550,22,C.navy)+t(1194,236,'다음 장소',14,700,'#BFD1E5')+t(1194,274,'해녀의 집',22,800,'white')+t(1194,304,'차량 18분',15,600,'#BFD1E5')+rr(1192,330,202,180,16,'#24405E')+t(1293,416,'미니 지도',16,700,'#BFD1E5','middle')+rr(1192,534,202,52,14,C.coral)+t(1293,566,'길찾기 시작',16,800,'white','middle')+rr(1192,598,202,52,14,'#203A59')+t(1293,630,'택시기사 카드',15,700,'white','middle');return base(1440,900,s,C.paper);}

function mobile3(){let s='';s+=rr(0,0,390,844,0,C.navy)+t(20,42,'제주 1일차',20,800,'white')+t(370,42,'•••',18,800,'white','end')+t(20,72,'목요일 · 4곳 · 09:00—17:30',13,500,'#BFD1E5');
 s+=t(20,128,'다음 장소',14,700,'#BFD1E5')+t(20,162,'해녀의 집',28,800,'white')+t(20,188,'점심 예약 11:30 · 차량 18분',14,500,'#BFD1E5');s+=map(16,212,358,216,true)+pin(88,354,1,C.yellow)+pin(286,270,2,C.coral);
 s+=rr(16,446,358,62,16,C.coral)+t(195,484,'길찾기 시작  →',17,800,'white','middle')+rr(16,520,171,50,14,'#203A59')+t(102,551,'택시기사 카드',14,700,'white','middle')+rr(203,520,171,50,14,'#203A59')+t(289,551,'한국어 주소 복사',14,700,'white','middle');
 s+=t(20,616,'남은 일정',18,800,'white');[['13:20','아쿠아플라넷 제주'],['16:00','카페 오른']].forEach((r,i)=>{let y=640+i*72;s+=rr(16,y,358,58,14,'#1B3551')+t(34,y+35,r[0],14,700,'#BFD1E5')+t(102,y+35,r[1],15,700,'white');});s+=t(195,816,'일정 편집은 여행 전 모드에서 할 수 있어요',12,500,'#87A2BC','middle');return base(390,844,s,C.navy);}

const files=[['proposal-1-pc-map-focus',desktop1()],['proposal-1-mobile-map-focus',mobile1()],['proposal-2-pc-guided-flow',desktop2()],['proposal-2-mobile-guided-flow',mobile2()],['proposal-3-pc-trip-mode',desktop3()],['proposal-3-mobile-trip-mode',mobile3()]];
for(const [name,svg] of files) await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL(name+'.png',out)));
console.log(`Generated ${files.length} proposal screenshots.`);
