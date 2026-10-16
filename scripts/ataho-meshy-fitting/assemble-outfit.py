"""아타호의 보정된 부품을 기존 뼈대에 합치고 착의 리소스를 저장한다.

실행: Blender --background --factory-startup --python scripts/ataho-meshy-fitting/assemble-outfit.py
원본 모델은 유지하고 착의용 파생본만 만든다.
"""

import argparse
import json
import math
import runpy
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/assets/maplestory'
FITTED = ASSETS / 'ataho-meshy-outfit/20261016/fitted'
BODY = ASSETS / 'ataho-meshy-body/20261016/rigging'


def import_gltf(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return set(bpy.data.objects) - before


def set_action(rig, action):
    rig.animation_data_clear()
    for p in rig.pose.bones:
        p.matrix_basis.identity()
    if action:
        rig.animation_data_create()
        rig.animation_data.action = action
        rig.animation_data.action_slot = action.slots[0]
    rig.data.pose_position = 'POSE'
    bpy.context.view_layer.update()


def append_part(path, name, rig):
    with bpy.data.libraries.load(str(path), link=False) as (source, target):
        if name not in source.objects:
            raise RuntimeError(f'{path}: {name} 메시 없음: {source.objects}')
        target.objects = [name]
    obj = target.objects[0]
    bpy.context.collection.objects.link(obj)
    matrix = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = matrix
    for modifier in list(obj.modifiers):
        if modifier.type == 'ARMATURE':
            obj.modifiers.remove(modifier)
    modifier = obj.modifiers.new('Ataho shared rig', 'ARMATURE')
    modifier.object = rig
    obj.name = name
    # 단독 Blender 파일의 원본 뼈대는 연결하지 않고 동일 이름의 통합 뼈대에 붙인다.
    return obj


def cloth_material(obj):
    for mat in obj.data.materials:
        if not mat or not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                node.inputs['Roughness'].default_value = 0.9
                node.inputs['Metallic'].default_value = 0


def mesh_object(name, vertices, faces, material, rig):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    obj.vertex_groups.new(name='Hips').add(list(range(len(vertices))), 1, 'REPLACE')
    modifier = obj.modifiers.new('Ataho shared rig', 'ARMATURE')
    modifier.object = rig
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def world_bvh(obj):
    vertices = [obj.matrix_world @ v.co for v in obj.data.vertices]
    return BVHTree.FromPolygons(vertices, [list(p.vertices) for p in obj.data.polygons], all_triangles=False)


def make_sash(body, pants, rig):
    material = bpy.data.materials.new('Brown woven sash')
    material.use_nodes = True
    node = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value = (0.24, 0.105, 0.055, 1)
    node.inputs['Roughness'].default_value = 0.97
    material.diffuse_color = (0.24, 0.105, 0.055, 1)
    bvhs = [world_bvh(body), world_bvh(pants)]
    count = 160
    levels = [0.718, 0.735, 0.778, 0.798]
    vertices = []
    faces = []
    for z in levels:
        for i in range(count):
            angle = 2 * math.pi * i / count
            direction = Vector((math.cos(angle), math.sin(angle), 0))
            actual_z = z + 0.025*max(0,math.sin(angle))*((z-0.718)/0.08)
            origin = Vector((0, 0.007, actual_z))
            distances = []
            for tree in bvhs:
                point = origin.copy()
                for _ in range(10):
                    hit, _, _, _ = tree.ray_cast(point, direction, 0.7)
                    if hit is None:
                        break
                    distances.append((hit - origin).dot(direction))
                    point = hit + direction * 0.0002
            radius = max(distances, default=0.32) + 0.012
            vertices.append(origin + direction * radius)
    for level in range(len(levels)-1):
        for i in range(count):
            j = (i+1) % count
            faces.append((level*count+i, level*count+j, (level+1)*count+j, (level+1)*count+i))
    band = mesh_object('SashBand', vertices, faces, material, rig)
    front_hit=world_bvh(band).ray_cast(Vector((0.015,0.007,0.76)),Vector((0,-1,0)),0.8)[0]
    front = front_hit.y if front_hit is not None else -0.34
    knot_y = front - 0.02
    # 띠 끝은 조금 앞으로 휘게 만들어 다리가 움직일 공간을 확보한다.
    tails = []
    for index, (start, end, bottom, width) in enumerate([(-0.015, -0.065, 0.35, 0.075), (0.035, 0.095, 0.455, 0.065)]):
        vertices = []
        faces = []
        for i in range(13):
            t = i/12
            x = start*(1-t)+end*t + math.sin(t*math.pi)*0.01
            y = knot_y - 0.025 - math.sin(t*math.pi/2)*0.07 - index*0.008
            z = 0.751*(1-t)+bottom*t
            w = width*(1-0.25*t)
            vertices.extend([(x-w/2,y,z),(x+w/2,y,z+0.005*math.sin(t*math.pi))])
        for i in range(12):
            faces.append((i*2,i*2+1,i*2+3,i*2+2))
        tail = mesh_object(f'SashTail{index+1}', vertices, faces, material, rig)
        tails.append(tail)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=(0.015,knot_y,0.76))
    knot = bpy.context.object
    knot.name = 'SashKnot'
    knot.scale = (0.062,0.032,0.043)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    knot.data.materials.append(material)
    knot.vertex_groups.new(name='Hips').add(list(range(len(knot.data.vertices))),1,'REPLACE')
    knot.modifiers.new('Ataho shared rig','ARMATURE').object = rig
    for p in knot.data.polygons:
        p.use_smooth = True
    connector = make_flask_connector(band,rig)
    return [band,knot,*tails,connector]



