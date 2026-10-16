"""원본을 보존하고 아타호 꼬리를 제거한 몸체 파생본을 만든다.

통합: runpy.run_path(path)['remove_tail'](body) -> 진단 dict
독립 실행: Blender --background --python 이파일 [-- --only rigged]
몸체를 import한 직후, 의상용 body mask 이전의 rest mesh에 적용한다.
"""

import argparse
import array
import hashlib
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/assets/maplestory'
OUTPUT = ASSETS / 'ataho-meshy-outfit/20261016/fitted/parts/body-tailless'
CAP_COLOR = 'TailRootClosureColor'
SOURCE_PATHS = {
    'original': ASSETS / 'ataho-meshy-body/20261015/models/ataho-body.glb',
    'rigged': ASSETS / 'ataho-meshy-body/20261016/rigging/ataho-body-rigged.glb',
    'walk': ASSETS / 'ataho-meshy-body/20261016/rigging/ataho-body-walk.glb',
    'run': ASSETS / 'ataho-meshy-body/20261016/rigging/ataho-body-run.glb',
}


def srgb_linear(value):
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def world_bounds(body):
    points = [body.matrix_world @ vertex.co for vertex in body.data.vertices]
    return [[min(point[i] for point in points), max(point[i] for point in points)] for i in range(3)]


def coordinate_frame(body):
    bounds = world_bounds(body)
    center_x = sum(bounds[0]) * 0.5
    center_y = sum(bounds[1]) * 0.5
    floor = bounds[2][0]
    scale = (bounds[2][1] - floor) / 1.6136681033017197
    return Vector((center_x, center_y, floor)), scale


def ordered_loop(edges):
    edges = set(edges)
    vertices = {vertex for edge in edges for vertex in edge.verts}
    if not all(sum(edge in edges for edge in vertex.link_edges) == 2 for vertex in vertices):
        raise RuntimeError('꼬리 뿌리가 단일 폐곡선이 아닙니다.')
    first = next(iter(vertices))
    order = [first]
    previous = None
    current = first
    while True:
        neighbors = [edge.other_vert(current) for edge in current.link_edges if edge in edges and edge.other_vert(current) != previous]
        following = neighbors[0]
        if following == first:
            break
        order.append(following)
        previous, current = current, following
        if len(order) > len(vertices):
            raise RuntimeError('꼬리 경계 순회가 종료되지 않습니다.')
    if len(order) != len(vertices):
        raise RuntimeError('꼬리 뿌리에 여러 경계가 있습니다.')
    return order


def cap_material(body):
    material = bpy.data.materials.new('Tail root matched shirt and briefs')
    material.use_nodes = True
    material.diffuse_color = (1, 1, 1, 1)
    shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Roughness'].default_value = 0.88
    shader.inputs['Metallic'].default_value = 0
    colors = material.node_tree.nodes.new('ShaderNodeVertexColor')
    colors.layer_name = CAP_COLOR
    material.node_tree.links.new(colors.outputs['Color'], shader.inputs['Base Color'])
    body.data.materials.append(material)
    return len(body.data.materials) - 1


