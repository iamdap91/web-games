import json, hashlib
from pathlib import Path
from PIL import Image
root=Path('/Users/3sam3/.codex/worktrees/ataho-grab-motions/web-games')
p=root/'resources/ataho-v2-grab-motion-refinement.json'
r=json.loads(p.read_text())
omit={'ground-throw-south-east':{2,3,4},'ground-throw-north-east':{2,3},'sacrifice-throw-south-east':{12},'sacrifice-throw-north-east':set()}
impact={'ground-throw-south-east':10,'ground-throw-north-east':9,'sacrifice-throw-south-east':9,'sacrifice-throw-north-east':8}
for c in r['clips']:
 frames=c['playback']['frames']
 removed=[{**x,'reason':'중심을 실은 뒤 다시 들어 올리는 역행을 줄임' if c['technique']=='ground-throw' else '착지한 상대가 잠깐 상체를 세웠다가 다시 눕는 프레임 제외'} for x in frames if x['sourceStage']=='throw' and x['sourceIndex'] in omit[c['id']]]
 frames=[x for x in frames if not(x['sourceStage']=='throw' and x['sourceIndex'] in omit[c['id']])]
 for x in frames:
  s=x['sourceStage']; i=x['sourceIndex']
  if s=='load':
   x['durationMs']=100 if i==0 else 70
   x['phase']='대치' if i==0 else '붙잡기' if i<=3 else '중심 이동'
  elif s=='key-c':x.update(durationMs=100,phase='중심 지지')
  elif s=='throw':
   at=impact[c['id']]
   x['durationMs']=120 if i==at else 50 if i<at else 70
   x['phase']='던짐' if i<at else '착지' if i==at else '자세 회수'
  elif s=='end':x.update(durationMs=650,phase='정리')
 c['playback'].update(frames=frames,excludedFrames=removed,selectionRationale='PixelLab 원본을 순서대로 사용하고 역행하는 구간만 제외했다. 접촉 유지 구간 뒤 던짐을 빠르게, 첫 착지는 120ms 유지한다.',durationMs=sum(x['durationMs'] for x in frames))
 c['reviewNotes']= ('등·어깨에 실어 앞으로 넘기는 동작. 정확한 유도 허리 메치기로 단정하지 않는다.' if c['technique']=='ground-throw' else '발바닥으로 지지한 뒤 뒤로 넘기고 일어난다. 공중으로 멀리 분리되는 궤적보다 가까이 굴러 내려오는 형태이며 회전 중 두 몸이 겹친다.')
r['status']='packaging-motion-review'
r['usage']={'completedPaidCalls':len(r['jobs']),'chargedGenerations':sum(x['chargedGenerations'] for x in r['results']),'paidRetries':0,'inputValidationFailuresWithoutJob':len(r.get('validationFailures',[])),'newGeneratedImages':100,'downloadedPngFilesIncludingAnimationSourceFrames':108}
r['sourcePreservation']={'previousRevisionPreserved':True,'generatedPngPixelsModified':False,'crossDirectionFramesSpliced':False,'sourceFrameCoordinateTransformsApplied':False,'receiverAndAtahoFlattenedTogether':True}
r['knownLimitations']=['상대와 아타호가 한 PNG에 함께 그려진 연출 검토용 리소스다. 두 배우를 독립 조작하는 본게임 스프라이트 연결은 이 작업에 포함하지 않았다.','지상은 등·어깨에 싣는 형태이며, 누워 넘기기는 회전 중 두 인물의 윤곽이 겹치는 구간이 남아 있다.']
r['referenceFiles']=[]
b=root/'public/assets/maplestory/ataho-v2-grabs/20261021/refinement-r2/references'
for f in sorted(b.glob('*.png')):
 with Image.open(f) as im:
  r['referenceFiles'].append({'localPath':f.relative_to(root).as_posix(),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'width':im.width,'height':im.height,'mode':im.mode,'uploadedUrl':r['references'].get(f.stem)})
r['referenceComposition']={'canvas':{'width':192,'height':144},'groundY':128,'start':{'guardOffset':{'x':40,'y':49},'clayStandOffset':{'x':92,'y':66}},'groundEnd':{'guardOffset':{'x':40,'y':49},'clayDownOffset':{'x':116,'y':65}},'sacrificeEnd':{'guardOffset':{'x':56,'y':49},'clayDownOffset':{'x':3,'y':65}},'inputFolder':'public/assets/maplestory/ataho-v2-grabs/20261021/references','sourcePixelsScaledOrRotated':False}
p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'clips':[{'id':c['id'],'selectedFrames':len(c['playback']['frames']),'durationMs':c['playback']['durationMs'],'excluded':sorted(omit[c['id']])} for c in r['clips']],'usage':r['usage']},ensure_ascii=False,indent=2))