def make_flask_connector(band,rig):
    neck = Vector((-0.291076,-0.285,0.798074))
    start = min((v.co.copy() for v in band.data.vertices), key=lambda point:(point-neck).length)
    material = bpy.data.materials.new('Flask attachment cord')
    material.use_nodes = True
    node = next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value = (0.52,0.33,0.15,1)
    node.inputs['Roughness'].default_value = 0.95
    vertices=[]
    faces=[]
    tangent=(neck-start).normalized()
    u=tangent.cross(Vector((0,0,1))).normalized()
    v=tangent.cross(u).normalized()
    for i in range(9):
        t=i/8
        center=start.lerp(neck,t)+Vector((0,-0.004*math.sin(t*math.pi),-0.012*math.sin(t*math.pi)))
        for j in range(8):
            angle=j*math.pi/4
            vertices.append(center+0.0035*(u*math.cos(angle)+v*math.sin(angle)))
    for i in range(8):
        for j in range(8):
            k=(j+1)%8
            faces.append((i*8+j,i*8+k,(i+1)*8+k,(i+1)*8+j))
    return mesh_object('FlaskConnector',vertices,faces,material,rig)


def cinch_jacket(jacket,band):
    tree=world_bvh(band)
    adjusted=0
    for vertex in jacket.data.vertices:
        point=vertex.co
        influence=max(0,1-abs(point.z-0.758)/0.10)
        if not influence:
            continue
        origin=Vector((0,0.007,min(max(point.z,0.721),0.795)))
        direction=Vector((point.x,point.y-0.007,0))
        length=direction.length
        if length<0.01:
            continue
        direction.normalize()
        hit=tree.ray_cast(origin,direction,0.8)[0]
        if hit is None:
            continue
        radius=(hit-origin).length-0.008
        if length>radius:
            length=length-(length-radius)*influence
            vertex.co.x=direction.x*length
            vertex.co.y=0.007+direction.y*length
            adjusted+=1
    jacket.data.update()
    return adjusted




def lock_waist_weights(obj,fade_start,locked_start,locked_end,fade_end):
    hips=obj.vertex_groups.get('Hips')
    changed=0
    for vertex in obj.data.vertices:
        z=(obj.matrix_world@vertex.co).z
        low=min(1,max(0,(z-fade_start)/(locked_start-fade_start)))
        high=1 if z<=locked_end else max(0,(fade_end-z)/(fade_end-locked_end))
        alpha=low*high
        if alpha<=0:
            continue
        weights={group.group:group.weight*(1-alpha) for group in vertex.groups}
        weights[hips.index]=weights.get(hips.index,0)+alpha
        top=sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4]
        total=sum(weight for _,weight in top)
        for group in obj.vertex_groups:
            group.remove([vertex.index])
        for index,weight in top:
            if weight>0.000001:
                obj.vertex_groups[index].add([vertex.index],weight/total,'REPLACE')
        changed+=1
    return changed