def remove_tail(body):
    """몸체의 국소 꼬리 표면만 제거하고 연결된 뿌리 구멍을 메운다."""
    if body.get('tailRemoved'):
        result = json.loads(body.get('tailRemovalDiagnostics', '{}'))
        return {**result, 'alreadyApplied': True}
    if body.type != 'MESH':
        raise TypeError('remove_tail에는 몸체 Mesh가 필요합니다.')
    origin, scale = coordinate_frame(body)
    matrix = body.matrix_world.copy()
    inverse = matrix.inverted()
    def canonical(vertex):
        return (matrix @ vertex.co - origin) / scale
    def in_local_patch(point):
        return abs(point.x) < 0.16 and point.y > 0.17 and 0.58 < point.z < 0.93
    source_bounds = world_bounds(body)
    mesh = body.data
    source_vertices = len(mesh.vertices)
    source_faces = len(mesh.polygons)
    image = next(node.image for material in mesh.materials if material and material.use_nodes for node in material.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image)
    width, height = image.size
    pixels = array.array('f', [0]) * len(image.pixels)
    image.pixels.foreach_get(pixels)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    uv = bm.loops.layers.uv.active
    if uv is None:
        raise RuntimeError('꼬리 주변의 원본 색을 읽을 UV가 없습니다.')
    # 뿌리의 UV 이음새만 용접한다. 머리·목과 다른 몸체 부분은 용접하지 않는다.
    local_scale = max(matrix.to_scale())
    bmesh.ops.remove_doubles(bm, verts=[vertex for vertex in bm.verts if in_local_patch(canonical(vertex))], dist=scale * 0.000001 / local_scale)
    welded_vertices = source_vertices - len(bm.verts)
    previous_boundaries = {edge for edge in bm.edges if edge.is_boundary}
    selected = []
    confirmed_warm_faces = 0
    def face_rgb(face):
        tex = sum((loop[uv].uv for loop in face.loops), Vector((0, 0))) / len(face.loops)
        offset = ((int(tex.y * height) % height) * width + int(tex.x * width) % width) * 4
        return tuple(pixels[offset:offset + 3])
    for face in bm.faces:
        point = sum((canonical(vertex) for vertex in face.verts), Vector()) / len(face.verts)
        if abs(point.x) < 0.12 and point.y > 0.20 and 0.62 < point.z < 0.87:
            selected.append(face)
            color = face_rgb(face)
            confirmed_warm_faces += int(color[0] > color[1] * 1.1 and color[1] > color[2] * 1.05)
    if confirmed_warm_faces < 100 or len(selected) < 500:
        bm.free()
        raise RuntimeError('예상한 꼬리의 UV/기하 범위와 맞지 않아 제거를 중단했습니다.')
    bmesh.ops.delete(bm, geom=selected, context='FACES_ONLY')
    boundary = [edge for edge in bm.edges if edge.is_boundary and edge not in previous_boundaries]
    ring = ordered_loop(boundary)
    points = [matrix @ vertex.co for vertex in ring]
    # XZ 평면에서 시계 방향이면 새 표면의 바깥 법선은 뒤쪽 +Y가 된다.
    area = sum(points[i].x * points[(i + 1) % len(points)].z - points[(i + 1) % len(points)].x * points[i].z for i in range(len(points)))
    if area > 0:
        ring.reverse()
        points.reverse()
    ring_colors = []
    for vertex in ring:
        adjacent = list(vertex.link_faces)
        colors = [face_rgb(face) for face in adjacent]
        # 잘린 색 경계의 주황 잔상 대신 실제로 남은 받침옷·드로즈 색을 쓴다.
        neutral = [color for color in colors if not (color[0] > color[1] * 1.25 and color[1] > color[2] * 1.1)]
        chosen = neutral or colors
        ring_colors.append(tuple(sum(color[i] for color in chosen) / len(chosen) for i in range(3)))
    deform = bm.verts.layers.deform.active
    ring_weights = [dict(vertex[deform]) if deform else {} for vertex in ring]
    center = sum(points, Vector()) / len(points)
    colors_layer = bm.loops.layers.float_color.get(CAP_COLOR) or bm.loops.layers.float_color.new(CAP_COLOR)
    for face in bm.faces:
        for loop in face.loops:
            loop[colors_layer] = (1, 1, 1, 1)
    material_index = cap_material(body)
    outside_before = sorted(tuple(round(value, 8) for value in vertex.co) for vertex in bm.verts if not in_local_patch(canonical(vertex)))
    boundary_samples = {tuple(round(value, 8) for value in vertex.co): (color, weights) for vertex, color, weights in zip(ring, ring_colors, ring_weights)}
    # 뿌리 윤곽은 별 모양 다각형일 수 있어 중심으로 부채꼴 연결하면 접힌다.
    # 경계 자체를 제약으로 삼아 채우고 내부 대각선만 세분한다.
    fill = bmesh.ops.triangle_fill(bm, edges=boundary, use_beauty=True, use_dissolve=False)
    initial_cap = [item for item in fill["geom"] if isinstance(item, bmesh.types.BMFace)]
    for face in initial_cap:
        face.material_index = material_index
    internal = {edge for face in initial_cap for edge in face.edges if edge not in boundary}
    if internal:
        bmesh.ops.subdivide_edges(bm, edges=list(internal), cuts=2, use_grid_fill=False)
    subdivided = [face for face in bm.faces if face.material_index == material_index]
    bmesh.ops.triangulate(bm, faces=subdivided, quad_method='BEAUTY', ngon_method='BEAUTY')
    new_faces = [face for face in bm.faces if face.material_index == material_index]
    bm.verts.index_update()
    cap_vertices_current = list({vertex for face in new_faces for vertex in face.verts})
    new_vertices = [vertex for vertex in cap_vertices_current if tuple(round(value, 8) for value in vertex.co) not in boundary_samples]
    fixed_vertices = [vertex for vertex in cap_vertices_current if tuple(round(value, 8) for value in vertex.co) in boundary_samples]
    if len(new_vertices) > 2000:
        raise RuntimeError('cap 내부 정점 판별이 꼬리 뿌리 범위를 넘었습니다.')
    def basis(point):
        x = (point.x - center.x) / scale
        z = (point.z - center.z) / scale
        return [1, x, z, x * x, x * z, z * z]
    coefficients = np.linalg.lstsq(np.asarray([basis(point) for point in points]), np.asarray([point.y for point in points]), rcond=None)[0]
    for vertex in new_vertices:
        point = matrix @ vertex.co
        nearest_y = 0
        nearest_distance = float('inf')
        for i, first in enumerate(points):
            following = points[(i + 1) % len(points)]
            dx, dz = following.x - first.x, following.z - first.z
            fraction = max(0, min(1, ((point.x - first.x) * dx + (point.z - first.z) * dz) / max(dx * dx + dz * dz, 1e-18)))
            distance = math.hypot(point.x - first.x - dx * fraction, point.z - first.z - dz * fraction)
            if distance < nearest_distance:
                nearest_distance = distance
                nearest_y = first.y * (1 - fraction) + following.y * fraction
        blend = min(1, nearest_distance / (0.012 * scale))
        blend = blend * blend * (3 - 2 * blend)
        point.y = nearest_y * (1 - blend) + float(np.dot(basis(point), coefficients)) * blend
        vertex.co = inverse @ point
    sampled_colors = {vertex: tuple(srgb_linear(value) for value in boundary_samples[tuple(round(value, 8) for value in vertex.co)][0]) + (1,) for vertex in fixed_vertices}
    mean_color = tuple(sum(color[i] for color in sampled_colors.values()) / len(ring) for i in range(4))
    sampled_colors.update({vertex: mean_color for vertex in new_vertices})
    for _ in range(320):
        updated = {}
        for vertex in new_vertices:
            neighbors = [edge.other_vert(vertex) for edge in vertex.link_edges]
            updated[vertex] = tuple(sum(sampled_colors[neighbor][i] for neighbor in neighbors) / len(neighbors) for i in range(4))
        sampled_colors.update(updated)
    for vertex in new_vertices:
        point = matrix @ vertex.co
        nearest = sorted(range(len(ring)), key=lambda i: (points[i].x - point.x) ** 2 + (points[i].z - point.z) ** 2)[:6]
        factors = [1.0 / max(0.00001 * scale * scale, (points[i].x - point.x) ** 2 + (points[i].z - point.z) ** 2) for i in nearest]
        total = sum(factors)
        if deform:
            weights = {}
            for i, factor in zip(nearest, factors):
                for group, weight in ring_weights[i].items():
                    weights[group] = weights.get(group, 0) + weight * factor / total
            chosen = sorted(weights.items(), key=lambda item: item[1], reverse=True)[:4]
            weight_sum = sum(weight for _, weight in chosen)
            if weight_sum:
                for group, weight in chosen:
                    vertex[deform][group] = weight / weight_sum
    for face in new_faces:
        face.material_index = material_index
        face.smooth = True
        for loop in face.loops:
            loop[colors_layer] = sampled_colors[loop.vert]
    weight_audit = {'skinned': bool(deform), 'localVerticesNormalized': 0}
    if deform:
        for vertex in bm.verts:
            if not (in_local_patch(canonical(vertex)) or vertex in new_vertices):
                continue
            values = sorted(((key, value) for key, value in vertex[deform].items() if value > 0.00000001), key=lambda item: item[1], reverse=True)[:4]
            total = sum(value for _, value in values)
            for key in list(vertex[deform].keys()):
                del vertex[deform][key]
            if total:
                for key, value in values:
                    vertex[deform][key] = value / total
            weight_audit['localVerticesNormalized'] += 1
        local = [vertex for vertex in bm.verts if vertex.link_faces and (in_local_patch(canonical(vertex)) or vertex in new_vertices)]
        weight_audit.update({'localMaxInfluences': max(len(vertex[deform]) for vertex in local), 'localWeightSumMin': min(sum(vertex[deform].values()) for vertex in local), 'localWeightSumMax': max(sum(vertex[deform].values()) for vertex in local), 'wholeBodyMaxInfluences': max(len(vertex[deform]) for vertex in bm.verts if vertex.link_faces)})
    bmesh.ops.recalc_face_normals(bm, faces=new_faces)
    bm.normal_update()
    cap_normals_backwards = sum((matrix.to_3x3() @ face.normal).y < -0.001 for face in new_faces)
    outside_after = sorted(tuple(round(value, 8) for value in vertex.co) for vertex in bm.verts if vertex.link_faces and not in_local_patch(canonical(vertex)))
    if outside_after != outside_before:
        raise RuntimeError('꼬리 국소 범위 밖의 원본 정점이 바뀌었습니다.')
    cap_faces = len(new_faces)
    cap_vertices = len(new_vertices)
    loose = [vertex for vertex in bm.verts if not vertex.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context='VERTS')
    root_open_edges = sum(edge.is_boundary and edge not in previous_boundaries for edge in bm.edges)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    cap_loops = {index for face in mesh.polygons if face.material_index == material_index for index in face.loop_indices}
    normals = [tuple(normal.vector) for normal in mesh.corner_normals]
    cap_normals = {}
    normal_to_local = matrix.to_3x3().transposed()
    for index in cap_loops:
        point = matrix @ mesh.vertices[mesh.loops[index].vertex_index].co
        x, z = (point.x - center.x) / scale, (point.z - center.z) / scale
        slope_x = (coefficients[1] + 2 * coefficients[3] * x + coefficients[4] * z) / scale
        slope_z = (coefficients[2] + coefficients[4] * x + 2 * coefficients[5] * z) / scale
        cap_normals[index] = (normal_to_local @ Vector((-float(slope_x), 1, -float(slope_z)))).normalized()
    mesh.normals_split_custom_set([cap_normals.get(index, normal) for index, normal in enumerate(normals)])
    if CAP_COLOR in mesh.color_attributes:
        mesh.color_attributes.active_color_index = list(mesh.color_attributes).index(mesh.color_attributes[CAP_COLOR])
    result = {
        'status': 'tail-removed-root-closed',
        'coordinateOriginWorld': list(origin),
        'canonicalScale': scale,
        'sourceVertices': source_vertices,
        'sourceFaces': source_faces,
        'localSeamVerticesWelded': welded_vertices,
        'tailFacesRemoved': len(selected),
        'tailWarmColorFacesConfirmed': confirmed_warm_faces,
        'rootBoundaryEdgesBeforeCap': len(boundary),
        'rootOpenEdgesAfterCap': root_open_edges,
        'capVerticesAdded': cap_vertices,
        'capFacesAdded': cap_faces,
        'capBackwardsNormalFaces': cap_normals_backwards,
        'capNormals': 'analytic derivative of fitted quadratic surface, cap corners only',
        'outsidePatchCoordinatesUnchanged': True,
        'weightAudit': weight_audit,
        'resultVertices': len(mesh.vertices),
        'resultFaces': len(mesh.polygons),
        'sourceWorldBounds': source_bounds,
        'resultWorldBounds': world_bounds(body),
        'removedCanonicalBox': {'absXMax': 0.12, 'yMin': 0.20, 'zMin': 0.62, 'zMax': 0.87},
        'capSurface': 'constrained triangles with quadratic fitted height, 12mm boundary blend and harmonic colors; boundary geometry retained',
        'capWeights': 'six nearest boundary samples, top four normalized; original rig and motion unchanged',
        'untouched': 'raw files, head/neck positions and UVs, rest bones and original animation actions',
    }
    body['tailRemoved'] = True
    body['tailRemovalDiagnostics'] = json.dumps(result)
    return result