def smooth_torso_weights(body):
    stops=[(0.78,'Hips'),(0.90,'Spine02'),(1.02,'Spine01'),(1.13703,'Spine')]
    group_indices={group.name:group.index for group in body.vertex_groups}
    changed=0
    for vertex in body.data.vertices:
        point=body.matrix_world@vertex.co
        alpha=min(1,max(0,(point.z-0.74)/0.04))*min(1,max(0,(1.13-point.z)/0.05))*min(1,max(0,(0.32-abs(point.x))/0.03))
        if alpha<=0:
            continue
        desired={}
        for (low,a),(high,b) in zip(stops,stops[1:]):
            if low<=point.z<=high:
                t=(point.z-low)/(high-low)
                desired[group_indices[a]]=1-t
                desired[group_indices[b]]=t
                break
        if point.z<stops[0][0]:
            desired[group_indices['Hips']]=1
        weights={group.group:group.weight*(1-alpha) for group in vertex.groups}
        for index,weight in desired.items():
            weights[index]=weights.get(index,0)+weight*alpha
        top=sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4]
        total=sum(weight for _,weight in top)
        for group in body.vertex_groups:
            group.remove([vertex.index])
        for index,weight in top:
            if weight>0.000001:
                body.vertex_groups[index].add([vertex.index],weight/total,'REPLACE')
        changed+=1
    return changed


def unify_body_seam_weights(body):
    groups={}
    for vertex in body.data.vertices:
        point=body.matrix_world@vertex.co
        key=tuple(round(coordinate,5) for coordinate in point)
        groups.setdefault(key,[]).append(vertex.index)
    changed=0
    for indices in groups.values():
        if len(indices)<2:
            continue
        weights={}
        for index in indices:
            for group in body.data.vertices[index].groups:
                weights[group.group]=weights.get(group.group,0)+group.weight/len(indices)
        top=sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4]
        total=sum(weight for _,weight in top)
        if not total:
            continue
        for group in body.vertex_groups:
            group.remove(indices)
        for index,weight in top:
            body.vertex_groups[index].add(indices,weight/total,'REPLACE')
        changed+=1
    return changed


def mask_covered_body(body,jacket,arm_cutoff_x):
    # 의복 아래 면만 착의용 사본에서 가리고 머리·목의 털은 보존한다.
    bm = bmesh.new()
    bm.from_mesh(body.data)
    head_names={'Head','neck','head_end','headfront'}
    arm_names={f'{side}{part}' for side in ['Left','Right'] for part in ['Shoulder','Arm','ForeArm']}
    head_indices={group.index for group in body.vertex_groups if group.name in head_names}
    arm_indices={group.index for group in body.vertex_groups if group.name in arm_names}
    head_weights=[sum(group.weight for group in vertex.groups if group.group in head_indices) for vertex in body.data.vertices]
    arm_weights=[sum(group.weight for group in vertex.groups if group.group in arm_indices) for vertex in body.data.vertices]
    remove = []
    jacket_tree=world_bvh(jacket)
    for face in bm.faces:
        points = [body.matrix_world @ v.co for v in face.verts]
        protected=any(head_weights[v.index]>=0.20 for v in face.verts)
        covered_shoulder=all(0.215<abs(p.x)<arm_cutoff_x and 1.10<p.z<1.36 for p in points) and sum(arm_weights[v.index] for v in face.verts)/len(face.verts)>0.4
        covered_back=all(abs(p.x)<0.28 and p.y>0.09 and 0.185<p.z<1.26 for p in points)
        covered_leg = all(0.185 < p.z < 0.74 and abs(p.x) < 0.44 for p in points)
        covered_arm = all(0.99 < p.z < 1.30 and 0.18 < abs(p.x) < arm_cutoff_x for p in points)
        if covered_arm:
            center=sum(points,Vector())/len(points)
            hit=jacket_tree.ray_cast(Vector((center.x,-2,center.z)),Vector((0,1,0)),4)[0]
            covered_arm=hit is not None and hit.y<center.y-0.003
        if (covered_leg or covered_arm or covered_shoulder or covered_back) and not protected:
            remove.append(face)
    count = len(remove)
    bmesh.ops.delete(bm, geom=remove, context='FACES')
    bm.to_mesh(body.data)
    bm.free()
    body.data.update()
    return count