def import_body(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    added = list(set(bpy.data.objects) - before)
    body = max((obj for obj in added if obj.type == 'MESH'), key=lambda obj: len(obj.data.vertices))
    rig = next((obj for obj in added if obj.type == 'ARMATURE'), None)
    for obj in added:
        if obj.type == 'MESH' and obj != body:
            obj.hide_render = True
            obj.hide_set(True)
    return body, rig


def set_action(rig, action):
    if not rig:
        return
    rig.animation_data_clear()
    for pose in rig.pose.bones:
        pose.matrix_basis = Matrix.Identity(4)
    if action:
        rig.animation_data_create()
        rig.animation_data.action = action
        rig.animation_data.action_slot = action.slots[0]
    rig.data.pose_position = 'POSE'
    bpy.context.view_layer.update()


def render_review(body, mode, frame):
    scene = bpy.context.scene
    origin, _ = coordinate_frame(body)
    # 꼬리를 지운 뒤 Y bbox의 중심은 달라지므로 카메라만 몸체 중심에 맞춘다.
    floor = world_bounds(body)[2][0]
    target = Vector((origin.x, 0, floor + 0.82))
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = scene.render.resolution_y = 850
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'Standard'
    scene.world = bpy.data.worlds.new('TaillessReviewWorld')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value = (0.14, 0.17, 0.21, 1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value = 0.5
    for name, position, energy in [('Key', (2, -3, 4), 220), ('Fill', (-3, -2, 2), 150), ('Rim', (1, 3, 3), 180)]:
        data = bpy.data.lights.new(name, 'AREA')
        data.energy = energy
        data.size = 4
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = (position[0], position[1], position[2] + floor)
        obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()
    data = bpy.data.cameras.new('TaillessReviewCamera')
    camera = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(camera)
    data.type = 'ORTHO'
    data.ortho_scale = 2.08
    scene.camera = camera
    for view, position in [('rear', (0, 4, floor + 0.9)), ('side', (4, 0, floor + 0.9)), ('root-detail', (0, 3, floor + 0.75))]:
        camera.location = position
        aim = Vector((origin.x, 0.20, floor + 0.75)) if view == 'root-detail' else target
        camera.rotation_euler = (aim - camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.ortho_scale = 0.50 if view == 'root-detail' else 2.08
        scene.render.filepath = str(OUTPUT / f'{mode}-{frame:02d}-{view}.png')
        bpy.ops.render.render(write_still=True)


def main():
    global OUTPUT
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', choices=['original', 'rigged', 'walk', 'run'])
    parser.add_argument('--output-dir', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    if args.output_dir:
        OUTPUT = args.output_dir.resolve()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    diagnostics_path = OUTPUT / 'diagnostics.json'
    report = json.loads(diagnostics_path.read_text()) if diagnostics_path.exists() else {'status': 'in-progress', 'paidCredits': 0, 'models': {}}
    for mode in ([args.only] if args.only else SOURCE_PATHS):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.preferences.filepaths.save_version = 0
        scene = bpy.context.scene
        scene.render.fps = 30
        source = SOURCE_PATHS[mode]
        before_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        body, rig = import_body(source)
        body.name = 'AtahoBodyTailless'
        action = rig.animation_data.action if rig and rig.animation_data else None
        set_action(rig, None)
        diagnostic = remove_tail(body)
        if mode in ['walk', 'run']:
            action.name = f'Ataho{mode.title()}'
            action.use_frame_range = True
            action.frame_start, action.frame_end = 1, 32 if mode == 'walk' else 20
            set_action(rig, action)
        scene.frame_start = 1
        scene.frame_end = 32 if mode == 'walk' else 20 if mode == 'run' else 1
        scene.frame_set(1)
        bpy.ops.object.select_all(action='DESELECT')
        body.select_set(True)
        if rig:
            rig.select_set(True)
        bpy.context.view_layer.objects.active = body
        stem = f'ataho-body-{mode}-tailless'
        animated = mode in ['walk', 'run']
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f'{stem}.glb'), use_selection=True, export_animations=animated, export_animation_mode='ACTIVE_ACTIONS', export_frame_range=True, export_force_sampling=True, export_optimize_animation_size=False, export_def_bones=True, export_skins=True, export_all_influences=False)
        bpy.ops.export_scene.fbx(filepath=str(OUTPUT / f'{stem}.fbx'), use_selection=True, object_types={'ARMATURE', 'MESH'}, bake_anim=animated, bake_anim_use_all_actions=False, bake_anim_use_nla_strips=False, add_leaf_bones=False, path_mode='COPY', embed_textures=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / f'{stem}.blend'))
        frame = 16 if mode == 'walk' else 7 if mode == 'run' else 1
        scene.frame_set(frame)
        render_review(body, mode, frame)
        diagnostic.update({'sourcePath': str(source.relative_to(ROOT)), 'sourceSha256': before_hash, 'sourceUnchanged': hashlib.sha256(source.read_bytes()).hexdigest() == before_hash, 'boneCount': len(rig.data.bones) if rig else 0, 'motionFrames': 32 if mode == 'walk' else 20 if mode == 'run' else 0, 'outputStem': stem})
        report['models'][mode] = diagnostic
        report['status'] = 'complete' if set(report['models']) == set(SOURCE_PATHS) else 'in-progress'
        diagnostics_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print('TAILLESS', mode, json.dumps(diagnostic), flush=True)


if __name__ == '__main__':
    main()