def setup_camera(scene):
    camera_data = bpy.data.cameras.new('OutfitReviewCamera')
    camera = bpy.data.objects.new('OutfitReviewCamera', camera_data)
    scene.collection.objects.link(camera)
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 2.02
    scene.camera = camera
    for name, loc, energy, size in [('Key',(2,-3,4),380,4),('Fill',(-3,-2,2),240,4),('Rim',(1,2,3),300,3)]:
        data = bpy.data.lights.new(name,'AREA')
        data.energy = energy
        data.shape = 'DISK'
        data.size = size
        obj = bpy.data.objects.new(name,data)
        scene.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (Vector((0,0,0.8))-obj.location).to_track_quat('-Z','Y').to_euler()
    scene.world = bpy.data.worlds.new('OutfitReviewWorld')
    scene.world.use_nodes = True
    background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    background.inputs['Color'].default_value = (0.19,0.22,0.27,1)
    background.inputs['Strength'].default_value = 0.5
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 850
    scene.render.resolution_y = 850
    scene.render.resolution_percentage = 100
    return camera


def render(scene, camera, name, location,output):
    camera.location = location
    camera.rotation_euler = (Vector((0,0,0.81))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = str(output / f'reviews/{name}.png')
    bpy.ops.render.render(write_still=True)


def selected(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]



def neutral_action(rig):
    set_action(rig,None)
    for side,sign in [('Left',1),('Right',-1)]:
        bone=rig.data.bones[f'{side}Arm']
        child=rig.data.bones[f'{side}ForeArm']
        rest=(child.head_local-bone.head_local).normalized()
        target=Vector((sign*0.27,-0.05,-0.96)).normalized()
        rotation=rest.rotation_difference(target)
        basis=bone.matrix_local.to_quaternion()
        pose=rig.pose.bones[bone.name]
        pose.rotation_mode='QUATERNION'
        pose.rotation_quaternion=basis.inverted()@rotation@basis
    rig.animation_data_create()
    action=bpy.data.actions.new('AtahoNeutral')
    rig.animation_data.action=action
    for pose in rig.pose.bones:
        pose.keyframe_insert(data_path='location',frame=1)
        pose.keyframe_insert(data_path='rotation_quaternion',frame=1)
        pose.keyframe_insert(data_path='scale',frame=1)
    action.use_frame_range=True
    action.frame_start=action.frame_end=1
    action.use_fake_user=True
    set_action(rig,action)
    bpy.context.scene.frame_set(1)
    return action


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--variant',choices=['initial','concept'],default='concept')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    output=FITTED/'concept' if args.variant=='concept' else FITTED
    output.mkdir(parents=True,exist_ok=True)
    (output/'reviews').mkdir(exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 30
    bpy.context.preferences.filepaths.save_version=0
    imported = import_gltf(BODY/'ataho-body-rigged.glb')
    rig = next(o for o in imported if o.type=='ARMATURE')
    body = next(o for o in imported if o.type=='MESH' and len(o.data.vertices)>1000)
    rig.name = 'AtahoRig'
    body.name = 'AtahoBody'
    set_action(rig,None)
    tail_removed=runpy.run_path(str(ROOT/'scripts/ataho-meshy-fitting/remove-tail.py'))['remove_tail'](body)
    actions = {}
    for mode in ['walk','run']:
        imported = import_gltf(BODY/f'ataho-body-{mode}.glb')
        other = next(o for o in imported if o.type=='ARMATURE')
        action = other.animation_data.action
        action.name = f'Ataho{mode.title()}'
        action.use_fake_user = True
        action.use_frame_range = True
        action.frame_start = round(action.frame_range.x)
        action.frame_end = 32 if mode=='walk' else 20
        actions[mode] = action
        for obj in imported:
            bpy.data.objects.remove(obj,do_unlink=True)
    set_action(rig,None)
    suffix='-concept' if args.variant=='concept' else ''
    jacket = append_part(FITTED/f'parts/jacket{suffix}/fit-jacket.blend','Jacket',rig)
    pants = append_part(FITTED/f'parts/pants{suffix}/fit-pants.blend','Pants',rig)
    flask = append_part(FITTED/'parts/flask/fit-flask.blend','Flask',rig)
    for obj in [jacket,pants]:
        cloth_material(obj)
    pants_waist = lock_waist_weights(pants,0.56,0.70,0.75,0.76)
    jacket_waist = lock_waist_weights(jacket,0.65,0.73,0.84,0.93)
    torso = smooth_torso_weights(body)
    seams = unify_body_seam_weights(body)
    sash_module=runpy.run_path(str(ROOT/'scripts/ataho-meshy-fitting/make-sash-concept.py')) if args.variant=='concept' else None
    sash_builder=sash_module['build_sash'] if sash_module else make_sash
    # 띠는 가려질 본체 면도 포함한 원래 체형에 맞춘 뒤 본체 사본을 마스킹한다.
    sash = sash_builder(body,pants,rig)
    sash_diagnostics=sash_module['band_geometry_diagnostics'](sash[0],body,pants) if sash_module else None
    masked = mask_covered_body(body,jacket,0.45 if args.variant=='concept' else 0.56)
    cinched = cinch_jacket(jacket,sash[0])
    objects = [rig,body,jacket,pants,flask,*sash]
    # glTF가 같은 Armature의 자식으로 스킨을 내보내도록 월드 좌표를 보존한다.
    for obj in [body,jacket,pants,flask,*sash]:
        matrix = obj.matrix_world.copy()
        obj.parent = rig
        obj.matrix_world = matrix
    camera = setup_camera(scene)
    for obj in list(scene.objects):
        if obj.type=='MESH' and obj not in objects:
            bpy.data.objects.remove(obj,do_unlink=True)
    scene.frame_start = 1
    scene.frame_end = 32
    bpy.ops.wm.save_as_mainfile(filepath=str(output/'ataho-outfit.blend'))
    actions['neutral']=neutral_action(rig)
    set_action(rig,None)
    report = {'variant':args.variant,'waistLockedVertices':{'pants':pants_waist,'jacket':jacket_waist},'bodyTorsoSmoothedVertices':torso,'bodySeamWeightGroups':seams,'jacketCinchedVertices':cinched,'tailRemoved':tail_removed,'bodyFacesMasked':masked,'sashBandGeometryBeforeBodyMask':sash_diagnostics,'paidCredits':0,'bones':len(rig.data.bones),'parts':{},'actions':{k:list(v.frame_range) for k,v in actions.items()}}
    for obj in [body,jacket,pants,flask,*sash]:
        report['parts'][obj.name] = {'vertices':len(obj.data.vertices),'polygons':len(obj.data.polygons),'matrixWorld':[list(row) for row in obj.matrix_world]}
    for mode in ['rigged','neutral','walk','run']:
        action = actions.get(mode)
        set_action(rig,action)
        scene.frame_start = 1
        scene.frame_end = round(action.frame_range.y) if action else 1
        scene.frame_set(1)
        selected(objects)
        bpy.ops.export_scene.gltf(filepath=str(output/f'ataho-outfit-{mode}.glb'),use_selection=True,export_animations=bool(action),export_animation_mode='ACTIVE_ACTIONS',export_nla_strips_merged_animation_name=f'Ataho{mode.title()}',export_frame_range=True,export_force_sampling=True,export_def_bones=True,export_skins=True,export_all_influences=False)
        bpy.ops.export_scene.fbx(filepath=str(output/f'ataho-outfit-{mode}.fbx'),use_selection=True,object_types={'ARMATURE','MESH'},bake_anim=bool(action),bake_anim_use_all_actions=False,bake_anim_use_nla_strips=False,add_leaf_bones=False,path_mode='COPY',embed_textures=True)
        if args.render:
            if not action:
                for view,location in [('front',(0,-4,0.9)),('side',(4,0,0.9)),('back',(0,4,0.9))]:
                    render(scene,camera,f'outfit-{view}',location,output)
            elif mode=='neutral':
                for view,location in [('front',(0,-4,0.9)),('side',(4,0,0.9)),('three-quarter',(1.5,-4,1.1)),('back',(0,4,0.9)),('rear-three-quarter',(4,2,1.35))]:
                    render(scene,camera,f'outfit-neutral-{view}',location,output)
            else:
                frames = [1,round(scene.frame_end*.33),round(scene.frame_end*.66),scene.frame_end]
                for frame in frames:
                    scene.frame_set(frame)
                    render(scene,camera,f'outfit-{mode}-{frame:02d}',(2.5,-4,1.35),output)
                    if (mode=='walk' and frame==11) or (mode=='run' and frame==7):
                        render(scene,camera,f'outfit-{mode}-{frame:02d}-side',(4,0,0.9),output)
                    if mode=='run' and frame in [7,13]:
                        render(scene,camera,f'outfit-run-{frame:02d}-rear-three-quarter',(4,2,1.35),output)
    set_action(rig,actions['walk'])
    scene.frame_start,scene.frame_end = 1,32
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(output/'ataho-outfit.blend'))
    (output/'assembly-diagnostics.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('ASSEMBLY',json.dumps(report,ensure_ascii=False))


if __name__=='__main__':
    main()
